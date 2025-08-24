import { z } from 'zod';
import type { ResiliencePolicy } from '@orchestr8/schema';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('localhost'),
  OBSIDIAN_VAULT_PATH: z.string().optional(),
  CHROMADB_URL: z.string().default('http://localhost:8000'),
  OLLAMA_URL: z.string().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().default('nomic-embed-text'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),
  
  // CORS Configuration
  ALLOWED_ORIGINS: z.string().optional(),
  
  // Resilience Configuration - Ollama
  OLLAMA_RETRY_MAX_ATTEMPTS: z.coerce.number().default(3),
  OLLAMA_CIRCUIT_BREAKER_THRESHOLD: z.coerce.number().default(5),
  OLLAMA_TIMEOUT_DURATION: z.coerce.number().default(30000),
  
  // Resilience Configuration - ChromaDB
  CHROMADB_RETRY_MAX_ATTEMPTS: z.coerce.number().default(2),
  CHROMADB_CIRCUIT_BREAKER_THRESHOLD: z.coerce.number().default(3),
  CHROMADB_TIMEOUT_DURATION: z.coerce.number().default(10000),
  
  // Resilience Configuration - FileSystem
  FILESYSTEM_TIMEOUT_DURATION: z.coerce.number().default(5000),
  
  // Logger Configuration
  LOG_PRETTY: z.coerce.boolean().optional(),
  LOG_MAX_FIELD_SIZE: z.coerce.number().default(1000),
  
  // Security Configuration - Rate Limiting
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_SKIP_ON_SUCCESS: z.coerce.boolean().default(true),
  
  // Security Configuration - Request Timeout
  REQUEST_TIMEOUT_MS: z.coerce.number().default(30000),
  
  // Performance Configuration - Compression
  COMPRESSION_THRESHOLD: z.coerce.number().default(1024),
  COMPRESSION_QUALITY: z.coerce.number().min(1).max(9).default(6),
  
  // Performance Configuration - Back Pressure
  MAX_EVENT_LOOP_DELAY: z.coerce.number().default(1000),
  MAX_HEAP_USED_BYTES: z.coerce.number().default(100 * 1024 * 1024), // 100MB
  MAX_RSS_BYTES: z.coerce.number().default(300 * 1024 * 1024), // 300MB
});

const env = envSchema.parse(process.env);

export const config = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  host: env.HOST,
  obsidianVaultPath: env.OBSIDIAN_VAULT_PATH,
  chromaDbUrl: env.CHROMADB_URL,
  ollamaUrl: env.OLLAMA_URL,
  ollamaModel: env.OLLAMA_MODEL,
  logLevel: env.LOG_LEVEL,
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  
  // CORS Configuration
  allowedOrigins: env.ALLOWED_ORIGINS?.split(',').map(origin => origin.trim()) || 
    (env.NODE_ENV === 'development' 
      ? ['http://localhost:3000', 'http://127.0.0.1:3000'] 
      : []),
  
  // Logger Configuration
  logger: {
    level: env.LOG_LEVEL,
    pretty: env.LOG_PRETTY ?? env.NODE_ENV === 'development',
    redactKeys: ['apiKey', 'token', 'password', 'secret', 'authorization'],
    maxFieldSize: env.LOG_MAX_FIELD_SIZE,
  },
  
  // Security Configuration
  security: {
    rateLimit: {
      max: env.RATE_LIMIT_MAX,
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      skipOnSuccess: env.RATE_LIMIT_SKIP_ON_SUCCESS,
    },
    requestTimeout: env.REQUEST_TIMEOUT_MS,
  },
  
  // Performance Configuration
  performance: {
    compression: {
      threshold: env.COMPRESSION_THRESHOLD,
      quality: env.COMPRESSION_QUALITY,
    },
    backPressure: {
      maxEventLoopDelay: env.MAX_EVENT_LOOP_DELAY,
      maxHeapUsedBytes: env.MAX_HEAP_USED_BYTES,
      maxRssBytes: env.MAX_RSS_BYTES,
    },
  },
  
  // Resilience Policies
  resilience: {
    ollama: {
      retry: {
        maxAttempts: env.OLLAMA_RETRY_MAX_ATTEMPTS,
        initialDelay: 100,
        maxDelay: 5000,
        backoffStrategy: 'exponential' as const,
        jitterStrategy: 'full-jitter' as const,
      },
      circuitBreaker: {
        failureThreshold: env.OLLAMA_CIRCUIT_BREAKER_THRESHOLD,
        recoveryTime: 30000,
        sampleSize: 10,
        halfOpenPolicy: 'single-probe' as const,
      },
      timeout: env.OLLAMA_TIMEOUT_DURATION,
    } satisfies ResiliencePolicy,
    
    chromadb: {
      retry: {
        maxAttempts: env.CHROMADB_RETRY_MAX_ATTEMPTS,
        initialDelay: 500,
        maxDelay: 2000,
        backoffStrategy: 'fixed' as const,
        jitterStrategy: 'none' as const,
      },
      circuitBreaker: {
        failureThreshold: env.CHROMADB_CIRCUIT_BREAKER_THRESHOLD,
        recoveryTime: 20000,
        sampleSize: 8,
        halfOpenPolicy: 'single-probe' as const,
      },
      timeout: env.CHROMADB_TIMEOUT_DURATION,
    } satisfies ResiliencePolicy,
    
    filesystem: {
      timeout: env.FILESYSTEM_TIMEOUT_DURATION,
    } satisfies ResiliencePolicy,
  },
};