import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { logWithContext, getCurrentCorrelationId } from '../services/logger.js';
import { config } from '../config/environment.js';

export interface HealthCheckOptions {
  enableDetailedHealthCheck?: boolean;
  checkExternalServices?: boolean;
  gracefulShutdownTimeout?: number;
  healthCheckInterval?: number;
}

const defaultOptions: HealthCheckOptions = {
  enableDetailedHealthCheck: true,
  checkExternalServices: true,
  gracefulShutdownTimeout: 10000, // 10 seconds
  healthCheckInterval: 30000 // 30 seconds
};

/**
 * Enhanced health monitoring and graceful shutdown plugin
 * Integrates with existing @orchestr8 resilience patterns
 */
async function enhancedHealthPlugin(
  fastify: FastifyInstance, 
  options: HealthCheckOptions = {}
) {
  const healthConfig = { ...defaultOptions, ...options };
  
  // Store health check results
  let lastHealthCheck: any = {
    status: 'unknown',
    timestamp: new Date().toISOString(),
    checks: {}
  };

  // External service health checkers
  const healthCheckers = {
    ollama: async () => {
      try {
        const response = await fetch(`${config.ollamaUrl}/api/tags`, {
          method: 'GET'
        });
        
        if (response.ok) {
          return { status: 'healthy', responseTime: response.headers.get('x-response-time') };
        } else {
          return { status: 'unhealthy', statusCode: response.status };
        }
      } catch (error) {
        return { 
          status: 'unhealthy', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    },

    chromadb: async () => {
      try {
        const response = await fetch(`${config.chromaDbUrl}/api/v1/heartbeat`, {
          method: 'GET'
        });
        
        if (response.ok) {
          return { status: 'healthy', responseTime: response.headers.get('x-response-time') };
        } else {
          return { status: 'unhealthy', statusCode: response.status };
        }
      } catch (error) {
        return { 
          status: 'unhealthy', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    },

    filesystem: async () => {
      try {
        if (config.obsidianVaultPath) {
          // Check if Obsidian vault is accessible
          const fs = await import('fs/promises');
          await fs.access(config.obsidianVaultPath);
          return { status: 'healthy', path: config.obsidianVaultPath };
        }
        return { status: 'not_configured' };
      } catch (error) {
        return { 
          status: 'unhealthy', 
          error: error instanceof Error ? error.message : 'Vault inaccessible' 
        };
      }
    }
  };

  // Perform comprehensive health check
  const performHealthCheck = async (): Promise<any> => {
    const startTime = Date.now();
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();

    const healthResult: any = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.round(uptime),
      version: process.env.npm_package_version || '0.1.0',
      environment: config.nodeEnv,
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
        rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB'
      },
      process: {
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform
      },
      checks: {}
    };

    // Check external services if enabled
    if (healthConfig.checkExternalServices) {
      for (const [serviceName, checker] of Object.entries(healthCheckers)) {
        try {
          healthResult.checks[serviceName] = await checker();
        } catch (error) {
          healthResult.checks[serviceName] = {
            status: 'error',
            error: error instanceof Error ? error.message : 'Check failed'
          };
        }
      }

      // Determine overall status based on service checks
      const unhealthyServices = Object.entries(healthResult.checks)
        .filter(([, check]: [string, any]) => check.status === 'unhealthy')
        .map(([name]) => name);

      if (unhealthyServices.length > 0) {
        healthResult.status = 'degraded';
        healthResult.unhealthyServices = unhealthyServices;
      }

      // If critical services are down, mark as unhealthy
      const criticalServices = ['ollama', 'chromadb'];
      const criticalDown = unhealthyServices.filter(service => criticalServices.includes(service));
      if (criticalDown.length > 0) {
        healthResult.status = 'unhealthy';
        healthResult.criticalServicesDown = criticalDown;
      }
    }

    const duration = Date.now() - startTime;
    healthResult.checkDuration = `${duration}ms`;
    
    return healthResult;
  };

  // Periodic health check
  if (healthConfig.healthCheckInterval) {
    const healthCheckInterval = setInterval(async () => {
      try {
        lastHealthCheck = await performHealthCheck();
        
        // Log health status changes
        if (lastHealthCheck.status !== 'healthy') {
          logWithContext.warn('Health check detected issues', {
            status: lastHealthCheck.status,
            unhealthyServices: lastHealthCheck.unhealthyServices,
            criticalServicesDown: lastHealthCheck.criticalServicesDown
          });
        }
      } catch (error) {
        logWithContext.error('Health check failed', {}, error instanceof Error ? error : new Error('Unknown error'));
        lastHealthCheck = {
          status: 'error',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Health check failed',
          checks: {}
        };
      }
    }, healthConfig.healthCheckInterval);

    // Clear interval on server close
    fastify.addHook('onClose', async () => {
      clearInterval(healthCheckInterval);
    });
  }

  // Enhanced health endpoint
  fastify.get('/health/detailed', async (request: FastifyRequest, reply: FastifyReply) => {
    const correlationId = getCurrentCorrelationId();
    
    try {
      const healthResult = healthConfig.enableDetailedHealthCheck 
        ? await performHealthCheck()
        : lastHealthCheck;

      // Set appropriate status code
      const statusCode = healthResult.status === 'healthy' ? 200 
                      : healthResult.status === 'degraded' ? 200 
                      : 503;

      reply.status(statusCode);
      
      return {
        ...healthResult,
        correlationId,
      };
    } catch (error) {
      reply.status(503);
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Health check failed',
        correlationId,
        timestamp: new Date().toISOString()
      };
    }
  });

  // Quick health endpoint (additional endpoint, existing /health remains)
  fastify.get('/health/quick', async (request: FastifyRequest, reply: FastifyReply) => {
    const correlationId = getCurrentCorrelationId();
    const uptime = Math.round(process.uptime());
    const memUsage = process.memoryUsage();

    // Quick health check - just basic metrics
    const quickHealth = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime,
      memory: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
      correlationId
    };

    // Use cached status if available
    if (lastHealthCheck.status !== 'healthy' && lastHealthCheck.status !== 'unknown') {
      quickHealth.status = lastHealthCheck.status;
      reply.status(lastHealthCheck.status === 'degraded' ? 200 : 503);
    }

    return quickHealth;
  });

  // Readiness endpoint for Kubernetes/container orchestration
  fastify.get('/health/ready', async (request: FastifyRequest, reply: FastifyReply) => {
    const correlationId = getCurrentCorrelationId();
    
    // Check if server is ready to accept requests
    const isReady = fastify.server.listening && lastHealthCheck.status !== 'unhealthy';
    
    reply.status(isReady ? 200 : 503);
    return {
      ready: isReady,
      status: lastHealthCheck.status,
      timestamp: new Date().toISOString(),
      correlationId
    };
  });

  // Liveness endpoint for Kubernetes/container orchestration
  fastify.get('/health/live', async () => {
    const correlationId = getCurrentCorrelationId();
    
    // Server is live if it can respond
    return {
      alive: true,
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      correlationId
    };
  });

  // Graceful shutdown handling
  let isShuttingDown = false;
  const connections = new Set();

  // Track active connections
  fastify.server.on('connection', (socket) => {
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
      uptime: process.uptime()
    });

    // Stop accepting new requests
    fastify.server.close(() => {
      logWithContext.info('Server closed to new connections', {});
    });

    // Wait for existing requests to complete
    const shutdownTimeout = setTimeout(() => {
      logWithContext.warn('Graceful shutdown timeout reached, forcing exit', {
        remainingConnections: connections.size
      });
      
      // Force close remaining connections
      for (const socket of connections) {
        (socket as any).destroy();
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

  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    logWithContext.error('Unhandled promise rejection, initiating shutdown', { 
      promise: promise.toString() 
    }, error);
    void gracefulShutdown('UNHANDLED_REJECTION');
  });

  // Initial health check
  setTimeout(() => {
    void performHealthCheck().then((result) => {
      lastHealthCheck = result;
      logWithContext.info('Initial health check completed', {
        status: lastHealthCheck.status
      });
    });
  }, 1000);
}

export default fp(enhancedHealthPlugin, {
  name: 'enhanced-health',
  fastify: '4.x'
});