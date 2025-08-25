import { createPinoLogger, CorrelationContext } from '@orchestr8/logger'
import type { Logger } from '@orchestr8/logger'
import { config, secureConfigUtils } from '../config/environment.js'

let loggerInstance: Logger | null = null

export async function initializeLogger(): Promise<Logger> {
  if (loggerInstance) {
    return loggerInstance
  }

  loggerInstance = await createPinoLogger({
    level: config.logger.level,
    pretty: config.logger.pretty,
    redactKeys: config.logger.redactKeys,
    maxFieldSize: config.logger.maxFieldSize,
    // Note: serializers will be configured at pino level if supported
    ...(config.logger.serializers && {
      serializers: config.logger.serializers,
    }),
  })

  // Perform ADHD data protection compliance check on logger initialization
  const complianceIssues =
    secureConfigUtils.validateAdhdDataProtectionCompliance()
  if (complianceIssues.length > 0) {
    loggerInstance.warn('Logger security compliance issues detected', {
      issues: complianceIssues,
      environment: config.nodeEnv,
      timestamp: new Date().toISOString(),
    })
  }

  return loggerInstance
}

export const getLogger = (): Logger => {
  if (!loggerInstance) {
    throw new Error('Logger not initialized. Call initializeLogger() first.')
  }
  return loggerInstance
}

// Create logger with correlation context
export const createCorrelatedLogger = (correlationId?: string): Logger => {
  const baseLogger = getLogger()
  const actualCorrelationId = correlationId || getCurrentCorrelationId()

  return baseLogger.child({
    correlationId: actualCorrelationId,
  })
}

// Execute operation with correlation context
export const executeWithCorrelation = async <T>(
  correlationId: string,
  operation: () => Promise<T>,
): Promise<T> => {
  return await CorrelationContext.run(correlationId, operation)
}

// Get current correlation ID - using context directly
export const getCurrentCorrelationId = (): string | undefined => {
  // Use CorrelationContext.get() to retrieve current correlation ID
  try {
    return CorrelationContext.get()
  } catch {
    return undefined
  }
}

// Export logger instance for direct use (will be initialized during app startup)
export const logger: Logger = new Proxy({} as Logger, {
  get(target, prop) {
    const actualLogger = getLogger()
    const value = actualLogger[prop as keyof Logger]

    if (typeof value === 'function') {
      return value.bind(actualLogger)
    }
    return value
  },
  set(target, prop, value) {
    const actualLogger = getLogger()
    ;(actualLogger as unknown as Record<string, unknown>)[prop as string] =
      value
    return true
  },
})

/**
 * Secure context sanitization for ADHD data protection
 * Ensures no sensitive information leaks through log context
 */
function sanitizeLogContext(
  context: Record<string, unknown>,
): Record<string, unknown> {
  const sanitizedContext: Record<string, unknown> = {}

  Object.entries(context).forEach(([key, value]) => {
    // Use the environment redaction function for consistent security
    const { redactSensitiveValue } = require('../config/environment.js')
    sanitizedContext[key] =
      typeof redactSensitiveValue === 'function'
        ? redactSensitiveValue(key, value)
        : value
  })

  return sanitizedContext
}

// Enhanced utility functions for structured logging with ADHD data protection
export const logWithContext = {
  debug: (message: string, context: Record<string, unknown>) => {
    const correlationId = getCurrentCorrelationId()
    const sanitizedContext = sanitizeLogContext(context)

    logger.debug(message, {
      ...sanitizedContext,
      correlationId,
      timestamp: new Date().toISOString(),
    })
  },

  info: (message: string, context: Record<string, unknown>) => {
    const correlationId = getCurrentCorrelationId()
    const sanitizedContext = sanitizeLogContext(context)

    logger.info(message, {
      ...sanitizedContext,
      correlationId,
      timestamp: new Date().toISOString(),
    })
  },

  warn: (message: string, context: Record<string, unknown>) => {
    const correlationId = getCurrentCorrelationId()
    const sanitizedContext = sanitizeLogContext(context)

    logger.warn(message, {
      ...sanitizedContext,
      correlationId,
      timestamp: new Date().toISOString(),
    })
  },

  error: (message: string, context: Record<string, unknown>, error?: Error) => {
    const correlationId = getCurrentCorrelationId()
    const sanitizedContext = sanitizeLogContext(context)

    logger.error(message, {
      ...sanitizedContext,
      correlationId,
      timestamp: new Date().toISOString(),
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: config.isDevelopment
              ? error.stack
              : '[REDACTED_IN_PRODUCTION]',
          }
        : undefined,
    })
  },

  /**
   * Enhanced security logging for configuration errors
   * Uses secure config utilities to prevent data exposure
   */
  configError: (
    message: string,
    context?: Record<string, unknown>,
    error?: Error,
  ) => {
    const correlationId = getCurrentCorrelationId()
    const secureError = secureConfigUtils.createSecureConfigError(message, {
      ...context,
      correlationId,
    })

    logger.error('Configuration error detected', {
      message: secureError.message,
      correlationId,
      timestamp: new Date().toISOString(),
      debugContext: (
        secureError as Error & { debugContext?: Record<string, unknown> }
      ).debugContext,
      originalError: error
        ? {
            name: error.name,
            message: error.message,
            // Never log stack traces for config errors in production
            stack: config.isDevelopment
              ? error.stack
              : '[REDACTED_CONFIG_STACK]',
          }
        : undefined,
    })
  },

  /**
   * Security audit logging for ADHD data protection events
   */
  securityAudit: (event: string, context: Record<string, unknown>) => {
    const correlationId = getCurrentCorrelationId()
    const sanitizedContext = sanitizeLogContext(context)

    logger.info('Security audit event', {
      auditEvent: event,
      ...sanitizedContext,
      correlationId,
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
      security: 'ADHD_DATA_PROTECTION',
    })
  },
}
