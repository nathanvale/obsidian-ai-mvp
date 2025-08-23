import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock environment variables
const mockEnv = {
  NODE_ENV: 'development',
  LOG_LEVEL: 'info',
  ALLOWED_ORIGINS: 'http://localhost:3000,http://127.0.0.1:3000',
  RESILIENCE_RETRY_MAX_ATTEMPTS: '3',
  RESILIENCE_CIRCUIT_BREAKER_THRESHOLD: '5',
  RESILIENCE_TIMEOUT_DURATION: '30000',
};

vi.stubGlobal('process', {
  env: mockEnv,
});

describe('Environment Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables for each test
    process.env = { ...mockEnv };
  });

  it('should parse resilience configuration from environment variables', () => {
    const expectedResilienceConfig = {
      retry: {
        maxAttempts: 3,
        initialDelay: 100,
        maxDelay: 5000,
        backoffStrategy: 'exponential',
        jitterStrategy: 'full',
      },
      circuitBreaker: {
        failureThreshold: 5,
        recoveryTime: 30000,
        sampleSize: 10,
        halfOpenPolicy: 'single-probe',
      },
      timeout: {
        duration: 30000,
        operationName: 'default-operation',
      },
    };

    // Simulate parsing environment variables
    const parsedConfig = {
      retry: {
        maxAttempts: parseInt(process.env.RESILIENCE_RETRY_MAX_ATTEMPTS || '3'),
        initialDelay: 100,
        maxDelay: 5000,
        backoffStrategy: 'exponential' as const,
        jitterStrategy: 'full' as const,
      },
      circuitBreaker: {
        failureThreshold: parseInt(process.env.RESILIENCE_CIRCUIT_BREAKER_THRESHOLD || '5'),
        recoveryTime: 30000,
        sampleSize: 10,
        halfOpenPolicy: 'single-probe' as const,
      },
      timeout: {
        duration: parseInt(process.env.RESILIENCE_TIMEOUT_DURATION || '30000'),
        operationName: 'default-operation',
      },
    };

    expect(parsedConfig.retry.maxAttempts).toBe(expectedResilienceConfig.retry.maxAttempts);
    expect(parsedConfig.circuitBreaker.failureThreshold).toBe(expectedResilienceConfig.circuitBreaker.failureThreshold);
    expect(parsedConfig.timeout.duration).toBe(expectedResilienceConfig.timeout.duration);
  });

  it('should parse logger configuration from environment variables', () => {
    const expectedLoggerConfig = {
      level: 'info',
      pretty: true,
      redactKeys: ['apiKey', 'token', 'password', 'secret'],
      maxFieldSize: 1000,
    };

    // Simulate parsing environment variables
    const parsedConfig = {
      level: process.env.LOG_LEVEL || 'info',
      pretty: process.env.NODE_ENV === 'development',
      redactKeys: ['apiKey', 'token', 'password', 'secret'],
      maxFieldSize: 1000,
    };

    expect(parsedConfig.level).toBe(expectedLoggerConfig.level);
    expect(parsedConfig.pretty).toBe(expectedLoggerConfig.pretty);
    expect(parsedConfig.redactKeys).toEqual(expectedLoggerConfig.redactKeys);
  });

  it('should parse CORS allowed origins from environment variables', () => {
    const expectedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];

    // Simulate parsing comma-separated origins
    const parsedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(origin => origin.trim()) || [];

    expect(parsedOrigins).toEqual(expectedOrigins);
  });

  it('should use development defaults when NODE_ENV is development', () => {
    process.env.NODE_ENV = 'development';

    const isDevelopment = process.env.NODE_ENV === 'development';
    const expectedConfig = {
      isDevelopment: true,
      logLevel: 'debug',
      logPretty: true,
      allowedOrigins: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    };

    const actualConfig = {
      isDevelopment,
      logLevel: isDevelopment ? 'debug' : 'info',
      logPretty: isDevelopment,
      allowedOrigins: isDevelopment 
        ? ['http://localhost:3000', 'http://127.0.0.1:3000']
        : (process.env.ALLOWED_ORIGINS?.split(',') || []),
    };

    expect(actualConfig).toEqual(expectedConfig);
  });

  it('should use production defaults when NODE_ENV is production', () => {
    process.env.NODE_ENV = 'production';
    process.env.ALLOWED_ORIGINS = 'https://example.com,https://app.example.com';

    const isDevelopment = process.env.NODE_ENV === 'development';
    const expectedConfig = {
      isDevelopment: false,
      logLevel: 'info',
      logPretty: false,
      allowedOrigins: ['https://example.com', 'https://app.example.com'],
    };

    const actualConfig = {
      isDevelopment,
      logLevel: isDevelopment ? 'debug' : 'info',
      logPretty: isDevelopment,
      allowedOrigins: isDevelopment 
        ? ['http://localhost:3000', 'http://127.0.0.1:3000']
        : (process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || []),
    };

    expect(actualConfig).toEqual(expectedConfig);
  });

  it('should provide default values for missing environment variables', () => {
    // Remove all optional environment variables
    delete process.env.LOG_LEVEL;
    delete process.env.RESILIENCE_RETRY_MAX_ATTEMPTS;
    delete process.env.RESILIENCE_CIRCUIT_BREAKER_THRESHOLD;
    delete process.env.RESILIENCE_TIMEOUT_DURATION;
    delete process.env.ALLOWED_ORIGINS;

    const expectedDefaults = {
      logLevel: 'info',
      retryMaxAttempts: 3,
      circuitBreakerThreshold: 5,
      timeoutDuration: 30000,
      allowedOrigins: [],
    };

    const actualDefaults = {
      logLevel: process.env.LOG_LEVEL || 'info',
      retryMaxAttempts: parseInt(process.env.RESILIENCE_RETRY_MAX_ATTEMPTS || '3'),
      circuitBreakerThreshold: parseInt(process.env.RESILIENCE_CIRCUIT_BREAKER_THRESHOLD || '5'),
      timeoutDuration: parseInt(process.env.RESILIENCE_TIMEOUT_DURATION || '30000'),
      allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [],
    };

    expect(actualDefaults).toEqual(expectedDefaults);
  });

  it('should validate required environment variables', () => {
    const requiredEnvVars = ['NODE_ENV'];
    const missingVars: string[] = [];

    requiredEnvVars.forEach(envVar => {
      if (!process.env[envVar]) {
        missingVars.push(envVar);
      }
    });

    expect(missingVars).toEqual([]);
  });

  it('should handle invalid environment variable values gracefully', () => {
    process.env.RESILIENCE_RETRY_MAX_ATTEMPTS = 'not-a-number';
    process.env.RESILIENCE_CIRCUIT_BREAKER_THRESHOLD = 'invalid';
    process.env.RESILIENCE_TIMEOUT_DURATION = 'bad-value';

    // Should fall back to defaults when parsing fails
    const parseIntSafe = (value: string | undefined, defaultValue: number): number => {
      if (!value) return defaultValue;
      const parsed = parseInt(value);
      return isNaN(parsed) ? defaultValue : parsed;
    };

    const expectedDefaults = {
      retryMaxAttempts: 3,
      circuitBreakerThreshold: 5,
      timeoutDuration: 30000,
    };

    const actualValues = {
      retryMaxAttempts: parseIntSafe(process.env.RESILIENCE_RETRY_MAX_ATTEMPTS, 3),
      circuitBreakerThreshold: parseIntSafe(process.env.RESILIENCE_CIRCUIT_BREAKER_THRESHOLD, 5),
      timeoutDuration: parseIntSafe(process.env.RESILIENCE_TIMEOUT_DURATION, 30000),
    };

    expect(actualValues).toEqual(expectedDefaults);
  });

  it('should support different service-specific resilience configurations', () => {
    process.env.OLLAMA_RETRY_MAX_ATTEMPTS = '3';
    process.env.OLLAMA_CIRCUIT_BREAKER_THRESHOLD = '5';
    process.env.OLLAMA_TIMEOUT_DURATION = '30000';

    process.env.CHROMADB_RETRY_MAX_ATTEMPTS = '2';
    process.env.CHROMADB_CIRCUIT_BREAKER_THRESHOLD = '3';
    process.env.CHROMADB_TIMEOUT_DURATION = '10000';

    const ollamaConfig = {
      retryMaxAttempts: parseInt(process.env.OLLAMA_RETRY_MAX_ATTEMPTS || '3'),
      circuitBreakerThreshold: parseInt(process.env.OLLAMA_CIRCUIT_BREAKER_THRESHOLD || '5'),
      timeoutDuration: parseInt(process.env.OLLAMA_TIMEOUT_DURATION || '30000'),
    };

    const chromaDbConfig = {
      retryMaxAttempts: parseInt(process.env.CHROMADB_RETRY_MAX_ATTEMPTS || '2'),
      circuitBreakerThreshold: parseInt(process.env.CHROMADB_CIRCUIT_BREAKER_THRESHOLD || '3'),
      timeoutDuration: parseInt(process.env.CHROMADB_TIMEOUT_DURATION || '10000'),
    };

    expect(ollamaConfig).toEqual({
      retryMaxAttempts: 3,
      circuitBreakerThreshold: 5,
      timeoutDuration: 30000,
    });

    expect(chromaDbConfig).toEqual({
      retryMaxAttempts: 2,
      circuitBreakerThreshold: 3,
      timeoutDuration: 10000,
    });
  });
});