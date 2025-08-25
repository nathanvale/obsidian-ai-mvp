import { z } from 'zod';
import type { ResiliencePolicy } from '@orchestr8/schema';

/**
 * Comprehensive secret patterns for ADHD Digital Second Brain
 * Protects medical data paths, API credentials, and sensitive configurations
 */
const SECRET_PATTERNS = [
  // Standard credential patterns
  /api[_-]?key/i,
  /secret/i,
  /password/i,
  /token/i,
  /auth/i,
  /credential/i,
  
  // ADHD-specific sensitive patterns
  /vault[_-]?path/i,
  /obsidian/i,
  /medical/i,
  /health/i,
  
  // Service configuration that could expose setup
  /url$/i,
  /endpoint/i,
  /connection/i,
  /database/i,
  
  // Personal information patterns
  /user/i,
  /home/i,
  /library/i,
] as const;

/**
 * Redacts sensitive information from any string value
 * Specifically designed for ADHD data protection
 */
function redactSensitiveValue(key: string, value: unknown): string {
  if (value == null) return '[undefined]';
  
  const stringValue = String(value);
  const keyLower = key.toLowerCase();
  
  // Check if key matches any secret pattern
  const isSecret = SECRET_PATTERNS.some(pattern => pattern.test(keyLower));
  
  if (isSecret) {
    // For paths, show only the pattern, not the actual path
    if (keyLower.includes('path')) {
      return '[REDACTED_PATH]';
    }
    
    // For URLs, show protocol and hostname only
    if (keyLower.includes('url') && stringValue.startsWith('http')) {
      try {
        const url = new URL(stringValue);
        return `${url.protocol}//${url.hostname}:[REDACTED]`;
      } catch {
        return '[REDACTED_URL]';
      }
    }
    
    // For other secrets, show length and type hint
    if (stringValue.length > 20) {
      return `[REDACTED_LONG_SECRET_${stringValue.length}_CHARS]`;
    } else if (stringValue.length > 8) {
      return `[REDACTED_SECRET_${stringValue.length}_CHARS]`;
    } else {
      return '[REDACTED_SECRET]';
    }
  }
  
  // Non-secret values - still check for potential personal info in paths
  if (typeof value === 'string' && (
    stringValue.includes('/Users/') ||
    stringValue.includes('/home/') ||
    stringValue.includes('\\Users\\') ||
    stringValue.includes('C:\\')
  )) {
    // Redact personal directory paths
    return stringValue.replace(
      /(\/Users\/[^\/]+|\/home\/[^\/]+|\\Users\\[^\\]+|C:\\Users\\[^\\]+)/gi,
      '/[USER_DIR]'
    );
  }
  
  return stringValue;
}

/**
 * Creates a safe representation of environment configuration for debugging
 * All sensitive values are redacted while preserving structure for troubleshooting
 */
