import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';
import { logWithContext, getCurrentCorrelationId } from '../services/logger.js';
import { config } from '../config/environment.js';

export interface SecurityOptions {
  rateLimit?: {
    max?: number;
    windowMs?: number;
    skipOnSuccess?: boolean;
    whitelist?: string[];
  };
  requestTimeout?: number;
  enhancedHeaders?: boolean;
  trustProxy?: boolean;
}

const defaultOptions: SecurityOptions = {
  rateLimit: config.security.rateLimit,
  requestTimeout: config.security.requestTimeout,
  enhancedHeaders: true,
  trustProxy: true,
};

/**
 * Security plugin with rate limiting and enhanced security headers
 * Integrates with @orchestr8/logger for security event logging
 */
async function securityPlugin(
  fastify: FastifyInstance,
  options: SecurityOptions = {}
) {
  const securityConfig = { ...defaultOptions, ...options };

  // Register rate limiting
  if (securityConfig.rateLimit) {
    await fastify.register(rateLimit, {
      max: securityConfig.rateLimit.max,
      timeWindow: securityConfig.rateLimit.windowMs,
      allowList: securityConfig.rateLimit.whitelist,

      // Custom error response with correlation ID
      errorResponseBuilder: (
        request: FastifyRequest,
        context: { max: number; after: string; ttl: number }
      ) => {
        const correlationId = getCurrentCorrelationId() || 'rate-limit-error';

        // Log rate limit violation
        logWithContext.warn('Rate limit exceeded', {
          ip: request.ip,
          userAgent: request.headers['user-agent'],
          method: request.method,
          url: request.url,
          limit: context.max,
          window: context.after,
        });

        return {
          success: false,
          error: {
            message: 'Too many requests',
            statusCode: 429,
            code: 'RATE_LIMIT_EXCEEDED',
            details: {
              limit: context.max,
              window: `${context.after}ms`,
              retryAfter: context.ttl,
            },
          },
          correlationId,
          timestamp: new Date().toISOString(),
        };
      },

      // Custom key generator - use IP address primarily
      keyGenerator: (request: FastifyRequest) => {
        return request.ip || request.socket.remoteAddress || 'unknown';
      },

      // Hook to add headers
      addHeaders: {
        'x-ratelimit-limit': true,
        'x-ratelimit-remaining': true,
        'x-ratelimit-reset': true,
        'retry-after': true,
      },
    });
  }

  // Add enhanced security headers
  if (securityConfig.enhancedHeaders) {
    fastify.addHook(
      'onSend',
      async (
        request: FastifyRequest,
        reply: FastifyReply,
        payload: unknown
      ) => {
        // Additional security headers beyond basic Helmet
        reply.header('X-Frame-Options', 'DENY');
        reply.header('X-Content-Type-Options', 'nosniff');
        reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
        reply.header(
          'Permissions-Policy',
          'geolocation=(), microphone=(), camera=()'
        );

        // Strict Transport Security for production
        if (config.isProduction) {
          reply.header(
            'Strict-Transport-Security',
            'max-age=31536000; includeSubDomains; preload'
          );
        }

        // Cache control for API responses
        if (request.url.startsWith('/api/')) {
          reply.header(
            'Cache-Control',
            'no-store, no-cache, must-revalidate, private'
          );
          reply.header('Pragma', 'no-cache');
          reply.header('Expires', '0');
        }

        return payload;
      }
    );
  }

  // Request timeout protection
  if (securityConfig.requestTimeout) {
    fastify.addHook(
      'onRequest',
      async (request: FastifyRequest, reply: FastifyReply) => {
        const timeout = setTimeout(() => {
          const correlationId = getCurrentCorrelationId() || 'timeout-error';

          logWithContext.warn('Request timeout exceeded', {
            method: request.method,
            url: request.url,
            userAgent: request.headers['user-agent'],
            ip: request.ip,
            timeout: securityConfig.requestTimeout,
          });

          if (!reply.sent) {
            reply.status(408).send({
              success: false,
              error: {
                message: 'Request timeout',
                statusCode: 408,
                code: 'REQUEST_TIMEOUT',
              },
              correlationId,
              timestamp: new Date().toISOString(),
            });
          }
        }, securityConfig.requestTimeout);

        // Clear timeout when request completes
        reply.raw.on('finish', () => clearTimeout(timeout));
        reply.raw.on('close', () => clearTimeout(timeout));
      }
    );
  }

  // Trust proxy settings for proper IP detection
  if (securityConfig.trustProxy) {
    fastify.addHook('onRequest', async (request: FastifyRequest) => {
      // Handle X-Forwarded-For header for proper IP detection
      const forwardedFor = request.headers['x-forwarded-for'] as string;
      if (forwardedFor && forwardedFor.length > 0) {
        // Take the first IP in the chain (original client IP)
        const originalIp = forwardedFor.split(',')[0].trim();
        (request as FastifyRequest & { ip: string }).ip = originalIp;
      }
    });
  }

  // Log security events
  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    // Skip logging for health checks and static assets
    if (request.url === '/health' || request.url === '/favicon.ico') {
      return;
    }

    // Log suspicious requests
    const userAgent = (request.headers['user-agent'] as string) || '';
    const forwardedFor = request.headers['x-forwarded-for'];
    const isSuspicious =
      !userAgent ||
      userAgent.length < 10 ||
      /bot|crawler|spider|scraper/i.test(userAgent) ||
      (forwardedFor && forwardedFor.toString().split(',').length > 3);

    if (isSuspicious) {
      logWithContext.warn('Suspicious request detected', {
        method: request.method,
        url: request.url,
        userAgent,
        ip: request.ip,
        headers: {
          'x-forwarded-for': request.headers['x-forwarded-for'],
          'x-real-ip': request.headers['x-real-ip'],
          origin: request.headers.origin,
          referer: request.headers.referer,
        },
      });
    }
  });

  // Add security helper methods to request using getter
  fastify.decorateRequest('security', null);
  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    (
      request as FastifyRequest & {
        security: {
          isRateLimited: boolean;
          isTimedOut: boolean;
          clientIp(): string;
          isSuspicious(): boolean;
        };
      }
    ).security = {
      isRateLimited: false,
      isTimedOut: false,
      clientIp: () => request.ip,
      isSuspicious: () => {
        const userAgent = (request.headers['user-agent'] as string) || '';
        return (
          !userAgent ||
          userAgent.length < 10 ||
          /bot|crawler|spider|scraper/i.test(userAgent)
        );
      },
    };
  });
}

// Extend FastifyRequest interface for TypeScript
declare module 'fastify' {
  interface FastifyRequest {
    security: {
      isRateLimited: boolean;
      isTimedOut: boolean;
      clientIp(): string;
      isSuspicious(): boolean;
    };
  }
}

export default fp(securityPlugin, {
  name: 'security',
  fastify: '4.x',
});
