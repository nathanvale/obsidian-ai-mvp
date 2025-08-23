import { createLogger, getCorrelationId, setCorrelationId, withCorrelationId } from '@orchestr8/logger';
import type { Logger } from 'pino';
import { config } from '../config/environment.js';

let loggerInstance: Logger | null = null;

export async function initializeLogger(): Promise<Logger> {
  if (loggerInstance) {
    return loggerInstance;
  }

  loggerInstance = await createLogger({
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
  const actualCorrelationId = correlationId || getCorrelationId();
  
  return baseLogger.child({ 
    correlationId: actualCorrelationId 
  });
};

// Execute operation with correlation context
export const executeWithCorrelation = async <T>(
  correlationId: string,
  operation: () => Promise<T>
): Promise<T> => {
  return await withCorrelationId(correlationId, operation);
};

// Generate and set new correlation ID
export const generateCorrelationId = (): string => {
  const correlationId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  setCorrelationId(correlationId);
  return correlationId;
};

// Get current correlation ID
export const getCurrentCorrelationId = (): string | undefined => {
  return getCorrelationId();
};

// Set correlation ID
export const setCurrentCorrelationId = (correlationId: string): void => {
  setCorrelationId(correlationId);
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
    (actualLogger as any)[prop] = value;
    return true;
  },
});

// Utility functions for structured logging with context
export const logWithContext = {
  debug: (context: Record<string, any>, message: string) => {
    const correlationId = getCorrelationId();
    logger.debug({
      ...context,
      correlationId,
      timestamp: new Date().toISOString(),
    }, message);
  },
  
  info: (context: Record<string, any>, message: string) => {
    const correlationId = getCorrelationId();
    logger.info({
      ...context,
      correlationId,
      timestamp: new Date().toISOString(),
    }, message);
  },
  
  warn: (context: Record<string, any>, message: string) => {
    const correlationId = getCorrelationId();
    logger.warn({
      ...context,
      correlationId,
      timestamp: new Date().toISOString(),
    }, message);
  },
  
  error: (context: Record<string, any>, message: string, error?: Error) => {
    const correlationId = getCorrelationId();
    logger.error({
      ...context,
      correlationId,
      timestamp: new Date().toISOString(),
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
    }, message);
  },
};