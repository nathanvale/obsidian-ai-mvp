import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import fastifyCompress from '@fastify/compress';
import underPressure, {
  type UnderPressureOptions,
} from '@fastify/under-pressure';
import type { FastifyRequestWithContext } from '../types/fastify.js';
import { logWithContext, getCurrentCorrelationId } from '../services/logger.js';
import { config } from '../config/environment.js';

export interface PerformanceOptions {
  compression?: {
    threshold?: number;
    quality?: number;
    encodings?: string[];
    customTypes?: RegExp;
  };
  backPressure?: {
    maxEventLoopDelay?: number;
    maxHeapUsedBytes?: number;
    maxRssBytes?: number;
    retryAfter?: number;
  };
  enableMetrics?: boolean;
  sampling?: {
    enabled?: boolean;
    rate?: number; // 1 in N requests (e.g., 10 = sample 1 in 10 requests)
    adaptiveSampling?: boolean;
    highPriorityPaths?: string[]; // Paths to always sample for ADHD workflows
  };
  heapMonitoring?: {
    enabled?: boolean;
    warningThreshold?: number; // MB
    criticalThreshold?: number; // MB
    gcMonitoring?: boolean;
  };
  adhdOptimizations?: {
    enabled?: boolean;
    medicationCycleTracking?: boolean;
    aiWorkloadMonitoring?: boolean;
    responseTimeTargets?: {
      standard?: number; // ms
      aiProcessing?: number; // ms
      search?: number; // ms
    };
  };
}

const defaultOptions: PerformanceOptions = {
  compression: config.performance.compression,
  backPressure: config.performance.backPressure,
  enableMetrics: true,
  sampling: config.performance.sampling,
  heapMonitoring: config.performance.heapMonitoring,
  adhdOptimizations: config.performance.adhdOptimizations,
};

/**
 * ADHD-optimized performance metrics interface
 */
interface AdhdPerformanceMetrics {
  requestCount: number;
  sampledRequests: number;
  totalResponseTime: number;
  errorCount: number;
  responseTimePercentiles: {
    p50: number;
    p95: number;
    p99: number;
  };
  adhdWorkloads: {
    voiceProcessing: { count: number; avgTime: number };
    semanticSearch: { count: number; avgTime: number };
    emailProcessing: { count: number; avgTime: number };
  };
  medicationCyclePatterns: {
    hourlyPerformance: Map<number, number>; // hour -> avg response time
    peakHours: number[];
    lowPerformanceHours: number[];
  };
  heapMetrics: {
    currentUsage: number;
    maxUsage: number;
    warnings: number;
    gcEvents: number;
  };
}

/**
 * Sampling strategy manager for efficient metrics collection
 */
class PerformanceSampler {
  private sampleCounter = 0;
  private responseTimes: number[] = [];
  private readonly maxSamples = 1000; // Keep last 1000 samples for percentile calculation

  constructor(
    private readonly config: Required<
      NonNullable<PerformanceOptions['sampling']>
    >
  ) {}

  shouldSample(request: FastifyRequest): boolean {
    if (!this.config.enabled) {
      return true; // Sample all if disabled
    }

    const url = request.url;

    // Always sample high-priority ADHD paths
    if (this.config.highPriorityPaths.some(path => url.startsWith(path))) {
      return true;
    }

    // Health check paths - reduce sampling to minimize overhead
    if (url.startsWith('/api/health') || url.startsWith('/api/system')) {
      return this.sampleCounter % (this.config.rate * 5) === 0;
    }

    // Adaptive sampling based on request type
    if (this.config.adaptiveSampling) {
      // Higher sampling for AI workloads during performance analysis
      if (
        url.includes('/api/ai') ||
        url.includes('/api/search') ||
        url.includes('/api/voice')
      ) {
        return (
          this.sampleCounter % Math.max(1, Math.floor(this.config.rate / 2)) ===
          0
        );
      }
    }

    // Standard sampling rate
    const shouldSample = this.sampleCounter % this.config.rate === 0;
    this.sampleCounter++;

    return shouldSample;
  }

