import { describe, it, expect, beforeEach, vi } from 'vitest';
import { config } from '../../../src/config/environment.js';

// Mock the @orchestr8/logger module completely
vi.mock('@orchestr8/logger', () => ({
  createLogger: vi.fn().mockResolvedValue({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    child: vi.fn().mockReturnValue({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    }),
    level: 'info',
  }),
  getCorrelationId: vi.fn().mockReturnValue('test-correlation-id'),
  setCorrelationId: vi.fn(),
  withCorrelationId: vi.fn().mockImplementation((id, fn) => fn()),
}));

describe('Logger Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct logger configuration', () => {
    expect(config.logger).toBeDefined();
    expect(config.logger.level).toBeDefined();
    expect(config.logger.pretty).toBeDefined();
    expect(config.logger.redactKeys).toEqual(['apiKey', 'token', 'password', 'secret', 'authorization']);
    expect(config.logger.maxFieldSize).toBe(1000);
  });

  it('should configure logger based on environment', () => {
    if (config.isDevelopment) {
      expect(config.logger.pretty).toBe(true);
    } else {
      expect(config.logger.pretty).toBe(false);
    }
  });

  it('should initialize logger with correct options', async () => {
    const { initializeLogger } = await import('../../../src/services/logger.js');
    const { createLogger } = await import('@orchestr8/logger');
    
    const logger = await initializeLogger();
    
    expect(createLogger).toHaveBeenCalledWith({
      level: config.logger.level,
      pretty: config.logger.pretty,
      redactKeys: config.logger.redactKeys,
      maxFieldSize: config.logger.maxFieldSize,
    });
    expect(logger).toBeDefined();
  });

  it('should provide correlation ID utilities', async () => {
    const { 
      generateCorrelationId, 
      getCurrentCorrelationId, 
      setCurrentCorrelationId 
    } = await import('../../../src/services/logger.js');
    
    const correlationId = generateCorrelationId();
    expect(typeof correlationId).toBe('string');
    expect(correlationId).toMatch(/^req-\d+-[a-z0-9]+$/);
    
    setCurrentCorrelationId('test-id');
    const currentId = getCurrentCorrelationId();
    expect(currentId).toBe('test-correlation-id'); // Mocked return value
  });

  it('should create correlated logger with context', async () => {
    const { createCorrelatedLogger } = await import('../../../src/services/logger.js');
    
    // First initialize the logger
    await import('../../../src/services/logger.js').then(m => m.initializeLogger());
    
    const correlatedLogger = createCorrelatedLogger('test-correlation');
    expect(correlatedLogger).toBeDefined();
  });

  it('should support structured logging with context', async () => {
    const { logWithContext } = await import('../../../src/services/logger.js');
    
    expect(typeof logWithContext.debug).toBe('function');
    expect(typeof logWithContext.info).toBe('function');
    expect(typeof logWithContext.warn).toBe('function');
    expect(typeof logWithContext.error).toBe('function');
    
    // These should not throw
    expect(() => {
      logWithContext.info({ test: 'context' }, 'test message');
      logWithContext.error({ test: 'context' }, 'test error', new Error('test'));
    }).not.toThrow();
  });

  it('should execute operations with correlation context', async () => {
    const { executeWithCorrelation } = await import('../../../src/services/logger.js');
    const { withCorrelationId } = await import('@orchestr8/logger');
    
    const mockOperation = vi.fn().mockResolvedValue('test-result');
    
    const result = await executeWithCorrelation('test-correlation', mockOperation);
    
    expect(withCorrelationId).toHaveBeenCalledWith('test-correlation', mockOperation);
    expect(result).toBe('test-result');
  });
});