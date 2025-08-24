import { createPinoLogger, CorrelationContext } from '@orchestr8/logger';
import type { Logger } from '@orchestr8/logger';
import { config } from '../config/environment.js';

let loggerInstance: Logger | null = null;

export async function initializeLogger(): Promise<Logger> {
  if (loggerInstance) {
    return loggerInstance;
  }

  loggerInstance = await createPinoLogger({
    level: config.logger.level,
    pretty: config.logger.pretty,
    redactKeys: config.logger.redactKeys,
    maxFieldSize: config.logger.maxFieldSize,
  });

  return loggerInstance;
}

export const getLogger = (): Logger => {
  if (!loggerInstance) {
    throw new Error('Logger not initialized. Call initializeLogger() first.');
  }
  return loggerInstance;
};

// Create logger with correlation context
export const createCorrelatedLogger = (correlationId?: string): Logger => {
  const baseLogger = getLogger();
  const actualCorrelationId = correlationId || getCurrentCorrelationId();
  
  return baseLogger.child({ 
    correlationId: actualCorrelationId 
  });
};

// Execute operation with correlation context
export const executeWithCorrelation = async <T>(
  correlationId: string,
  operation: () => Promise<T>
): Promise<T> => {
  return await CorrelationContext.run(correlationId, operation);
};

// Get current correlation ID - using context directly
export const getCurrentCorrelationId = (): string | undefined => {
  // Use CorrelationContext.get() to retrieve current correlation ID
  try {
    return CorrelationContext.get();
  } catch {
    return undefined;
  }
};

// Export logger instance for direct use (will be initialized during app startup)
export const logger: Logger = new Proxy({} as Logger, {
  get(target, prop) {
    const actualLogger = getLogger();
    const value = actualLogger[prop as keyof Logger];
    
    if (typeof value === 'function') {
      return value.bind(actualLogger);
    }
    return value;
  },
  set(target, prop, value) {
    const actualLogger = getLogger();
    (actualLogger as unknown as Record<string, unknown>)[prop as string] = value;
    return true;
  },
});

// Utility functions for structured logging with context
export const logWithContext = {
  debug: (message: string, context: Record<string, unknown>) => {
    const correlationId = getCurrentCorrelationId();
    logger.debug(message, {
      ...context,
      correlationId,
      timestamp: new Date().toISOString(),
    });
  },
  
  info: (message: string, context: Record<string, unknown>) => {
    const correlationId = getCurrentCorrelationId();
    logger.info(message, {
      ...context,
      correlationId,
      timestamp: new Date().toISOString(),
    });
  },
  
  warn: (message: string, context: Record<string, unknown>) => {
    const correlationId = getCurrentCorrelationId();
    logger.warn(message, {
      ...context,
      correlationId,
      timestamp: new Date().toISOString(),
    });
  },
  
  error: (message: string, context: Record<string, unknown>, error?: Error) => {
    const correlationId = getCurrentCorrelationId();
    logger.error(message, {
      ...context,
      correlationId,
      timestamp: new Date().toISOString(),
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
    });
  },
};