  addSample(responseTime: number): void {
    this.responseTimes.push(responseTime);

    // Keep only the most recent samples to prevent memory leak
    if (this.responseTimes.length > this.maxSamples) {
      this.responseTimes = this.responseTimes.slice(-this.maxSamples);
    }
  }

  getPercentiles(): { p50: number; p95: number; p99: number } {
    if (this.responseTimes.length === 0) {
      return { p50: 0, p95: 0, p99: 0 };
    }

    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    const len = sorted.length;

    return {
      p50: sorted[Math.floor(len * 0.5)] || 0,
      p95: sorted[Math.floor(len * 0.95)] || 0,
      p99: sorted[Math.floor(len * 0.99)] || 0,
    };
  }

  getSampleCount(): number {
    return this.responseTimes.length;
  }
}

/**
 * Heap monitoring for memory leak detection during ADHD processing
 */
class HeapMonitor {
  private maxHeapUsed = 0;
  private warnings = 0;
  private gcEvents = 0;
  private lastGcCheck = Date.now();

  constructor(
    private readonly config: Required<
      NonNullable<PerformanceOptions['heapMonitoring']>
    >
  ) {
    if (this.config.gcMonitoring && global.gc) {
      // Monitor GC events if available
      this.setupGcMonitoring();
    }
  }

  private setupGcMonitoring(): void {
    // Note: This requires --expose-gc flag to be meaningful
    // In production, we'll estimate GC activity through heap changes
    setInterval(() => {
      const memBefore = process.memoryUsage().heapUsed;

      // Check if heap dropped significantly (likely GC event)
      setTimeout(() => {
        const memAfter = process.memoryUsage().heapUsed;
        const diff = memBefore - memAfter;

        if (diff > 10 * 1024 * 1024) {
          // 10MB+ reduction suggests GC
          this.gcEvents++;
          logWithContext.debug('Potential GC event detected', {
            heapReduction: `${Math.round(diff / 1024 / 1024)}MB`,
            heapAfterGc: `${Math.round(memAfter / 1024 / 1024)}MB`,
          });
        }
      }, 100);
    }, 30000); // Check every 30 seconds
  }

  checkHeapHealth(): {
    status: 'healthy' | 'warning' | 'critical';
    usage: number;
    maxUsage: number;
  } {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;

    // Update max usage tracking
    if (heapUsedMB > this.maxHeapUsed) {
      this.maxHeapUsed = heapUsedMB;
    }

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    if (heapUsedMB > this.config.criticalThreshold) {
      status = 'critical';
      this.warnings++;
      logWithContext.error('Critical heap usage detected', {
        heapUsed: `${Math.round(heapUsedMB)}MB`,
        threshold: `${this.config.criticalThreshold}MB`,
        recommendation: 'Consider restarting ADHD processing services',
      });
    } else if (heapUsedMB > this.config.warningThreshold) {
      status = 'warning';
      this.warnings++;
      logWithContext.warn('High heap usage detected', {
        heapUsed: `${Math.round(heapUsedMB)}MB`,
        threshold: `${this.config.warningThreshold}MB`,
        suggestion: 'Monitor ADHD AI workloads for memory leaks',
      });
    }

    return {
      status,
      usage: heapUsedMB,
      maxUsage: this.maxHeapUsed,
    };
  }

  getMetrics(): AdhdPerformanceMetrics['heapMetrics'] {
    const heapCheck = this.checkHeapHealth();
    return {
      currentUsage: heapCheck.usage,
      maxUsage: heapCheck.maxUsage,
      warnings: this.warnings,
      gcEvents: this.gcEvents,
    };
  }
}

/**
 * ADHD-specific performance pattern analyzer
 */
class AdhdPerformanceAnalyzer {
  private hourlyPerformance = new Map<number, number[]>();
  private workloadMetrics = {
    voiceProcessing: { count: 0, totalTime: 0 },
    semanticSearch: { count: 0, totalTime: 0 },
    emailProcessing: { count: 0, totalTime: 0 },
  };

