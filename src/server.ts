import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { config } from './config/environment.js';
import { setupRoutes } from './routes/index.js';
import { initializeLogger } from './services/logger.js';
import errorHandlerPlugin from './middleware/error-handler.js';
import requestLoggingPlugin from './middleware/request-logging.js';
import securityPlugin from './middleware/security.js';
import performancePlugin from './middleware/performance.js';
import enhancedHealthPlugin from './middleware/enhanced-health.js';

const server = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
      },
    },
  },
});

async function start() {
  try {
    // Initialize @orchestr8/logger before registering plugins
    await initializeLogger();

    // Register request logging plugin first for correlation tracking
    await server.register(requestLoggingPlugin, {
      logRequestBody: config.isDevelopment,
      logResponseBody: config.isDevelopment,
      excludePaths: ['/health', '/favicon.ico'],
    });

    // Register enhanced security plugin with comprehensive protection
    await server.register(securityPlugin, {
      rateLimit: {
        max: config.security.rateLimit.max,
        windowMs: config.security.rateLimit.windowMs,
        skipOnSuccess: config.security.rateLimit.skipOnSuccess,
        whitelist: config.isDevelopment ? ['127.0.0.1', '::1'] : undefined,
      },
      requestTimeout: config.security.requestTimeout,
      enhancedHeaders: true,
      trustProxy: !config.isDevelopment,
      contentSecurityPolicy: {
        enabled: config.security.csp.enabled,
        reportOnly: config.security.csp.reportOnly,
        reportUri: '/api/csp-report',
      },
      corsValidation: {
        enabled: config.security.cors.validationEnabled,
        allowedOrigins: config.allowedOrigins,
        allowCredentials: false,
      },
    });

    // Register performance optimization plugin
    await server.register(performancePlugin, {
      compression: {
        threshold: config.performance.compression.threshold,
        quality: config.performance.compression.quality,
        encodings: ['gzip', 'deflate', 'br'],
      },
      backPressure: config.performance.backPressure,
      enableMetrics: true,
    });

    // Register enhanced health monitoring and graceful shutdown
    await server.register(enhancedHealthPlugin, {
      enableDetailedHealthCheck: true,
      checkExternalServices: true,
      gracefulShutdownTimeout: 10000,
      healthCheckInterval: 30000,
    });

    // Register error handler plugin last to catch all errors
    await server.register(errorHandlerPlugin, {
      hideInternalErrors: config.isProduction,
      includeStackTrace: config.isDevelopment,
    });

    await server.register(helmet, {
      global: true,
    });

    // CORS is now handled by the security middleware with proper validation
    // Remove the permissive CORS configuration
    await server.register(cors, {
      origin: false, // Disable automatic CORS - security middleware handles it
      credentials: false,
    });

    await setupRoutes(server);

    const address = await server.listen({
      port: config.port,
      host: config.host,
    });

    server.log.info(`Server listening at ${address}`);
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
}

if (import.meta.main) {
  start();
}

export { server };