export function createSafeEnvironmentDebugInfo(): Record<string, unknown> {
  const safeEnv: Record<string, unknown> = {};
  
  // Process each environment variable safely
  Object.keys(process.env).forEach(key => {
    const value = process.env[key];
    safeEnv[key] = redactSensitiveValue(key, value);
  });
  
  return {
    environment: safeEnv,
    detectedPatterns: SECRET_PATTERNS.map(p => p.source),
    securityNote: 'All sensitive values redacted for ADHD data protection',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Safe error formatter for environment validation failures
 * Ensures no sensitive data leaks through Zod error messages
 */
function createSafeConfigurationError(zodError: z.ZodError): Error {
  const safeIssues = zodError.issues.map(issue => ({
    path: issue.path.join('.'),
    code: issue.code,
    message: issue.message,
    // Never include the actual value that failed validation
    received: '[REDACTED_FOR_SECURITY]',
  }));
  
  const error = new Error('Environment configuration validation failed');
  (error as any).issues = safeIssues;
  (error as any).safeDebugInfo = createSafeEnvironmentDebugInfo();
  
  return error;
}

/**
 * Enhanced logger redaction configuration for ADHD data protection
 * Covers medical data paths, personal information, and service credentials
 */
export const ENHANCED_REDACT_KEYS = [
  // Standard security keys
  'apiKey', 'api_key', 'token', 'password', 'secret', 'authorization', 'auth',
  'credential', 'credentials', 'key', 'privateKey', 'private_key',
  
  // ADHD-specific sensitive keys  
  'obsidianVaultPath', 'obsidian_vault_path', 'OBSIDIAN_VAULT_PATH',
  'vaultPath', 'vault_path', 'medicalPath', 'medical_path',
  'healthPath', 'health_path', 'personalPath', 'personal_path',
  
  // Service configuration
  'chromaDbUrl', 'chromadb_url', 'CHROMADB_URL',
  'ollamaUrl', 'ollama_url', 'OLLAMA_URL',
  'databaseUrl', 'database_url', 'DATABASE_URL',
  'connectionString', 'connection_string', 'CONNECTION_STRING',
  
  // Personal identifiers that could appear in logs
  'username', 'user', 'userId', 'user_id', 'email', 'phone',
  'address', 'location', 'home', 'userDir', 'user_dir',
  
  // Nested object paths that might contain sensitive data
  'config.obsidianVaultPath', 'env.OBSIDIAN_VAULT_PATH',
  'process.env', 'environment', 'env',
] as const;

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('localhost'),
  OBSIDIAN_VAULT_PATH: z.string().optional(),
  CHROMADB_URL: z.string().default('http://localhost:8000'),
  OLLAMA_URL: z.string().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().default('nomic-embed-text'),
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error'])
    .default('info'),

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
  
  // Security Configuration - Content Security Policy
  CSP_ENABLED: z.coerce.boolean().default(true),
  CSP_REPORT_ONLY: z.coerce.boolean().optional(),
  
  // Security Configuration - Enhanced CORS
  CORS_VALIDATION_ENABLED: z.coerce.boolean().default(true),

  // Security Configuration - Request Timeout
  REQUEST_TIMEOUT_MS: z.coerce.number().default(30000),

  // Performance Configuration - Compression
  COMPRESSION_THRESHOLD: z.coerce.number().default(1024),
  COMPRESSION_QUALITY: z.coerce.number().min(1).max(9).default(6),

  // Performance Configuration - Back Pressure
  MAX_EVENT_LOOP_DELAY: z.coerce.number().default(1000),
  MAX_HEAP_USED_BYTES: z.coerce.number().default(100 * 1024 * 1024), // 100MB
  MAX_RSS_BYTES: z.coerce.number().default(300 * 1024 * 1024), // 300MB

  // Performance Configuration - Sampling
  PERFORMANCE_SAMPLING_ENABLED: z.coerce.boolean().default(true),
  PERFORMANCE_SAMPLING_RATE: z.coerce.number().default(10), // 1 in 10 requests
  PERFORMANCE_ADAPTIVE_SAMPLING: z.coerce.boolean().default(true),

  // Performance Configuration - Heap Monitoring
  HEAP_MONITORING_ENABLED: z.coerce.boolean().default(true),
  HEAP_WARNING_THRESHOLD_MB: z.coerce.number().default(150), // 150MB for M4 MacBook
  HEAP_CRITICAL_THRESHOLD_MB: z.coerce.number().default(300), // 300MB
  HEAP_GC_MONITORING: z.coerce.boolean().default(true),

  // Performance Configuration - ADHD Response Time Targets
  ADHD_OPTIMIZATIONS_ENABLED: z.coerce.boolean().default(true),
  ADHD_MEDICATION_CYCLE_TRACKING: z.coerce.boolean().default(true),
  ADHD_AI_WORKLOAD_MONITORING: z.coerce.boolean().default(true),
  ADHD_STANDARD_RESPONSE_TARGET_MS: z.coerce.number().default(2000), // 2s
  ADHD_AI_PROCESSING_TARGET_MS: z.coerce.number().default(5000), // 5s for AI
  ADHD_SEARCH_TARGET_MS: z.coerce.number().default(1000) // 1s for search
});

/**
 * Secure environment variable parsing with comprehensive error protection
 * Prevents sensitive data exposure through validation error messages
 */
let env: z.infer<typeof envSchema>;
try {
  env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    // Create secure error that doesn't expose actual environment values
    throw createSafeConfigurationError(error);
  }
  throw new Error('Critical environment configuration error - check your settings');
}

/**
 * Configuration security validation
 * Warns about insecure configurations that could expose ADHD data
 */
