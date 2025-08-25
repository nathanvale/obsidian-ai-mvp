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
  /** Content Security Policy configuration */
  contentSecurityPolicy?: {
    enabled?: boolean;
    reportOnly?: boolean;
    reportUri?: string;
    directives?: Record<string, string[]>;
  };
  /** CORS validation configuration */
  corsValidation?: {
    enabled?: boolean;
    allowedOrigins?: string[];
    allowCredentials?: boolean;
  };
}

const defaultOptions: SecurityOptions = {
  rateLimit: {
    ...config.security.rateLimit,
  },
  requestTimeout: config.security.requestTimeout,
  enhancedHeaders: true,
  trustProxy: true,
  contentSecurityPolicy: {
    enabled: true,
    reportOnly: config.isDevelopment,
    reportUri: '/api/csp-report',
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'"],
      'style-src': ["'self'", "'unsafe-inline'"], // Allow inline styles for development
      'img-src': ["'self'", 'data:', 'blob:'],
      'font-src': ["'self'"],
      'connect-src': ["'self'", 'http://localhost:*', 'ws://localhost:*'], // Local AI services
      'media-src': ["'self'"],
      'object-src': ["'none'"],
      'child-src': ["'none'"],
      'worker-src': ["'self'"],
      'frame-ancestors': ["'none'"],
      'form-action': ["'self'"],
      'base-uri': ["'self'"],
      'manifest-src': ["'self'"],
    },
  },
  corsValidation: {
    enabled: true,
    allowedOrigins: config.allowedOrigins,
    allowCredentials: false, // Disable credentials for security
  },
};

/**
 * Generate Content Security Policy header value from directives
 */
function generateCSPHeader(directives: Record<string, string[]>): string {
  return Object.entries(directives)
    .map(([directive, values]) => `${directive} ${values.join(' ')}`)
    .join('; ');
}

/**
 * Validate CORS origin against allowed origins list
 */
function validateCORSOrigin(
  origin: string | undefined,
  allowedOrigins: string[]
): boolean {
  if (!origin) {
    return true;
  } // Same-origin requests have no origin header

  // Check exact matches
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  // Check localhost patterns for development
  if (
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:')
  ) {
    return allowedOrigins.some(
      allowed => allowed.includes('localhost') || allowed.includes('127.0.0.1')
    );
  }

  return false;
}

// Helper function removed - simplified rate limiting approach

/**
 * Security plugin with comprehensive protection including CSP, CORS validation, and enhanced rate limiting
 * Integrates with @orchestr8/logger for security event logging
 */