  analyzeRequest(request: FastifyRequest, responseTime: number): void {
    const hour = new Date().getHours();
    const url = request.url;

    // Track hourly performance patterns for medication cycle correlation
    if (!this.hourlyPerformance.has(hour)) {
      this.hourlyPerformance.set(hour, []);
    }
    this.hourlyPerformance.get(hour)!.push(responseTime);

    // Categorize ADHD workloads
    if (url.includes('/api/voice') || url.includes('/transcribe')) {
      this.workloadMetrics.voiceProcessing.count++;
      this.workloadMetrics.voiceProcessing.totalTime += responseTime;
    } else if (url.includes('/api/search') || url.includes('/semantic')) {
      this.workloadMetrics.semanticSearch.count++;
      this.workloadMetrics.semanticSearch.totalTime += responseTime;
    } else if (url.includes('/api/email') || url.includes('/process')) {
      this.workloadMetrics.emailProcessing.count++;
      this.workloadMetrics.emailProcessing.totalTime += responseTime;
    }
  }

  getMedicationCycleInsights(): AdhdPerformanceMetrics['medicationCyclePatterns'] {
    const hourlyAvg = new Map<number, number>();
    const performanceTimes: Array<{ hour: number; avgTime: number }> = [];

    // Calculate average response time for each hour
    this.hourlyPerformance.forEach((times, hour) => {
      if (times.length > 0) {
        const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
        hourlyAvg.set(hour, avg);
        performanceTimes.push({ hour, avgTime: avg });
      }
    });

    // Sort to find performance patterns
    performanceTimes.sort((a, b) => a.avgTime - b.avgTime);

    const peakHours = performanceTimes
      .slice(0, Math.ceil(performanceTimes.length * 0.3))
      .map(p => p.hour);
    const lowPerformanceHours = performanceTimes
      .slice(-Math.ceil(performanceTimes.length * 0.3))
      .map(p => p.hour);

    return {
      hourlyPerformance: hourlyAvg,
      peakHours: peakHours.sort(),
      lowPerformanceHours: lowPerformanceHours.sort(),
    };
  }

  getWorkloadMetrics(): AdhdPerformanceMetrics['adhdWorkloads'] {
    return {
      voiceProcessing: {
        count: this.workloadMetrics.voiceProcessing.count,
        avgTime:
          this.workloadMetrics.voiceProcessing.count > 0
            ? this.workloadMetrics.voiceProcessing.totalTime /
              this.workloadMetrics.voiceProcessing.count
            : 0,
      },
      semanticSearch: {
        count: this.workloadMetrics.semanticSearch.count,
        avgTime:
          this.workloadMetrics.semanticSearch.count > 0
            ? this.workloadMetrics.semanticSearch.totalTime /
              this.workloadMetrics.semanticSearch.count
            : 0,
      },
      emailProcessing: {
        count: this.workloadMetrics.emailProcessing.count,
        avgTime:
          this.workloadMetrics.emailProcessing.count > 0
            ? this.workloadMetrics.emailProcessing.totalTime /
              this.workloadMetrics.emailProcessing.count
            : 0,
      },
    };
  }
}

/**
 * Performance optimization plugin with compression and back-pressure handling
 * Integrates with @orchestr8/logger for performance monitoring
 * Optimized for ADHD Digital Second Brain workloads
 */