function validateConfigurationSecurity(parsedEnv: typeof env): void {
  const warnings: string[] = [];
  
  // Check for development settings in production
  if (parsedEnv.NODE_ENV === 'production') {
    if (parsedEnv.LOG_LEVEL === 'debug' || parsedEnv.LOG_LEVEL === 'trace') {
      warnings.push('Verbose logging enabled in production - may expose sensitive data');
    }
    
    if (parsedEnv.LOG_PRETTY === true) {
      warnings.push('Pretty logging enabled in production - disable for better security');
    }
  }
  
  // Validate Obsidian vault path security (if provided)
  if (parsedEnv.OBSIDIAN_VAULT_PATH) {
    const vaultPath = parsedEnv.OBSIDIAN_VAULT_PATH;
    
    // Check for obviously insecure paths
    if (vaultPath.includes('..') || vaultPath.includes('//')) {
      warnings.push('Potentially unsafe vault path - contains directory traversal patterns');
    }
    
    // Warn if vault path is in system directories (could be accidental)
    if (vaultPath.startsWith('/System/') || vaultPath.startsWith('/usr/') || 
        vaultPath.startsWith('/bin/') || vaultPath.startsWith('/etc/')) {
      warnings.push('Vault path in system directory - verify this is intentional');
    }
  }
  
  // Check service URLs for security
  const serviceUrls = {
    ChromaDB: parsedEnv.CHROMADB_URL,
    Ollama: parsedEnv.OLLAMA_URL,
  };
  
  Object.entries(serviceUrls).forEach(([service, url]) => {
    if (url.startsWith('http://') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
      warnings.push(`${service} URL uses HTTP instead of HTTPS for non-local connection`);
    }
  });
  
  // Log security warnings if any (using safe redaction)
  if (warnings.length > 0 && typeof console !== 'undefined') {
    console.warn('⚠️ Environment Security Warnings:');
    warnings.forEach(warning => console.warn(`  - ${warning}`));
    console.warn('Review your configuration for ADHD data protection compliance');
  }
}

// Perform security validation
validateConfigurationSecurity(env);

