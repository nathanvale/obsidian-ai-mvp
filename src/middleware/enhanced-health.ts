import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Socket } from 'net';
import fp from 'fastify-plugin';
import { logWithContext, getCurrentCorrelationId } from '../services/logger.js';
import { config } from '../config/environment.js';
import type { HealthResult, HealthCheckResult } from '../types/fastify.js';

export interface HealthCheckOptions {
  enableDetailedHealthCheck?: boolean;
  checkExternalServices?: boolean;
  gracefulShutdownTimeout?: number;
  healthCheckInterval?: number;
  healthCacheTtl?: number;
  serviceTimeouts?: {
    ollama?: number;
    chromadb?: number;
    filesystem?: number;
  };
}

const defaultOptions: HealthCheckOptions = {
  enableDetailedHealthCheck: true,
  checkExternalServices: true,
  gracefulShutdownTimeout: 10000, // 10 seconds
  healthCheckInterval: 30000, // 30 seconds
  healthCacheTtl: 30000, // 30 seconds cache TTL
  serviceTimeouts: {
    ollama: 10000, // 10 seconds for Ollama (LLM can be slow)
    chromadb: 5000, // 5 seconds for ChromaDB
    filesystem: 2000, // 2 seconds for filesystem checks
  },
};

/**
 * Health state manager with atomic operations and race condition protection
 */
class HealthStateManager {
  private healthCache: HealthResult | null = null;
  private lastCacheTime = 0;
  private activeHealthCheck: Promise<HealthResult> | null = null;
  private readonly mutex = { locked: false, queue: Array<() => void>() };

  constructor(private readonly cacheTtl: number) {}

  /**
   * Acquire mutex lock for atomic health state operations
   */
  private async acquireLock(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (!this.mutex.locked) {
        this.mutex.locked = true;
        resolve();
      } else {
        this.mutex.queue.push(resolve);
      }
    });
  }

  /**
   * Release mutex lock and process queue
   */
  private releaseLock(): void {
    this.mutex.locked = false;
    const next = this.mutex.queue.shift();
    if (next) {
      this.mutex.locked = true;
      next();
    }
  }

  /**
   * Get cached health result if still valid
   */
  getCachedHealth(): HealthResult | null {
    const now = Date.now();
    if (this.healthCache && (now - this.lastCacheTime) < this.cacheTtl) {
      return { ...this.healthCache }; // Return copy to prevent mutation
    }
    return null;
  }

  /**
   * Atomically update health cache
   */
  async updateHealthCache(healthResult: HealthResult): Promise<void> {
    await this.acquireLock();
    try {
      this.healthCache = { ...healthResult }; // Store copy
      this.lastCacheTime = Date.now();
    } finally {
      this.releaseLock();
    }
  }

  /**
   * Get active health check promise or null
   */
  getActiveHealthCheck(): Promise<HealthResult> | null {
    return this.activeHealthCheck;
  }

  /**
   * Set active health check promise
   */
  setActiveHealthCheck(promise: Promise<HealthResult> | null): void {
    this.activeHealthCheck = promise;
  }

  /**
   * Get current health status for quick checks
   */
  getCurrentStatus(): 'healthy' | 'unhealthy' | 'degraded' | 'error' | 'unknown' {
    const cached = this.getCachedHealth();
    return cached?.status ?? 'unknown';
  }
}

/**
 * Enhanced health monitoring and graceful shutdown plugin
 * Integrates with existing @orchestr8 resilience patterns
 * 
 * Key improvements:
 * - Race condition protection with mutex locks
 * - Service-specific timeouts 
 * - Request deduplication and caching
 * - Atomic health state management
 * - ADHD-optimized response times (under 5 seconds)
 */