async function performancePlugin(
  fastify: FastifyInstance,
  options: PerformanceOptions = {}
) {
  const performanceConfig = { ...defaultOptions, ...options };

  // Register response compression
  if (performanceConfig.compression) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await fastify.register(fastifyCompress as any, {
      threshold: performanceConfig.compression.threshold,

      // Configure compression algorithms
      encodings: performanceConfig.compression.encodings || ['gzip', 'deflate'],

      // Compress JSON, text, and API responses
      customTypes:
        performanceConfig.compression.customTypes ||
        /^(application\/json|text\/.*|application\/javascript|application\/xml)$/,

      // Skip compression for small responses and certain content types
      onUnsupportedEncoding: (encoding: string, request: FastifyRequest) => {
        logWithContext.debug('Unsupported compression encoding requested', {
          encoding,
          url: request.url,
          userAgent: request.headers['user-agent'],
        });
      },

      // Global compression settings
      global: true,

      // Remove content-length header for compressed responses
      removeContentLength: true,
    });
  }

  // Register back-pressure monitoring
  if (performanceConfig.backPressure) {
    try {
      const underPressureOptions: UnderPressureOptions = {
        maxEventLoopDelay: performanceConfig.backPressure.maxEventLoopDelay,
        maxHeapUsedBytes: performanceConfig.backPressure.maxHeapUsedBytes,
        maxRssBytes: performanceConfig.backPressure.maxRssBytes,
        message: JSON.stringify({
          success: false,
          error: {
            message: 'Service temporarily overloaded',
            statusCode: 503,
            code: 'SERVICE_OVERLOADED',
          },
          timestamp: new Date().toISOString(),
        }),
        retryAfter: performanceConfig.backPressure.retryAfter || 50,
      };

      await fastify.register(underPressure, underPressureOptions);
    } catch (error) {
      logWithContext.warn('Failed to register under-pressure plugin', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Add ADHD-optimized performance metrics collection
  if (performanceConfig.enableMetrics) {
    // Initialize performance monitoring components with required fields
    const samplingConfig = {
      ...defaultOptions.sampling!,
      ...performanceConfig.sampling,
    } as Required<NonNullable<PerformanceOptions['sampling']>>;

    const heapConfig = {
      ...defaultOptions.heapMonitoring!,
      ...performanceConfig.heapMonitoring,
    } as Required<NonNullable<PerformanceOptions['heapMonitoring']>>;

    const sampler = new PerformanceSampler(samplingConfig);
    const heapMonitor = new HeapMonitor(heapConfig);
    const adhdAnalyzer = new AdhdPerformanceAnalyzer();

    // Core metrics with efficient collection
    let requestCount = 0;
    let sampledRequests = 0;
    let totalResponseTime = 0;
    let errorCount = 0;

    // Pre-handler: Start high-resolution timing
    fastify.addHook('preHandler', async (request: FastifyRequest) => {
      (request as FastifyRequestWithContext).startTime = Date.now();
      (request as { startTimeBigInt?: bigint }).startTimeBigInt =
        process.hrtime.bigint();
      (request as { shouldSample?: boolean }).shouldSample =
        sampler.shouldSample(request);

      requestCount++;
      if ((request as { shouldSample?: boolean }).shouldSample) {
        sampledRequests++;
      }
    });

    // Response timing and ADHD-optimized metrics
    fastify.addHook(
      'onSend',
      async (
        request: FastifyRequest,
        reply: FastifyReply,
        payload: unknown
      ) => {
        const startTimeBigInt = (request as { startTimeBigInt?: bigint })
          .startTimeBigInt;
        const shouldSample = (request as { shouldSample?: boolean })
          .shouldSample;

        if (startTimeBigInt) {
          const duration =
            Number(process.hrtime.bigint() - startTimeBigInt) / 1e6; // Convert to milliseconds

          // Update metrics based on sampling strategy
          if (shouldSample) {
            totalResponseTime += duration;
            sampler.addSample(duration);

            // ADHD-specific performance analysis
            if (performanceConfig.adhdOptimizations?.enabled) {
              adhdAnalyzer.analyzeRequest(request, duration);
            }
          }

          // ADHD response time monitoring - check against targets
          const targets =
            performanceConfig.adhdOptimizations?.responseTimeTargets ||
            defaultOptions.adhdOptimizations!.responseTimeTargets!;
          let threshold = targets.standard;

          // Adjust threshold based on request type
          if (
            request.url.includes('/api/search') ||
            request.url.includes('/semantic')
          ) {
            threshold = targets.search;
          } else if (
            request.url.includes('/api/voice') ||
            request.url.includes('/ai')
          ) {
            threshold = targets.aiProcessing;
          }

          // Log slow requests with ADHD-specific context
          if (duration > threshold!) {
            const severity = duration > threshold! * 2 ? 'error' : 'warn';
            logWithContext[severity]('ADHD workflow performance concern', {
              method: request.method,
              url: request.url,
              duration: `${duration.toFixed(2)}ms`,
              threshold: `${threshold}ms`,
              statusCode: reply.statusCode,
              userAgent: request.headers['user-agent'],
              adhdContext: {
                workflowType: request.url.includes('/api/voice')
                  ? 'voice-processing'
                  : request.url.includes('/api/search')
                    ? 'semantic-search'
                    : request.url.includes('/api/email')
                      ? 'email-processing'
                      : 'standard',
                medicationHour: new Date().getHours(),
                impactLevel: duration > threshold! * 2 ? 'high' : 'medium',
              },
            });
          }

          // Always add performance headers for ADHD user awareness
          reply.header('x-response-time', `${duration.toFixed(2)}ms`);
          reply.header(
            'x-process-memory',
            `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
          );

          // Add ADHD-specific headers
          if (shouldSample) {
            const heapStatus = heapMonitor.checkHeapHealth();
            reply.header(
              'x-adhd-performance',
              JSON.stringify({
                medicationHour: new Date().getHours(),
                heapStatus: heapStatus.status,
                workflowOptimal: duration <= threshold!,
              })
            );
          }
        }

        return payload;
      }
    );

    // Error counting with ADHD context
    fastify.addHook(
      'onError',
      async (request: FastifyRequest, reply: FastifyReply, error: Error) => {
        errorCount++;

        // Log errors with ADHD workflow context
        if (
          request.url.includes('/api/voice') ||
          request.url.includes('/api/search') ||
          request.url.includes('/api/email')
        ) {
          logWithContext.error('ADHD workflow error detected', {
            url: request.url,
            error: error.message,
            medicationHour: new Date().getHours(),
            potentialUserImpact: 'Cognitive support workflow disrupted',
          });
        }
      }
    );

    // Enhanced metrics endpoint with ADHD insights
    fastify.get('/api/system/metrics', async () => {
      const memUsage = process.memoryUsage();
      const uptime = process.uptime();
      const avgResponseTime =
        sampledRequests > 0 ? totalResponseTime / sampledRequests : 0;
      const percentiles = sampler.getPercentiles();
      const heapMetrics = heapMonitor.getMetrics();
      const workloadMetrics = adhdAnalyzer.getWorkloadMetrics();
      const medicationInsights = adhdAnalyzer.getMedicationCycleInsights();

      return {
        success: true,
        data: {
          server: {
            uptime: Math.round(uptime),
            requestCount,
            sampledRequests,
            samplingEfficiency: `${((sampledRequests / Math.max(requestCount, 1)) * 100).toFixed(1)}%`,
            errorCount,
            errorRate:
              requestCount > 0
                ? `${((errorCount / requestCount) * 100).toFixed(2)}%`
                : '0%',
            avgResponseTime: `${avgResponseTime.toFixed(2)}ms`,
          },
          performance: {
            responseTimePercentiles: {
              p50: `${percentiles.p50.toFixed(2)}ms`,
              p95: `${percentiles.p95.toFixed(2)}ms`,
              p99: `${percentiles.p99.toFixed(2)}ms`,
            },
            samplingStats: {
              totalSamples: sampler.getSampleCount(),
              samplingRate: performanceConfig.sampling?.rate || 10,
              adaptiveSampling:
                performanceConfig.sampling?.adaptiveSampling || false,
            },
          },
          memory: {
            heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
            rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
            external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
            arrayBuffers: `${Math.round(memUsage.arrayBuffers / 1024 / 1024)}MB`,
            heapHealth: {
              currentUsage: `${Math.round(heapMetrics.currentUsage)}MB`,
              maxUsage: `${Math.round(heapMetrics.maxUsage)}MB`,
              warnings: heapMetrics.warnings,
              gcEvents: heapMetrics.gcEvents,
            },
          },
          adhdWorkloads: {
            voiceProcessing: {
              requests: workloadMetrics.voiceProcessing.count,
              avgResponseTime: `${workloadMetrics.voiceProcessing.avgTime.toFixed(2)}ms`,
            },
            semanticSearch: {
              requests: workloadMetrics.semanticSearch.count,
              avgResponseTime: `${workloadMetrics.semanticSearch.avgTime.toFixed(2)}ms`,
            },
            emailProcessing: {
              requests: workloadMetrics.emailProcessing.count,
              avgResponseTime: `${workloadMetrics.emailProcessing.avgTime.toFixed(2)}ms`,
            },
          },
          medicationCycleInsights: {
            peakPerformanceHours: medicationInsights.peakHours,
            challengingHours: medicationInsights.lowPerformanceHours,
            currentHour: new Date().getHours(),
            hourlyAverages: Object.fromEntries(
              Array.from(medicationInsights.hourlyPerformance.entries()).map(
                ([hour, avg]) => [hour.toString(), `${avg.toFixed(2)}ms`]
              )
            ),
          },
          process: {
            pid: process.pid,
            platform: process.platform,
            nodeVersion: process.version,
            cpuUsage: process.cpuUsage(),
          },
        },
        correlationId: getCurrentCorrelationId(),
        timestamp: new Date().toISOString(),
      };
    });

    // Periodic heap health checks for long-running ADHD sessions
    setInterval(() => {
      const heapStatus = heapMonitor.checkHeapHealth();
      if (heapStatus.status === 'critical') {
        logWithContext.error('Critical heap usage during ADHD session', {
          currentUsage: `${Math.round(heapStatus.usage)}MB`,
          maxUsage: `${Math.round(heapStatus.maxUsage)}MB`,
          recommendation:
            'Consider restarting services to maintain ADHD cognitive support',
          medicationHour: new Date().getHours(),
        });
      }
    }, 60000); // Check every minute
  }

  // Add ADHD-optimized performance helper methods
  fastify.decorateRequest('performance', null);
  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    const requestWithPerf = request as FastifyRequestWithContext & {
      performance?: {
        getStartTime(): bigint | undefined;
        getResponseTime(): number;
        isAdhdWorkflow(): boolean;
        getAdhdContext(): {
          workflowType: string;
          medicationHour: number;
          expectedThreshold: number;
        };
        checkResponseTimeTarget(): {
          withinTarget: boolean;
          threshold: number;
          actual: number;
        };
      };
      startTimeBigInt?: bigint;
    };

    const adhdConfig =
      performanceConfig.adhdOptimizations || defaultOptions.adhdOptimizations!;
    const targets = adhdConfig.responseTimeTargets!;

    requestWithPerf.performance = {
      getStartTime: () => requestWithPerf.startTimeBigInt,

      getResponseTime: () => {
        const startTimeBigInt = requestWithPerf.startTimeBigInt;
        return startTimeBigInt
          ? Number(process.hrtime.bigint() - startTimeBigInt) / 1e6
          : 0;
      },

      isAdhdWorkflow: () => {
        const url = requestWithPerf.url;
        return (
          url.includes('/api/voice') ||
          url.includes('/api/search') ||
          url.includes('/api/email') ||
          url.includes('/transcribe') ||
          url.includes('/semantic')
        );
      },

      getAdhdContext: () => {
        const url = requestWithPerf.url;
        let workflowType = 'standard';
        let expectedThreshold = targets.standard!;

        if (url.includes('/api/voice') || url.includes('/transcribe')) {
          workflowType = 'voice-processing';
          expectedThreshold = targets.aiProcessing!;
        } else if (url.includes('/api/search') || url.includes('/semantic')) {
          workflowType = 'semantic-search';
          expectedThreshold = targets.search!;
        } else if (url.includes('/api/email')) {
          workflowType = 'email-processing';
          expectedThreshold = targets.aiProcessing!;
        }

        return {
          workflowType,
          medicationHour: new Date().getHours(),
          expectedThreshold,
        };
      },

      checkResponseTimeTarget: () => {
        const context = requestWithPerf.performance!.getAdhdContext();
        const actual = requestWithPerf.performance!.getResponseTime();

        return {
          withinTarget: actual <= context.expectedThreshold,
          threshold: context.expectedThreshold,
          actual,
        };
      },
    };
  });
}

// Performance interface extensions are defined in src/types/fastify.d.ts

export default fp(performancePlugin, {
  name: 'performance',
  fastify: '4.x',
});
