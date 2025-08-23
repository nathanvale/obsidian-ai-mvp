import { describe, it, expect, beforeEach, vi } from 'vitest';
import { config } from '../../../src/config/environment.js';

// Mock the @orchestr8/resilience module completely
vi.mock('@orchestr8/resilience', () => {
  const mockAdapter = {
    applyNormalizedPolicy: vi.fn(),
    dispose: vi.fn(),
    circuitBreakerObserver: vi.fn(),
  };
  
  return {
    ProductionResilienceAdapter: vi.fn().mockImplementation(() => mockAdapter),
  };
});

// Mock the logger service
vi.mock('../../../src/services/logger.js', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('ResilienceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct Ollama resilience policy configuration', () => {
    expect(config.resilience.ollama).toBeDefined();
    expect(config.resilience.ollama.retry?.maxAttempts).toBe(3);
    expect(config.resilience.ollama.retry?.backoffStrategy).toBe('exponential');
    expect(config.resilience.ollama.circuitBreaker?.failureThreshold).toBe(5);
    expect(config.resilience.ollama.timeout?.duration).toBe(30000);
  });

  it('should have correct ChromaDB resilience policy configuration', () => {
    expect(config.resilience.chromadb).toBeDefined();
    expect(config.resilience.chromadb.retry?.maxAttempts).toBe(2);
    expect(config.resilience.chromadb.retry?.backoffStrategy).toBe('fixed');
    expect(config.resilience.chromadb.circuitBreaker?.failureThreshold).toBe(3);
    expect(config.resilience.chromadb.timeout?.duration).toBe(10000);
  });

  it('should have correct FileSystem resilience policy configuration', () => {
    expect(config.resilience.filesystem).toBeDefined();
    expect(config.resilience.filesystem.timeout?.duration).toBe(5000);
    expect(config.resilience.filesystem.retry).toBeUndefined();
    expect(config.resilience.filesystem.circuitBreaker).toBeUndefined();
  });

  it('should create resilience service instance', async () => {
    // Dynamic import to test the service
    const { ResilienceService } = await import('../../../src/services/resilience.js');
    
    const instance1 = ResilienceService.getInstance();
    const instance2 = ResilienceService.getInstance();
    
    expect(instance1).toBe(instance2); // Singleton pattern
    expect(instance1).toBeDefined();
  });

  it('should have required methods for policy application', async () => {
    const { ResilienceService } = await import('../../../src/services/resilience.js');
    const service = ResilienceService.getInstance();
    
    expect(typeof service.applyOllamaPolicy).toBe('function');
    expect(typeof service.applyChromaDbPolicy).toBe('function');
    expect(typeof service.applyFileSystemPolicy).toBe('function');
    expect(typeof service.applyCustomPolicy).toBe('function');
    expect(typeof service.dispose).toBe('function');
  });

  it('should support AbortSignal in policy methods', async () => {
    const { ResilienceService } = await import('../../../src/services/resilience.js');
    const service = ResilienceService.getInstance();
    
    const mockOperation = vi.fn().mockResolvedValue('test-result');
    const controller = new AbortController();
    const signal = controller.signal;

    // These should not throw and should accept AbortSignal
    await expect(service.applyOllamaPolicy(mockOperation, signal)).resolves.toBeDefined();
    await expect(service.applyChromaDbPolicy(mockOperation, signal)).resolves.toBeDefined();
    await expect(service.applyFileSystemPolicy(mockOperation, signal)).resolves.toBeDefined();
  });
});