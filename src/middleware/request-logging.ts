import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { generateCorrelationId } from '@orchestr8/logger';
import { executeWithCorrelation, logWithContext } from '../services/logger.js';
import type {
  FastifyRequestWithContext,
  GenericObject,
} from '../types/fastify.js';

export interface RequestLoggingOptions {
  logRequestBody?: boolean;
  logResponseBody?: boolean;
  maxBodySize?: number;
  excludePaths?: string[];
  logHeaders?: boolean;
}

const defaultOptions: RequestLoggingOptions = {
  logRequestBody: false,
  logResponseBody: false,
  maxBodySize: 1000,
  excludePaths: ['/health'],
  logHeaders: true,
};

/**
 * Request/Response logging middleware that integrates with @orchestr8/logger
 * Provides correlation ID tracking and structured request logging
 */
async function requestLoggingPlugin(
  fastify: FastifyInstance,
  options: RequestLoggingOptions = {}
) {
  const config = { ...defaultOptions, ...options };

  // Pre-handler: Set up correlation context and log incoming request
  fastify.addHook(
    'preHandler',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const startTime = Date.now();

      // Get or generate correlation ID
      const existingCorrelationId = request.headers[
        'x-correlation-id'
      ] as string;
      const correlationId = existingCorrelationId || generateCorrelationId();

      // Store correlation ID and start time in request
      (request as FastifyRequestWithContext).correlationId = correlationId;
      (request as FastifyRequestWithContext).startTime = startTime;

      // Add correlation ID to response headers
      reply.header('x-correlation-id', correlationId);

      // Skip logging for excluded paths
      if (config.excludePaths?.includes(request.url)) {
        return;
      }

      // Execute in correlation context and log request
      await executeWithCorrelation(correlationId, async () => {
        const logData: GenericObject = {
          method: request.method,
          url: request.url,
          userAgent: request.headers['user-agent'],
          ip: request.ip,
          contentLength: request.headers['content-length'],
        };

        // Include headers if configured
        if (config.logHeaders) {
          logData.headers = {
            authorization: request.headers.authorization
              ? '[REDACTED]'
              : undefined,
            'content-type': request.headers['content-type'],
            'user-agent': request.headers['user-agent'],
            'x-forwarded-for': request.headers['x-forwarded-for'],
          };
        }

        // Include request body if configured and present
        if (config.logRequestBody && request.body) {
          const bodyStr = JSON.stringify(request.body);
          logData.requestBody =
            bodyStr.length > config.maxBodySize!
              ? bodyStr.substring(0, config.maxBodySize!) + '...[TRUNCATED]'
              : bodyStr;
        }

        logWithContext.info('Incoming HTTP request', logData);
      });
    }
  );

  // Pre-serialization: Log response details before sending
  fastify.addHook(
    'preSerialization',
    async (request: FastifyRequest, reply: FastifyReply, payload: unknown) => {
      const correlationId = (request as FastifyRequestWithContext)
        .correlationId;
      const startTime = (request as FastifyRequestWithContext).startTime;

      if (!correlationId || config.excludePaths?.includes(request.url)) {
        return payload;
      }

      await executeWithCorrelation(correlationId, async () => {
        const duration = startTime ? Date.now() - startTime : 0;

        const logData: GenericObject = {
          method: request.method,
          url: request.url,
          statusCode: reply.statusCode,
          duration,
          contentLength: reply.getHeader('content-length'),
        };

        // Include response body if configured
        if (config.logResponseBody && payload) {
          const bodyStr = JSON.stringify(payload);
          logData.responseBody =
            bodyStr.length > config.maxBodySize!
              ? bodyStr.substring(0, config.maxBodySize!) + '...[TRUNCATED]'
              : bodyStr;
        }

        // Log based on response status
        if (reply.statusCode >= 400) {
          logWithContext.warn('HTTP request completed with error', logData);
        } else {
          logWithContext.info('HTTP request completed successfully', logData);
        }
      });

      return payload;
    }
  );

  // Error handler: Ensure errors are logged with correlation context
  fastify.addHook(
    'onError',
    async (request: FastifyRequest, reply: FastifyReply, error: Error) => {
      const correlationId = (request as FastifyRequestWithContext)
        .correlationId;
      const startTime = (request as FastifyRequestWithContext).startTime;

      if (!correlationId) {
        return;
      }

      await executeWithCorrelation(correlationId, async () => {
        const duration = startTime ? Date.now() - startTime : undefined;

        logWithContext.error(
          'HTTP request failed with error',
          {
            method: request.method,
            url: request.url,
            duration,
            userAgent: request.headers['user-agent'],
            ip: request.ip,
          },
          error
        );
      });
    }
  );

  // Add helper to get current request's correlation ID
  fastify.decorateRequest('getCorrelationId', function () {
    return (this as FastifyRequestWithContext).correlationId;
  });

  // Add helper to create correlated child logger for route handlers
  fastify.decorateRequest('getLogger', function () {
    const correlationId = (this as FastifyRequestWithContext).correlationId;
    return {
      debug: (message: string, context?: GenericObject) =>
        logWithContext.debug(message, { ...context, correlationId }),
      info: (message: string, context?: GenericObject) =>
        logWithContext.info(message, { ...context, correlationId }),
      warn: (message: string, context?: GenericObject) =>
        logWithContext.warn(message, { ...context, correlationId }),
      error: (message: string, context?: GenericObject, error?: Error) =>
        logWithContext.error(message, { ...context, correlationId }, error),
    };
  });
}

// Extend FastifyRequest interface for TypeScript
declare module 'fastify' {
  interface FastifyRequest {
    getCorrelationId(): string;
    getLogger(): {
      debug(message: string, context?: Record<string, unknown>): void;
      info(message: string, context?: Record<string, unknown>): void;
      warn(message: string, context?: Record<string, unknown>): void;
      error(
        message: string,
        context?: Record<string, unknown>,
        error?: Error
      ): void;
    };
  }
}

export default fp(requestLoggingPlugin, {
  name: 'request-logging',
  fastify: '4.x',
});