/**
 * Application configuration with enhanced security for ADHD data protection
 * All sensitive values are properly isolated and redacted in logging
 */
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
  allowedOrigins:
    env.ALLOWED_ORIGINS?.split(',').map(origin => origin.trim()) ||
    (env.NODE_ENV === 'development'
      ? ['http://localhost:3000', 'http://127.0.0.1:3000']
      : []),

  // Logger Configuration with Enhanced ADHD Data Protection
  logger: {
    level: env.LOG_LEVEL,
    pretty: env.LOG_PRETTY ?? env.NODE_ENV === 'development',
    redactKeys: [...ENHANCED_REDACT_KEYS],
    maxFieldSize: env.LOG_MAX_FIELD_SIZE,
    
    // Additional security serializers for ADHD data protection (if supported by logger)
    serializers: env.NODE_ENV === 'development' ? {
      // Custom serializer for environment objects to prevent accidental exposure
      env: () => '[REDACTED_ENVIRONMENT]',
      process: (value: any) => {
        if (value && value.env) {
          return { ...value, env: '[REDACTED_PROCESS_ENV]' };
        }
        return value;
      },
      
      // Custom serializer for configuration objects
      config: (configValue: any) => {
        if (typeof configValue === 'object' && configValue !== null) {
          const safeConfig: any = {};
          Object.keys(configValue).forEach(key => {
            safeConfig[key] = redactSensitiveValue(key, configValue[key]);
          });
          return safeConfig;
        }
        return configValue;
      },
    } : undefined, // Disable serializers in production for performance
  },

  // Security Configuration
  security: {
    rateLimit: {
      max: env.RATE_LIMIT_MAX,
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      skipOnSuccess: env.RATE_LIMIT_SKIP_ON_SUCCESS,
    },
    requestTimeout: env.REQUEST_TIMEOUT_MS,
    csp: {
      enabled: env.CSP_ENABLED,
      reportOnly: env.CSP_REPORT_ONLY ?? env.NODE_ENV === 'development',
    },
    cors: {
      validationEnabled: env.CORS_VALIDATION_ENABLED,
    },
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
    sampling: {
      enabled: env.PERFORMANCE_SAMPLING_ENABLED,
      rate: env.PERFORMANCE_SAMPLING_RATE,
      adaptiveSampling: env.PERFORMANCE_ADAPTIVE_SAMPLING,
      highPriorityPaths: [
        '/api/search',
        '/api/voice/transcribe',
        '/api/email/process',
        '/api/health',
      ],
    },
    heapMonitoring: {
      enabled: env.HEAP_MONITORING_ENABLED,
      warningThreshold: env.HEAP_WARNING_THRESHOLD_MB,
      criticalThreshold: env.HEAP_CRITICAL_THRESHOLD_MB,
      gcMonitoring: env.HEAP_GC_MONITORING,
    },
    adhdOptimizations: {
      enabled: env.ADHD_OPTIMIZATIONS_ENABLED,
      medicationCycleTracking: env.ADHD_MEDICATION_CYCLE_TRACKING,
      aiWorkloadMonitoring: env.ADHD_AI_WORKLOAD_MONITORING,
      responseTimeTargets: {
        standard: env.ADHD_STANDARD_RESPONSE_TARGET_MS,
        aiProcessing: env.ADHD_AI_PROCESSING_TARGET_MS,
        search: env.ADHD_SEARCH_TARGET_MS,
      },
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

/**
 * Safe configuration utilities for debugging and error reporting
 * Ensures no sensitive ADHD data is exposed in logs or error messages
 */
export const secureConfigUtils = {
  /**
   * Get a safe representation of the current configuration for debugging
   * All sensitive values are redacted while preserving structure
   */
  getSafeConfigForDebugging(): Record<string, unknown> {
    const safeConfig: Record<string, unknown> = {};
    
    Object.entries(config).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        // Handle nested configuration objects
        const safeNestedConfig: Record<string, unknown> = {};
        Object.entries(value).forEach(([nestedKey, nestedValue]) => {
          safeNestedConfig[nestedKey] = redactSensitiveValue(nestedKey, nestedValue);
        });
        safeConfig[key] = safeNestedConfig;
      } else {
        safeConfig[key] = redactSensitiveValue(key, value);
      }
    });
    
    return {
      config: safeConfig,
      environment: config.nodeEnv,
      timestamp: new Date().toISOString(),
      securityNote: 'All sensitive values redacted for ADHD data protection',
    };
  },

  /**
   * Create secure error message for configuration-related failures
   * Never exposes actual configuration values but provides debugging context
   */
  createSecureConfigError(
    message: string, 
    context?: Record<string, unknown>
  ): Error {
    const error = new Error(`Configuration Error: ${message}`);
    
    // Add safe debugging context without exposing secrets
    (error as any).debugContext = {
      nodeEnv: config.nodeEnv,
      timestamp: new Date().toISOString(),
      correlationId: context?.correlationId || 'config-error-' + Date.now(),
      safeContext: context ? 
        Object.fromEntries(
          Object.entries(context).map(([key, value]) => [
            key, 
            redactSensitiveValue(key, value)
          ])
        ) : {},
    };
    
    return error;
  },

  /**
   * Validate that critical ADHD data protection settings are configured
   * Returns array of security compliance issues
   */
  validateAdhdDataProtectionCompliance(): string[] {
    const issues: string[] = [];
    
    // Check that redaction is properly configured
    if (!config.logger.redactKeys.includes('obsidianVaultPath')) {
      issues.push('Obsidian vault path not included in log redaction keys');
    }
    
    if (!config.logger.redactKeys.includes('OBSIDIAN_VAULT_PATH')) {
      issues.push('Environment vault path not included in log redaction keys');
    }
    
    // Verify service URLs are not exposed
    const serviceUrlKeys = ['chromaDbUrl', 'ollamaUrl'];
    serviceUrlKeys.forEach(key => {
      if (!config.logger.redactKeys.some(redactKey => 
        redactKey.toLowerCase().includes(key.toLowerCase().replace('url', '')))) {
        issues.push(`Service URL key '${key}' may not be properly redacted`);
      }
    });
    
    // Check production security settings
    if (config.nodeEnv === 'production') {
      if (config.logger.level === 'debug' || config.logger.level === 'trace') {
        issues.push('Verbose logging enabled in production environment');
      }
      
      if (config.logger.pretty === true) {
        issues.push('Pretty logging enabled in production - may impact performance and security');
      }
    }
    
    return issues;
  },

  /**
   * Get environment health status with security compliance check
   */
  getSecureHealthStatus(): {
    status: 'healthy' | 'warning' | 'error';
    environment: string;
    complianceIssues: string[];
    timestamp: string;
  } {
    const complianceIssues = this.validateAdhdDataProtectionCompliance();
    
    let status: 'healthy' | 'warning' | 'error' = 'healthy';
    if (complianceIssues.length > 0) {
      status = complianceIssues.some(issue => 
        issue.includes('production') || issue.includes('redaction')
      ) ? 'error' : 'warning';
    }
    
    return {
      status,
      environment: config.nodeEnv,
      complianceIssues,
      timestamp: new Date().toISOString(),
    };
  },
};