async function enhancedHealthPlugin(
  fastify: FastifyInstance,
  options: HealthCheckOptions = {}
) {
  const healthConfig = { ...defaultOptions, ...options };
  
  // Initialize health state manager with race condition protection
  const healthStateManager = new HealthStateManager(healthConfig.healthCacheTtl!);

  /**
   * Create a timeout promise that rejects after specified milliseconds
   */
  const createTimeoutPromise = (ms: number, serviceName: string): Promise<never> => {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${serviceName} health check timed out after ${ms}ms`));
      }, ms);
    });
  };

  /**
   * Execute health check with timeout protection
   */
  const withTimeout = async <T>(
    promise: Promise<T>,
    timeoutMs: number,
    serviceName: string
  ): Promise<T> => {
    return Promise.race([
      promise,
      createTimeoutPromise(timeoutMs, serviceName)
    ]);
  };

  // External service health checkers with timeout protection
  const healthCheckers = {
    ollama: async (): Promise<HealthCheckResult> => {
      try {
        const startTime = Date.now();
        const response = await withTimeout(
          fetch(`${config.ollamaUrl}/api/tags`, {
            method: 'GET',
          }),
          healthConfig.serviceTimeouts!.ollama!,
          'Ollama'
        );

        const responseTime = `${Date.now() - startTime}ms`;

        if (response.ok) {
          return {
            status: 'healthy' as const,
            responseTime,
          };
        } else {
          return { 
            status: 'unhealthy' as const, 
            statusCode: response.status,
            responseTime,
          };
        }
      } catch (error) {
        return {
          status: 'unhealthy' as const,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },

    chromadb: async (): Promise<HealthCheckResult> => {
      try {
        const startTime = Date.now();
        const response = await withTimeout(
          fetch(`${config.chromaDbUrl}/api/v1/heartbeat`, {
            method: 'GET',
          }),
          healthConfig.serviceTimeouts!.chromadb!,
          'ChromaDB'
        );

        const responseTime = `${Date.now() - startTime}ms`;

        if (response.ok) {
          return {
            status: 'healthy' as const,
            responseTime,
          };
        } else {
          return { 
            status: 'unhealthy' as const, 
            statusCode: response.status,
            responseTime,
          };
        }
      } catch (error) {
        return {
          status: 'unhealthy' as const,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },

    filesystem: async (): Promise<HealthCheckResult> => {
      try {
        if (config.obsidianVaultPath) {
          // Check if Obsidian vault is accessible with timeout
          const fs = await import('fs/promises');
          await withTimeout(
            fs.access(config.obsidianVaultPath),
            healthConfig.serviceTimeouts!.filesystem!,
            'Filesystem'
          );
          return { 
            status: 'healthy' as const, 
            path: config.obsidianVaultPath 
          };
        }
        return { status: 'not_configured' as const };
      } catch (error) {
        return {
          status: 'unhealthy' as const,
          error: error instanceof Error ? error.message : 'Vault inaccessible',
        };
      }
    },
  };

  /**
   * Perform comprehensive health check with race condition protection
   * Uses request deduplication to prevent multiple concurrent checks
   */
  const performHealthCheck = async (): Promise<HealthResult> => {
    // Check if we have a cached result first
    const cachedHealth = healthStateManager.getCachedHealth();
    if (cachedHealth) {
      return cachedHealth;
    }

    // Check if there's already an active health check running
    const activeCheck = healthStateManager.getActiveHealthCheck();
    if (activeCheck) {
      try {
        return await activeCheck; // Wait for existing check to complete
      } catch (error) {
        // If active check failed, continue with new check
        logWithContext.warn('Active health check failed, starting new check', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Create new health check promise
    const healthCheckPromise = performActualHealthCheck();
    healthStateManager.setActiveHealthCheck(healthCheckPromise);

    try {
      const result = await healthCheckPromise;
      await healthStateManager.updateHealthCache(result);
      return result;
    } finally {
      // Clear active check when done
      healthStateManager.setActiveHealthCheck(null);
    }
  };

  /**
   * Perform the actual health check logic (extracted for clarity)
   */
  const performActualHealthCheck = async (): Promise<HealthResult> => {
    const startTime = Date.now();
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();

    const healthResult: HealthResult = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.round(uptime),
      version: process.env.npm_package_version || '0.1.0',
      environment: config.nodeEnv,
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
        rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
      },
      process: {
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
      },
      checks: {},
    };

    // Check external services if enabled (with concurrent execution for speed)
    if (healthConfig.checkExternalServices) {
      try {
        // Execute all health checks concurrently but with individual timeouts
        const serviceCheckPromises = Object.entries(healthCheckers).map(
          async ([serviceName, checker]) => {
            try {
              const result = await checker();
              return [serviceName, result] as [string, HealthCheckResult];
            } catch (error) {
              return [
                serviceName,
                {
                  status: 'error' as const,
                  error: error instanceof Error ? error.message : 'Check failed',
                },
              ] as [string, HealthCheckResult];
            }
          }
        );

        // Wait for all service checks with overall timeout (5 seconds for ADHD-optimized response)
        const serviceResults = await withTimeout(
          Promise.all(serviceCheckPromises),
          5000,
          'Overall health check'
        );

        // Build checks result
        for (const [serviceName, result] of serviceResults) {
          healthResult.checks[serviceName] = result;
        }

      } catch (error) {
        logWithContext.error('Service health checks timed out or failed', {}, error instanceof Error ? error : new Error('Unknown error'));
        // Mark all services as error if overall check fails
        for (const serviceName of Object.keys(healthCheckers)) {
          healthResult.checks[serviceName] = {
            status: 'error' as const,
            error: 'Health check timeout or failure',
          };
        }
      }

      // Determine overall status based on service checks
      const serviceStatuses = Object.entries(healthResult.checks);
      const unhealthyServices = serviceStatuses
        .filter(([, check]) => check.status === 'unhealthy')
        .map(([name]) => name);
      
      const errorServices = serviceStatuses
        .filter(([, check]) => check.status === 'error')
        .map(([name]) => name);

      // Status priority: error > unhealthy > degraded > healthy
      if (errorServices.length > 0) {
        healthResult.status = 'error';
        healthResult.unhealthyServices = [...unhealthyServices, ...errorServices];
      } else if (unhealthyServices.length > 0) {
        healthResult.status = 'degraded';
        healthResult.unhealthyServices = unhealthyServices;
      }

      // Critical services for ADHD functionality
      const criticalServices = ['ollama', 'chromadb'];
      const criticalDown = unhealthyServices.filter(service =>
        criticalServices.includes(service)
      );
      const criticalErrors = errorServices.filter(service =>
        criticalServices.includes(service)
      );
      
      if (criticalDown.length > 0 || criticalErrors.length > 0) {
        healthResult.status = 'unhealthy';
        healthResult.criticalServicesDown = [...criticalDown, ...criticalErrors];
        
        logWithContext.warn('Critical ADHD services are down', {
          criticalDown: healthResult.criticalServicesDown,
          impact: 'ADHD cognitive support features may be unavailable',
        });
      }
    }

    const duration = Date.now() - startTime;
    healthResult.checkDuration = `${duration}ms`;

    return healthResult;
  };

  /**
   * Get HTTP status code based on health status
   */
  const getStatusCode = (status: HealthResult['status']): number => {
    switch (status) {
      case 'healthy':
        return 200;
      case 'degraded':
        return 200; // Still operational
      case 'unhealthy':
      case 'error':
        return 503;
      case 'unknown':
      default:
        return 503;
    }
  };

  /**
   * Provide ADHD-specific guidance based on system health
   */
  const getADHDSystemGuidance = (health: HealthResult) => {
    const guidance = {
      cognitiveSupport: 'unknown' as 'available' | 'degraded' | 'unavailable' | 'unknown',
      medicationCycleAwareness: 'unknown' as 'available' | 'unavailable' | 'unknown',
      voiceProcessing: 'unknown' as 'available' | 'unavailable' | 'unknown',
      recommendation: '',
    };

    if (health.status === 'healthy') {
      guidance.cognitiveSupport = 'available';
      guidance.medicationCycleAwareness = 'available';
      guidance.voiceProcessing = 'available';
      guidance.recommendation = 'All ADHD support features operational';
    } else if (health.status === 'degraded') {
      guidance.cognitiveSupport = 'degraded';
      guidance.medicationCycleAwareness = health.checks.filesystem?.status === 'healthy' ? 'available' : 'unavailable';
      guidance.voiceProcessing = health.checks.ollama?.status === 'healthy' ? 'available' : 'unavailable';
      guidance.recommendation = 'Some ADHD features may be slower than usual';
    } else {
      guidance.cognitiveSupport = 'unavailable';
      guidance.medicationCycleAwareness = 'unavailable'; 
      guidance.voiceProcessing = 'unavailable';
      guidance.recommendation = 'ADHD support features temporarily unavailable - consider manual organization methods';
    }

    return guidance;
  };

  // Periodic health check with improved error handling
  if (healthConfig.healthCheckInterval) {
    const healthCheckInterval = setInterval(async () => {
      try {
        // Perform health check (will use caching and deduplication)
        const currentHealth = await performHealthCheck();

        // Log health status changes for ADHD system monitoring
        if (currentHealth.status !== 'healthy') {
          logWithContext.warn('ADHD system health check detected issues', {
            status: currentHealth.status,
            unhealthyServices: currentHealth.unhealthyServices,
            criticalServicesDown: currentHealth.criticalServicesDown,
            medicationCycleImpact: currentHealth.criticalServicesDown 
              ? 'Adaptive interface features may be unavailable during medication transitions'
              : 'Some cognitive support features may be degraded',
          });
        }
      } catch (error) {
        logWithContext.error(
          'ADHD system health check failed',
          {
            impact: 'Health monitoring temporarily unavailable',
            recommendation: 'Manual service verification recommended',
          },
          error instanceof Error ? error : new Error('Unknown error')
        );
        
        // Create error health result and cache it
        const errorHealth: HealthResult = {
          status: 'error' as const,
          timestamp: new Date().toISOString(),
          uptime: Math.round(process.uptime()),
          version: process.env.npm_package_version || '0.1.0',
          environment: config.nodeEnv,
          memory: {
            heapUsed: '0MB',
            heapTotal: '0MB', 
            rss: '0MB',
          },
          process: {
            pid: process.pid,
            nodeVersion: process.version,
            platform: process.platform,
          },
          error: error instanceof Error ? error.message : 'Health check failed',
          checks: {},
        };
        
        await healthStateManager.updateHealthCache(errorHealth);
      }
    }, healthConfig.healthCheckInterval);

    // Clear interval on server close
    fastify.addHook('onClose', async () => {
      clearInterval(healthCheckInterval);
    });
  }

  // Enhanced health endpoint with race condition protection
  fastify.get(
    '/health/detailed',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const correlationId = getCurrentCorrelationId();

      try {
        const healthResult = healthConfig.enableDetailedHealthCheck
          ? await performHealthCheck() // Will use caching and deduplication
          : healthStateManager.getCachedHealth() ?? {
              status: 'unknown' as const,
              timestamp: new Date().toISOString(),
              uptime: Math.round(process.uptime()),
              version: process.env.npm_package_version || '0.1.0',
              environment: config.nodeEnv,
              memory: {
                heapUsed: '0MB',
                heapTotal: '0MB',
                rss: '0MB',
              },
              process: {
                pid: process.pid,
                nodeVersion: process.version,
                platform: process.platform,
              },
              checks: {},
            };

        // Set appropriate status code based on ADHD system requirements
        const statusCode = getStatusCode(healthResult.status);
        reply.status(statusCode);

        return {
          ...healthResult,
          correlationId,
          adhdSystemStatus: getADHDSystemGuidance(healthResult),
        };
      } catch (error) {
        reply.status(503);
        return {
          status: 'error',
          error: error instanceof Error ? error.message : 'Health check failed',
          correlationId,
          timestamp: new Date().toISOString(),
          adhdSystemStatus: {
            cognitiveSupport: 'unavailable',
            recommendation: 'Manual service verification needed',
          },
        };
      }
    }
  );

  // Quick health endpoint optimized for ADHD low-latency needs
  fastify.get(
    '/health/quick',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const correlationId = getCurrentCorrelationId();
      const uptime = Math.round(process.uptime());
      const memUsage = process.memoryUsage();

      // Quick health check - basic metrics only
      const quickHealth = {
        status: healthStateManager.getCurrentStatus(),
        timestamp: new Date().toISOString(),
        uptime,
        memory: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
        correlationId,
        adhdQuickStatus: 'unknown' as 'operational' | 'degraded' | 'unavailable' | 'unknown',
      };

      // Determine ADHD quick status based on cached health
      const cachedHealth = healthStateManager.getCachedHealth();
      if (cachedHealth) {
        switch (cachedHealth.status) {
          case 'healthy':
            quickHealth.adhdQuickStatus = 'operational';
            break;
          case 'degraded':
            quickHealth.adhdQuickStatus = 'degraded';
            break;
          case 'unhealthy':
          case 'error':
            quickHealth.adhdQuickStatus = 'unavailable';
            break;
          default:
            quickHealth.adhdQuickStatus = 'unknown';
        }
      }

      reply.status(getStatusCode(quickHealth.status));
      return quickHealth;
    }
  );

  // Readiness endpoint for container orchestration
  fastify.get(
    '/health/ready',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const correlationId = getCurrentCorrelationId();
      const currentStatus = healthStateManager.getCurrentStatus();

      // Server is ready if listening and not completely unhealthy
      const isReady = fastify.server.listening && currentStatus !== 'unhealthy';

      reply.status(isReady ? 200 : 503);
      return {
        ready: isReady,
        status: currentStatus,
        timestamp: new Date().toISOString(),
        correlationId,
        adhdSystemReady: isReady && ['healthy', 'degraded'].includes(currentStatus),
      };
    }
  );

  // Liveness endpoint for container orchestration  
  fastify.get('/health/live', async () => {
    const correlationId = getCurrentCorrelationId();

    // Server is live if it can respond
    return {
      alive: true,
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      correlationId,
      adhdSystemLive: true, // If we can respond, ADHD system process is alive
    };
  });

  // Graceful shutdown handling
  let isShuttingDown = false;
  const connections = new Set();

  // Track active connections
  fastify.server.on('connection', socket => {
    connections.add(socket);
    socket.on('close', () => connections.delete(socket));
  });

  // Graceful shutdown function
  const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) {
      return;
    }
    isShuttingDown = true;

    logWithContext.info(`Received ${signal}, starting graceful shutdown`, {
      activeConnections: connections.size,
      uptime: process.uptime(),
    });

    // Stop accepting new requests
    fastify.server.close(() => {
      logWithContext.info('Server closed to new connections', {});
    });

    // Wait for existing requests to complete
    const shutdownTimeout = setTimeout(() => {
      logWithContext.warn('Graceful shutdown timeout reached, forcing exit', {
        remainingConnections: connections.size,
      });

      // Force close remaining connections
      for (const socket of connections) {
        (socket as Socket).destroy();
      }

      process.exit(1);
    }, healthConfig.gracefulShutdownTimeout);

    try {
      await fastify.close();
      clearTimeout(shutdownTimeout);
      logWithContext.info('Graceful shutdown completed successfully', {});
      process.exit(0);
    } catch (error) {
      clearTimeout(shutdownTimeout);
      logWithContext.error('Error during graceful shutdown', {});
      process.exit(1);
    }
  };

  // Register signal handlers
  process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => void gracefulShutdown('SIGINT'));

  // Handle uncaught exceptions gracefully
  process.on('uncaughtException', (error: Error) => {
    logWithContext.error('Uncaught exception, initiating shutdown', {}, error);
    void gracefulShutdown('UNCAUGHT_EXCEPTION');
  });

  process.on(
    'unhandledRejection',
    (reason: unknown, promise: Promise<unknown>) => {
      const error =
        reason instanceof Error ? reason : new Error(String(reason));
      logWithContext.error(
        'Unhandled promise rejection, initiating shutdown',
        {
          promise: promise.toString(),
        },
        error
      );
      void gracefulShutdown('UNHANDLED_REJECTION');
    }
  );

  // Initial health check with improved error handling
  setTimeout(() => {
    void performHealthCheck().then(result => {
      logWithContext.info('Initial ADHD system health check completed', {
        status: result.status,
        adhdFeaturesAvailable: result.status === 'healthy',
        criticalServicesOperational: !result.criticalServicesDown?.length,
        cognitiveSupport: result.status === 'healthy' ? 'ready' : 'limited',
      });
    }).catch(error => {
      logWithContext.error('Initial ADHD system health check failed', {
        impact: 'System may start with degraded functionality',
        recommendation: 'Manual service verification recommended',
      }, error instanceof Error ? error : new Error('Unknown error'));
    });
  }, 1000);
}

export default fp(enhancedHealthPlugin, {
  name: 'enhanced-health',
  fastify: '4.x',
});
