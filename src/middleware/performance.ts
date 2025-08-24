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
}

const defaultOptions: PerformanceOptions = {
  compression: config.performance.compression,
  backPressure: config.performance.backPressure,
  enableMetrics: true,
};

/**
 * Performance optimization plugin with compression and back-pressure handling
 * Integrates with @orchestr8/logger for performance monitoring
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

  // Add performance metrics collection
  if (performanceConfig.enableMetrics) {
    let requestCount = 0;
    let totalResponseTime = 0;
    let errorCount = 0;

    // Pre-handler: Start timing
    fastify.addHook('preHandler', async (request: FastifyRequest) => {
      (request as FastifyRequestWithContext).startTime = Date.now();
      (request as { startTimeBigInt?: bigint }).startTimeBigInt =
        process.hrtime.bigint();
      requestCount++;
    });

    // Response timing and metrics
    fastify.addHook(
      'onSend',
      async (
        request: FastifyRequest,
        reply: FastifyReply,
        payload: unknown
      ) => {
        const startTimeBigInt = (request as { startTimeBigInt?: bigint })
          .startTimeBigInt;
        if (startTimeBigInt) {
          const duration =
            Number(process.hrtime.bigint() - startTimeBigInt) / 1e6; // Convert to milliseconds
          totalResponseTime += duration;

          // Log slow requests
          if (duration > 1000) {
            // Log requests taking more than 1 second
            logWithContext.warn('Slow request detected', {
              method: request.method,
              url: request.url,
              duration,
              statusCode: reply.statusCode,
              userAgent: request.headers['user-agent'],
            });
          }

          // Add performance headers
          reply.header('x-response-time', `${duration.toFixed(2)}ms`);
          reply.header(
            'x-process-memory',
            `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
          );
        }

        return payload;
      }
    );

    // Error counting
    fastify.addHook('onError', async () => {
      errorCount++;
    });

    // Expose metrics endpoint
    fastify.get('/api/system/metrics', async () => {
      const memUsage = process.memoryUsage();
      const uptime = process.uptime();
      const avgResponseTime =
        requestCount > 0 ? totalResponseTime / requestCount : 0;

      return {
        success: true,
        data: {
          server: {
            uptime: Math.round(uptime),
            requestCount,
            errorCount,
            errorRate:
              requestCount > 0
                ? ((errorCount / requestCount) * 100).toFixed(2) + '%'
                : '0%',
            avgResponseTime: avgResponseTime.toFixed(2) + 'ms',
          },
          memory: {
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
            rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
            external: Math.round(memUsage.external / 1024 / 1024) + 'MB',
            arrayBuffers:
              Math.round(memUsage.arrayBuffers / 1024 / 1024) + 'MB',
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
  }

  // Add performance helper methods using hook
  fastify.decorateRequest('performance', null);
  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    const requestWithPerf = request as FastifyRequestWithContext & {
      performance?: {
        getStartTime(): bigint | undefined;
        getResponseTime(): number;
      };
      startTimeBigInt?: bigint;
    };
    requestWithPerf.performance = {
      getStartTime: () => requestWithPerf.startTimeBigInt,
      getResponseTime: () => {
        const startTimeBigInt = requestWithPerf.startTimeBigInt;
        return startTimeBigInt
          ? Number(process.hrtime.bigint() - startTimeBigInt) / 1e6
          : 0;
      },
    };
  });
}

// Performance interface extensions are defined in src/types/fastify.d.ts

export default fp(performancePlugin, {
  name: 'performance',
  fastify: '4.x',
});