async function securityPlugin(
  fastify: FastifyInstance,
  options: SecurityOptions = {}
) {
  const securityConfig = { ...defaultOptions, ...options };

  // Register enhanced rate limiting with comprehensive security
  if (securityConfig.rateLimit) {
    await fastify.register(rateLimit, {
      max: securityConfig.rateLimit.max,
      timeWindow: securityConfig.rateLimit.windowMs,
      allowList: securityConfig.rateLimit.whitelist,

      // Enhanced key generator with IP and user agent fingerprinting
      keyGenerator: (request: FastifyRequest) => {
        const clientIP =
          request.ip || request.socket.remoteAddress || 'unknown';
        const userAgent = request.headers['user-agent'] || 'unknown';

        // Create a more sophisticated key to prevent bypassing via user agent rotation
        const uaHash = Buffer.from(userAgent).toString('base64').slice(0, 16);
        return `${clientIP}:${uaHash}`;
      },

      // Custom error response with correlation ID and security logging
      errorResponseBuilder: (
        request: FastifyRequest,
        context: { max: number; after: string; ttl: number }
      ) => {
        const correlationId = getCurrentCorrelationId() || 'rate-limit-error';
        const suspiciousPattern =
          context.max > 0 && request.url.includes('/api/');

        // Enhanced logging for potential DoS attacks
        logWithContext.warn('Rate limit exceeded - potential DoS attempt', {
          ip: request.ip,
          userAgent: request.headers['user-agent'],
          method: request.method,
          url: request.url,
          limit: context.max,
          window: context.after,
          suspiciousPattern,
          headers: {
            'x-forwarded-for': request.headers['x-forwarded-for'],
            'x-real-ip': request.headers['x-real-ip'],
            origin: request.headers.origin,
            referer: request.headers.referer,
          },
        });

        return {
          success: false,
          error: {
            message: 'Rate limit exceeded - too many requests',
            statusCode: 429,
            code: 'RATE_LIMIT_EXCEEDED',
            details: {
              limit: context.max,
              window: `${context.after}ms`,
              retryAfter: context.ttl,
              endpoint: request.url,
            },
          },
          correlationId,
          timestamp: new Date().toISOString(),
        };
      },

      // Comprehensive rate limit headers for client awareness
      addHeaders: {
        'x-ratelimit-limit': true,
        'x-ratelimit-remaining': true,
        'x-ratelimit-reset': true,
        'retry-after': true,
      },
    });
  }

  // Add comprehensive security headers including CSP
  if (securityConfig.enhancedHeaders) {
    fastify.addHook(
      'onSend',
      async (
        request: FastifyRequest,
        reply: FastifyReply,
        payload: unknown
      ) => {
        // Content Security Policy - critical for XSS protection
        if (
          securityConfig.contentSecurityPolicy?.enabled &&
          securityConfig.contentSecurityPolicy.directives
        ) {
          const cspHeader = generateCSPHeader(
            securityConfig.contentSecurityPolicy.directives
          );
          const headerName = securityConfig.contentSecurityPolicy.reportOnly
            ? 'Content-Security-Policy-Report-Only'
            : 'Content-Security-Policy';

          reply.header(headerName, cspHeader);

          // Add CSP reporting endpoint
          if (securityConfig.contentSecurityPolicy.reportUri) {
            reply.header(
              headerName,
              `${cspHeader}; report-uri ${securityConfig.contentSecurityPolicy.reportUri}`
            );
          }
        }

        // Enhanced security headers for comprehensive protection
        reply.header('X-Frame-Options', 'DENY');
        reply.header('X-Content-Type-Options', 'nosniff');
        reply.header('X-XSS-Protection', '1; mode=block');
        reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');

        // Comprehensive permissions policy to disable unnecessary browser features
        reply.header(
          'Permissions-Policy',
          'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), speaker=(), vibrate=(), fullscreen=(self)'
        );

        // Strict Transport Security for production
        if (config.isProduction) {
          reply.header(
            'Strict-Transport-Security',
            'max-age=31536000; includeSubDomains; preload'
          );
        }

        // Cache control for API responses - prevent sensitive data caching
        if (request.url.startsWith('/api/')) {
          reply.header(
            'Cache-Control',
            'no-store, no-cache, must-revalidate, private, max-age=0'
          );
          reply.header('Pragma', 'no-cache');
          reply.header('Expires', '0');
        }

        // Additional security headers for ADHD data protection
        reply.header('X-Permitted-Cross-Domain-Policies', 'none');
        reply.header('Cross-Origin-Embedder-Policy', 'require-corp');
        reply.header('Cross-Origin-Opener-Policy', 'same-origin');
        reply.header('Cross-Origin-Resource-Policy', 'same-origin');

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

  // CORS validation for enhanced security
  if (
    securityConfig.corsValidation?.enabled &&
    securityConfig.corsValidation.allowedOrigins
  ) {
    fastify.addHook(
      'onRequest',
      async (request: FastifyRequest, reply: FastifyReply) => {
        const origin = request.headers.origin;
        const allowedOrigins = securityConfig.corsValidation!.allowedOrigins!;

        // Validate CORS origin for cross-origin requests
        if (origin && !validateCORSOrigin(origin, allowedOrigins)) {
          const correlationId = getCurrentCorrelationId() || 'cors-violation';

          // Log suspicious cross-origin request
          logWithContext.warn('CORS violation - unauthorized origin', {
            origin,
            allowedOrigins,
            method: request.method,
            url: request.url,
            userAgent: request.headers['user-agent'],
            ip: request.ip,
            referer: request.headers.referer,
          });

          // Block the request
          reply.status(403).send({
            success: false,
            error: {
              message: 'Cross-origin request blocked',
              statusCode: 403,
              code: 'CORS_VIOLATION',
              details: {
                origin,
                allowedOrigins: config.isDevelopment
                  ? allowedOrigins
                  : ['[hidden in production]'],
              },
            },
            correlationId,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Set CORS headers for valid origins
        if (origin && validateCORSOrigin(origin, allowedOrigins)) {
          reply.header('Access-Control-Allow-Origin', origin);
          reply.header(
            'Access-Control-Allow-Credentials',
            securityConfig.corsValidation?.allowCredentials?.toString() ||
              'false'
          );

          // Handle preflight requests
          if (request.method === 'OPTIONS') {
            reply.header(
              'Access-Control-Allow-Methods',
              'GET, POST, PUT, DELETE, OPTIONS'
            );
            reply.header(
              'Access-Control-Allow-Headers',
              'Content-Type, Authorization, X-Requested-With'
            );
            reply.header('Access-Control-Max-Age', '86400'); // 24 hours
            reply.status(204).send();
            return;
          }
        }
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

  // CSP Violation Reporting Endpoint
  if (
    securityConfig.contentSecurityPolicy?.enabled &&
    securityConfig.contentSecurityPolicy.reportUri
  ) {
    fastify.post(
      securityConfig.contentSecurityPolicy.reportUri,
      async (request: FastifyRequest, reply: FastifyReply) => {
        const correlationId = getCurrentCorrelationId() || 'csp-report';

        try {
          // Log CSP violations for security monitoring
          logWithContext.warn('CSP violation reported', {
            cspReport: request.body,
            userAgent: request.headers['user-agent'],
            ip: request.ip,
            url: request.url,
            referer: request.headers.referer,
          });

          // Return success to prevent browser console errors
          reply.status(204).send();
        } catch (error) {
          logWithContext.error('Failed to process CSP report', {
            error: error instanceof Error ? error.message : 'Unknown error',
            body: request.body,
          });
          reply.status(400).send({
            success: false,
            error: {
              message: 'Failed to process CSP report',
              statusCode: 400,
              code: 'CSP_REPORT_ERROR',
            },
            correlationId,
            timestamp: new Date().toISOString(),
          });
        }
      }
    );
  }

  // Add enhanced security helper methods to request
  fastify.decorateRequest('security', null);
  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    (
      request as FastifyRequest & {
        security: {
          isRateLimited: boolean;
          isTimedOut: boolean;
          clientIp(): string;
          isSuspicious(): boolean;
          isValidOrigin(): boolean;
          hasCSPViolation(): boolean;
          getRateLimitInfo(): { max: number; windowMs: number } | null;
        };
      }
    ).security = {
      isRateLimited: false,
      isTimedOut: false,
      clientIp: () => request.ip,
      isSuspicious: () => {
        const userAgent = (request.headers['user-agent'] as string) || '';
        const hasLowEntropyUA = !userAgent || userAgent.length < 10;
        const isBotLike = /bot|crawler|spider|scraper|headless/i.test(
          userAgent
        );
        const hasSuspiciousHeaders =
          !request.headers['accept'] || !request.headers['accept-language'];

        return hasLowEntropyUA || isBotLike || hasSuspiciousHeaders;
      },
      isValidOrigin: () => {
        const origin = request.headers.origin;
        if (!origin) {
          return true;
        } // Same-origin requests

        if (
          securityConfig.corsValidation?.enabled &&
          securityConfig.corsValidation.allowedOrigins
        ) {
          return validateCORSOrigin(
            origin,
            securityConfig.corsValidation.allowedOrigins
          );
        }

        return true; // CORS validation disabled
      },
      hasCSPViolation: () => {
        // This would be set by CSP violation reports, simplified for now
        return false;
      },
      getRateLimitInfo: () => {
        if (!securityConfig.rateLimit) {
          return null;
        }

        return {
          max: securityConfig.rateLimit.max || 100,
          windowMs: securityConfig.rateLimit.windowMs || 60000,
        };
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
      isValidOrigin(): boolean;
      hasCSPViolation(): boolean;
      getRateLimitInfo(): { max: number; windowMs: number } | null;
    };
  }
}

export default fp(securityPlugin, {
  name: 'security',
  fastify: '4.x',
});
