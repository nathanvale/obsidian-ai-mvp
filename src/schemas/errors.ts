/**
 * Error response schemas for consistent API error handling
 * Provides standardized error codes, stack trace handling, and ADHD-specific error categorization
 */

/**
 * Standardized error codes with consistent naming and prefixes
 * Format: {CATEGORY}_{SPECIFIC_ERROR} using UPPER_SNAKE_CASE
 */
export const ErrorCodes = {
  // Voice Processing Errors (VOICE_)
  VOICE_TRANSCRIPTION_FAILED: 'VOICE_TRANSCRIPTION_FAILED',
  VOICE_FILE_NOT_FOUND: 'VOICE_FILE_NOT_FOUND',
  VOICE_FILE_CORRUPTED: 'VOICE_FILE_CORRUPTED',
  VOICE_SERVICE_UNAVAILABLE: 'VOICE_SERVICE_UNAVAILABLE',
  VOICE_PROCESSING_TIMEOUT: 'VOICE_PROCESSING_TIMEOUT',
  VOICE_WHISPER_ERROR: 'VOICE_WHISPER_ERROR',
  VOICE_EMBEDDING_FAILED: 'VOICE_EMBEDDING_FAILED',

  // Search Errors (SEARCH_)
  SEARCH_QUERY_INVALID: 'SEARCH_QUERY_INVALID',
  SEARCH_CHROMADB_UNAVAILABLE: 'SEARCH_CHROMADB_UNAVAILABLE',
  SEARCH_EMBEDDING_FAILED: 'SEARCH_EMBEDDING_FAILED',
  SEARCH_COLLECTION_NOT_FOUND: 'SEARCH_COLLECTION_NOT_FOUND',
  SEARCH_TIMEOUT: 'SEARCH_TIMEOUT',
  SEARCH_QUERY_TOO_COMPLEX: 'SEARCH_QUERY_TOO_COMPLEX',
  SEARCH_NO_RESULTS: 'SEARCH_NO_RESULTS',

  // Email Processing Errors (EMAIL_)
  EMAIL_AUTH_FAILED: 'EMAIL_AUTH_FAILED',
  EMAIL_API_RATE_LIMIT: 'EMAIL_API_RATE_LIMIT',
  EMAIL_FETCH_FAILED: 'EMAIL_FETCH_FAILED',
  EMAIL_CLASSIFICATION_FAILED: 'EMAIL_CLASSIFICATION_FAILED',
  EMAIL_DEADLINE_EXTRACTION_FAILED: 'EMAIL_DEADLINE_EXTRACTION_FAILED',
  EMAIL_OAUTH_EXPIRED: 'EMAIL_OAUTH_EXPIRED',
  EMAIL_PERMISSION_DENIED: 'EMAIL_PERMISSION_DENIED',

  // Vault Access Errors (VAULT_)
  VAULT_PATH_INVALID: 'VAULT_PATH_INVALID',
  VAULT_PERMISSION_DENIED: 'VAULT_PERMISSION_DENIED',
  VAULT_FILE_NOT_FOUND: 'VAULT_FILE_NOT_FOUND',
  VAULT_OBSIDIAN_UNAVAILABLE: 'VAULT_OBSIDIAN_UNAVAILABLE',
  VAULT_SYNC_FAILED: 'VAULT_SYNC_FAILED',
  VAULT_BACKUP_FAILED: 'VAULT_BACKUP_FAILED',
  VAULT_CORRUPTION_DETECTED: 'VAULT_CORRUPTION_DETECTED',

  // Medication Tracking Errors (MED_)
  MED_SCHEDULE_INVALID: 'MED_SCHEDULE_INVALID',
  MED_TIME_TRACKING_FAILED: 'MED_TIME_TRACKING_FAILED',
  MED_REMINDER_FAILED: 'MED_REMINDER_FAILED',
  MED_DATA_SYNC_ERROR: 'MED_DATA_SYNC_ERROR',
  MED_HEALTH_INTEGRATION_FAILED: 'MED_HEALTH_INTEGRATION_FAILED',

  // Authentication Errors (AUTH_)
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_PERMISSION_DENIED: 'AUTH_PERMISSION_DENIED',
  AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  AUTH_CREDENTIAL_INVALID: 'AUTH_CREDENTIAL_INVALID',
  AUTH_OAUTH_CALLBACK_FAILED: 'AUTH_OAUTH_CALLBACK_FAILED',

  // Validation Errors (VALID_)
  VALID_REQUEST_MALFORMED: 'VALID_REQUEST_MALFORMED',
  VALID_FIELD_REQUIRED: 'VALID_FIELD_REQUIRED',
  VALID_FIELD_INVALID_FORMAT: 'VALID_FIELD_INVALID_FORMAT',
  VALID_FIELD_OUT_OF_RANGE: 'VALID_FIELD_OUT_OF_RANGE',
  VALID_SCHEMA_MISMATCH: 'VALID_SCHEMA_MISMATCH',
  VALID_JSON_PARSE_ERROR: 'VALID_JSON_PARSE_ERROR',

  // Service Errors (SVC_)
  SVC_OLLAMA_UNAVAILABLE: 'SVC_OLLAMA_UNAVAILABLE',
  SVC_CHROMADB_UNAVAILABLE: 'SVC_CHROMADB_UNAVAILABLE',
  SVC_WHISPER_UNAVAILABLE: 'SVC_WHISPER_UNAVAILABLE',
  SVC_INTERNAL_ERROR: 'SVC_INTERNAL_ERROR',
  SVC_TIMEOUT: 'SVC_TIMEOUT',
  SVC_CIRCUIT_BREAKER_OPEN: 'SVC_CIRCUIT_BREAKER_OPEN',
  SVC_DEPENDENCY_FAILED: 'SVC_DEPENDENCY_FAILED',

  // Rate Limiting Errors (RATE_)
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  RATE_QUOTA_EXHAUSTED: 'RATE_QUOTA_EXHAUSTED',
  RATE_BURST_LIMIT_HIT: 'RATE_BURST_LIMIT_HIT',
  RATE_IP_BLOCKED: 'RATE_IP_BLOCKED',

  // System Errors (SYS_)
  SYS_OUT_OF_MEMORY: 'SYS_OUT_OF_MEMORY',
  SYS_DISK_SPACE_LOW: 'SYS_DISK_SPACE_LOW',
  SYS_NETWORK_UNAVAILABLE: 'SYS_NETWORK_UNAVAILABLE',
  SYS_CONFIGURATION_ERROR: 'SYS_CONFIGURATION_ERROR',
  SYS_UNKNOWN_ERROR: 'SYS_UNKNOWN_ERROR',

  // Legacy codes for backward compatibility
  VALIDATION_ERROR: 'VALID_REQUEST_MALFORMED',
  INTERNAL_ERROR: 'SVC_INTERNAL_ERROR',
  CSP_REPORT_ERROR: 'SVC_SECURITY_VIOLATION',
} as const

/**
 * Error severity levels for prioritization and handling
 */
export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Stack trace handling policies
 */
export interface StackTraceOptions {
  include: boolean
  maxFrames: number
  sanitized: boolean
}

/**
 * Development vs Production stack trace policies
 */
export const StackTracePolicies = {
  development: {
    include: true,
    maxFrames: 20,
    sanitized: true,
  } as StackTraceOptions,
  production: {
    include: false,
    maxFrames: 0,
    sanitized: true,
  } as StackTraceOptions,
  testing: {
    include: true,
    maxFrames: 10,
    sanitized: false,
  } as StackTraceOptions,
} as const

/**
 * Error context metadata for comprehensive debugging
 */
export interface ErrorContext {
  correlationId: string
  timestamp: string
  severity: ErrorSeverity
  category: string
  retryPolicy?: {
    retryable: boolean
    maxAttempts?: number
    backoffMs?: number
  }
  troubleshootingHints: string[]
  relatedDocumentation?: string
}

/**
 * Enhanced error response schema with standardized structure and stack trace support
 */
export const ErrorResponseSchema = {
  type: 'object',
  required: ['success', 'error', 'correlationId', 'timestamp'],
  properties: {
    success: {
      type: 'boolean',
      const: false,
      description: 'Always false for error responses',
    },
    error: {
      type: 'object',
      required: ['message', 'statusCode', 'code', 'severity'],
      properties: {
        message: {
          type: 'string',
          minLength: 1,
          description: 'Human-readable ADHD-friendly error message',
        },
        statusCode: {
          type: 'integer',
          minimum: 400,
          maximum: 599,
          description: 'HTTP status code',
        },
        code: {
          type: 'string',
          pattern: '^[A-Z_]+$',
          description:
            'Standardized error code in UPPER_SNAKE_CASE format for programmatic handling',
        },
        severity: {
          type: 'string',
          enum: ['info', 'warning', 'error', 'critical'],
          description: 'Error severity level for prioritization',
        },
        category: {
          type: 'string',
          enum: [
            'voice_processing',
            'search',
            'email_processing',
            'vault_access',
            'medication_tracking',
            'authentication',
            'validation',
            'service_unavailable',
            'rate_limiting',
            'system',
            'security',
            'unknown',
          ],
          description: 'ADHD workflow error category',
        },
        userImpact: {
          type: 'string',
          description:
            'ADHD-friendly explanation of how this error affects the user workflow',
        },
        troubleshootingHints: {
          type: 'array',
          items: {
            type: 'string',
            minLength: 1,
          },
          minItems: 1,
          maxItems: 3,
          description:
            'Ordered list of helpful suggestions for resolving the error',
        },
        retryPolicy: {
          type: 'object',
          required: ['retryable'],
          properties: {
            retryable: {
              type: 'boolean',
              description: 'Whether the operation can be safely retried',
            },
            maxAttempts: {
              type: 'integer',
              minimum: 1,
              maximum: 5,
              description: 'Maximum number of retry attempts recommended',
            },
            backoffMs: {
              type: 'integer',
              minimum: 100,
              maximum: 60000,
              description: 'Recommended backoff time in milliseconds',
            },
          },
          description: 'Retry policy for this error type',
        },
        stackTrace: {
          type: 'object',
          properties: {
            frames: {
              type: 'array',
              items: {
                type: 'string',
              },
              maxItems: 20,
              description:
                'Sanitized stack trace frames (development/testing only)',
            },
            truncated: {
              type: 'boolean',
              description: 'Whether the stack trace was truncated for brevity',
            },
            sanitized: {
              type: 'boolean',
              description:
                'Whether sensitive information was removed from stack trace',
            },
          },
          description:
            'Optional stack trace information (only included in non-production environments)',
        },
        context: {
          type: 'object',
          properties: {
            adhdWorkflowType: {
              type: 'string',
              description: 'Type of ADHD workflow that was affected',
            },
            medicationHour: {
              type: 'integer',
              minimum: 0,
              maximum: 23,
              description:
                'Hour of day when error occurred (for medication cycle analysis)',
            },
            cognitiveLoadLevel: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'peak'],
              description: 'Current cognitive load level when error occurred',
            },
            relatedErrors: {
              type: 'array',
              items: {
                type: 'string',
              },
              maxItems: 5,
              description:
                'Correlation IDs of related errors in the same workflow',
            },
          },
          description:
            'ADHD-specific context for error analysis and optimization',
        },
        details: {
          type: 'object',
          description: 'Additional error details and metadata',
        },
        relatedDocumentation: {
          type: 'string',
          format: 'uri',
          description:
            'Link to relevant documentation or troubleshooting guide',
        },
      },
    },
    correlationId: {
      type: 'string',
      minLength: 1,
      description: 'Correlation ID for tracing requests across services',
    },
    timestamp: {
      type: 'string',
      format: 'date-time',
      description: 'ISO 8601 timestamp when error occurred',
    },
  },
} as const

/**
 * Enhanced validation error response schema with improved field-level details
 */
export const ValidationErrorResponseSchema = {
  type: 'object',
  required: ['success', 'error', 'correlationId', 'timestamp'],
  properties: {
    success: {
      type: 'boolean',
      const: false,
    },
    error: {
      type: 'object',
      required: ['message', 'statusCode', 'code', 'severity', 'validation'],
      properties: {
        message: {
          type: 'string',
          const: 'Request validation failed',
          description: 'Standard validation failure message',
        },
        statusCode: {
          type: 'integer',
          const: 400,
        },
        code: {
          type: 'string',
          const: 'VALID_REQUEST_MALFORMED',
          description: 'Standardized validation error code',
        },
        severity: {
          type: 'string',
          const: 'warning',
          description:
            'Validation errors are typically warnings that users can fix',
        },
        category: {
          type: 'string',
          const: 'validation',
        },
        userImpact: {
          type: 'string',
          description: 'ADHD-friendly explanation of validation failure impact',
        },
        troubleshootingHints: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'General troubleshooting hints for validation errors',
        },
        retryPolicy: {
          type: 'object',
          required: ['retryable'],
          properties: {
            retryable: {
              type: 'boolean',
              const: true,
              description:
                'Validation errors are always retryable after fixing input',
            },
            maxAttempts: {
              type: 'integer',
              const: 3,
            },
          },
        },
        validation: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            required: ['field', 'code', 'message'],
            properties: {
              field: {
                type: 'string',
                minLength: 1,
                description:
                  'Field path that failed validation (e.g., "user.email" or "items[0].name")',
              },
              code: {
                type: 'string',
                pattern: '^VALID_[A-Z_]+$',
                description: 'Specific validation error code for this field',
              },
              message: {
                type: 'string',
                minLength: 1,
                description: 'ADHD-friendly validation error message',
              },
              value: {
                description:
                  'The invalid value that was provided (sanitized for security)',
              },
              expectedFormat: {
                type: 'string',
                description:
                  'Description of the expected format or constraints',
              },
              suggestion: {
                type: 'string',
                description: 'Specific suggestion for fixing this field',
              },
            },
          },
          description:
            'Detailed validation failures for each problematic field',
        },
        context: {
          type: 'object',
          properties: {
            totalFieldsValidated: {
              type: 'integer',
              minimum: 1,
              description: 'Total number of fields that were validated',
            },
            failedFieldsCount: {
              type: 'integer',
              minimum: 1,
              description: 'Number of fields that failed validation',
            },
            validationSchema: {
              type: 'string',
              description: 'Name or identifier of the validation schema used',
            },
          },
          description: 'Additional context about the validation process',
        },
      },
    },
    correlationId: {
      type: 'string',
      minLength: 1,
    },
    timestamp: {
      type: 'string',
      format: 'date-time',
    },
  },
} as const

/**
 * Enhanced TypeScript interfaces for standardized error responses
 */

/**
 * Stack trace information with sanitization flags
 */
export interface StackTrace {
  frames: string[]
  truncated: boolean
  sanitized: boolean
}

/**
 * Retry policy information embedded in error responses
 */
export interface RetryPolicy {
  retryable: boolean
  maxAttempts?: number
  backoffMs?: number
}

/**
 * ADHD-specific context for error analysis
 */
export interface AdhdErrorContext {
  adhdWorkflowType?: string
  medicationHour?: number
  cognitiveLoadLevel?: 'low' | 'medium' | 'high' | 'peak'
  relatedErrors?: string[]
}

/**
 * Standardized error response interface with comprehensive error information
 */
export interface ErrorResponse {
  success: false
  error: {
    message: string
    statusCode: number
    code: string
    severity: ErrorSeverity
    category:
      | 'voice_processing'
      | 'search'
      | 'email_processing'
      | 'vault_access'
      | 'medication_tracking'
      | 'authentication'
      | 'validation'
      | 'service_unavailable'
      | 'rate_limiting'
      | 'system'
      | 'security'
      | 'unknown'
    userImpact: string
    troubleshootingHints: string[]
    retryPolicy: RetryPolicy
    stackTrace?: StackTrace
    context?: AdhdErrorContext
    details?: Record<string, unknown>
    relatedDocumentation?: string
  }
  correlationId: string
  timestamp: string
}

/**
 * Field-level validation error with enhanced details
 */
export interface ValidationFieldError {
  field: string
  code: string
  message: string
  value?: unknown
  expectedFormat?: string
  suggestion?: string
}

/**
 * Validation context with summary information
 */
export interface ValidationContext {
  totalFieldsValidated: number
  failedFieldsCount: number
  validationSchema?: string
}

/**
 * Enhanced validation error response with field-level details and ADHD-friendly messaging
 */
export interface ValidationErrorResponse {
  success: false
  error: {
    message: 'Request validation failed'
    statusCode: 400
    code: 'VALID_REQUEST_MALFORMED'
    severity: 'warning'
    category: 'validation'
    userImpact: string
    troubleshootingHints: string[]
    retryPolicy: RetryPolicy
    validation: ValidationFieldError[]
    context?: ValidationContext
  }
  correlationId: string
  timestamp: string
}

/**
 * ADHD-friendly error messages mapped to status codes
 * These messages prioritize clarity and actionable guidance over technical accuracy
 */
export const AdhdFriendlyMessages = {
  400: 'The information you provided needs to be corrected',
  401: 'You need to sign in to access this feature',
  403: "You don't have permission to access this",
  404: "This feature or page doesn't exist",
  405: "This action isn't allowed here",
  409: "There's a conflict with existing data",
  422: "The data provided can't be processed right now",
  429: "You're making requests too quickly - please slow down",
  500: 'Something went wrong on our end',
  502: 'The service is having connection issues',
  503: 'The service is temporarily unavailable',
  504: 'The request took too long to complete',
} as const

/**
 * Legacy error messages for backward compatibility
 * @deprecated Use AdhdFriendlyMessages instead
 */
export const ErrorMessages = {
  BAD_REQUEST: 'Bad request',
  UNAUTHORIZED: 'Unauthorized',
  FORBIDDEN: 'Forbidden',
  NOT_FOUND: 'Resource not found',
  METHOD_NOT_ALLOWED: 'Method not allowed',
  CONFLICT: 'Resource conflict',
  UNPROCESSABLE_ENTITY: 'Unprocessable entity',
  TOO_MANY_REQUESTS: 'Too many requests',
  INTERNAL_SERVER_ERROR: 'Internal server error',
  BAD_GATEWAY: 'Bad gateway',
  SERVICE_UNAVAILABLE: 'Service unavailable',
  GATEWAY_TIMEOUT: 'Gateway timeout',
} as const

/**
 * Error code to severity mapping for automatic classification
 */
export const ErrorCodeSeverityMap: Record<string, ErrorSeverity> = {
  // Critical errors that require immediate attention
  [ErrorCodes.VAULT_CORRUPTION_DETECTED]: ErrorSeverity.CRITICAL,
  [ErrorCodes.SYS_OUT_OF_MEMORY]: ErrorSeverity.CRITICAL,
  [ErrorCodes.SVC_INTERNAL_ERROR]: ErrorSeverity.CRITICAL,

  // High-priority errors that impact functionality
  [ErrorCodes.VOICE_SERVICE_UNAVAILABLE]: ErrorSeverity.ERROR,
  [ErrorCodes.SEARCH_CHROMADB_UNAVAILABLE]: ErrorSeverity.ERROR,
  [ErrorCodes.VAULT_OBSIDIAN_UNAVAILABLE]: ErrorSeverity.ERROR,
  [ErrorCodes.EMAIL_AUTH_FAILED]: ErrorSeverity.ERROR,
  [ErrorCodes.AUTH_SESSION_EXPIRED]: ErrorSeverity.ERROR,

  // Warning-level errors that users can typically resolve
  [ErrorCodes.VOICE_FILE_NOT_FOUND]: ErrorSeverity.WARNING,
  [ErrorCodes.SEARCH_NO_RESULTS]: ErrorSeverity.WARNING,
  [ErrorCodes.VALID_REQUEST_MALFORMED]: ErrorSeverity.WARNING,
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: ErrorSeverity.WARNING,
  [ErrorCodes.AUTH_TOKEN_EXPIRED]: ErrorSeverity.WARNING,

  // Informational errors that provide feedback
  [ErrorCodes.SEARCH_QUERY_TOO_COMPLEX]: ErrorSeverity.INFO,
  [ErrorCodes.EMAIL_API_RATE_LIMIT]: ErrorSeverity.INFO,
}

/**
 * Default troubleshooting hints for each error category
 */
export const CategoryTroubleshootingHints: Record<string, string[]> = {
  voice_processing: [
    'Check if the voice file is accessible and not corrupted',
    'Ensure Whisper service is running and responsive',
    'Try recording a shorter voice memo if the file is very long',
  ],
  search: [
    'Try using simpler search terms',
    'Check if ChromaDB service is running',
    'Verify your vault contains indexed content',
  ],
  email_processing: [
    'Check your internet connection',
    'Verify Gmail permissions and OAuth token',
    'Ensure your email account is accessible',
  ],
  vault_access: [
    'Check if Obsidian vault path is correct',
    'Verify file system permissions',
    'Ensure vault is not corrupted or locked',
  ],
  medication_tracking: [
    'Verify medication schedule configuration',
    'Check system time and timezone settings',
    'Ensure health app permissions if using integration',
  ],
  authentication: [
    'Try refreshing the page or signing in again',
    'Check if your session has expired',
    'Verify your credentials are correct',
  ],
  validation: [
    'Double-check all required fields are filled',
    "Verify the format matches what's expected",
    'Check for any special characters that might not be allowed',
  ],
  service_unavailable: [
    'Wait a few minutes and try again',
    'Check service status and connectivity',
    'Restart the application if the issue persists',
  ],
  rate_limiting: [
    'Wait a minute before making another request',
    'Reduce the frequency of your requests',
    "Check if you're hitting API limits",
  ],
  system: [
    'Check system resources and disk space',
    'Restart the application if needed',
    'Review system logs for additional details',
  ],
  security: [
    'Review security settings and permissions',
    'Check for suspicious activity',
    'Contact support if you believe this is a security issue',
  ],
  unknown: [
    'Try refreshing or restarting the application',
    'Check system logs for more details',
    'Contact support if the problem persists',
  ],
}

/**
 * Utility functions for error handling
 */
export class ErrorSchemaUtils {
  /**
   * Get error severity from error code
   */
  static getSeverity(errorCode: string): ErrorSeverity {
    return ErrorCodeSeverityMap[errorCode] || ErrorSeverity.ERROR
  }

  /**
   * Get troubleshooting hints for a category
   */
  static getTroubleshootingHints(category: string): string[] {
    return (
      CategoryTroubleshootingHints[category] ||
      CategoryTroubleshootingHints.unknown
    )
  }

  /**
   * Create standardized retry policy
   */
  static createRetryPolicy(
    retryable: boolean,
    maxAttempts = 3,
    backoffMs = 1000,
  ): RetryPolicy {
    return {
      retryable,
      ...(retryable && { maxAttempts, backoffMs }),
    }
  }

  /**
   * Validate error code format
   */
  static isValidErrorCode(code: string): boolean {
    return (
      /^[A-Z_]+$/.test(code) &&
      (Object.values(ErrorCodes) as string[]).includes(code)
    )
  }

  /**
   * Get ADHD-friendly message for status code
   */
  static getAdhdFriendlyMessage(statusCode: number): string {
    return (
      AdhdFriendlyMessages[statusCode as keyof typeof AdhdFriendlyMessages] ||
      'Something unexpected happened'
    )
  }

  /**
   * Create validation field error with suggestions
   */
  static createValidationFieldError(
    field: string,
    code: string,
    message: string,
    value?: unknown,
    expectedFormat?: string,
    suggestion?: string,
  ): ValidationFieldError {
    return {
      field,
      code,
      message,
      ...(value !== undefined && { value }),
      ...(expectedFormat && { expectedFormat }),
      ...(suggestion && { suggestion }),
    }
  }
}

/**
 * Type guards for error response interfaces
 */
export class ErrorTypeGuards {
  /**
   * Check if response is an error response
   */
  static isErrorResponse(response: unknown): response is ErrorResponse {
    return (
      typeof response === 'object' &&
      response !== null &&
      'success' in response &&
      response.success === false &&
      'error' in response &&
      'correlationId' in response &&
      'timestamp' in response
    )
  }

  /**
   * Check if response is a validation error response
   */
  static isValidationErrorResponse(
    response: unknown,
  ): response is ValidationErrorResponse {
    return (
      this.isErrorResponse(response) &&
      'validation' in response.error &&
      Array.isArray(response.error.validation)
    )
  }

  /**
   * Check if error has stack trace
   */
  static hasStackTrace(errorResponse: ErrorResponse): boolean {
    return !!errorResponse.error.stackTrace?.frames?.length
  }

  /**
   * Check if error is retryable
   */
  static isRetryable(errorResponse: ErrorResponse): boolean {
    return errorResponse.error.retryPolicy.retryable
  }

  /**
   * Check if error is critical severity
   */
  static isCritical(errorResponse: ErrorResponse): boolean {
    return errorResponse.error.severity === ErrorSeverity.CRITICAL
  }
}

/**
 * Enhanced error schema documentation for ADHD Digital Second Brain
 *
 * @fileoverview This module provides standardized error response schemas with:
 * - Consistent error code naming (UPPER_SNAKE_CASE with category prefixes)
 * - Stack trace handling with sanitization policies
 * - ADHD-specific error categorization and user-friendly messaging
 * - Comprehensive troubleshooting hints and retry policies
 * - Validation error details with field-level feedback
 *
 * Error Code Naming Convention:
 * - Format: {CATEGORY}_{SPECIFIC_ERROR}
 * - Categories: VOICE_, SEARCH_, EMAIL_, VAULT_, MED_, AUTH_, VALID_, SVC_, RATE_, SYS_
 * - All codes use UPPER_SNAKE_CASE formatting
 *
 * Stack Trace Policies:
 * - Development: Full stack traces with sanitization
 * - Production: No stack traces for security
 * - Testing: Limited stack traces without sanitization
 *
 * ADHD-Specific Features:
 * - Medication cycle context tracking
 * - Cognitive load level awareness
 * - Workflow-specific error categorization
 * - Clear, actionable troubleshooting guidance
 *
 * Integration with Error Handler:
 * - Error handler middleware uses these schemas for consistent formatting
 * - Automatic severity classification based on error codes
 * - Stack trace inclusion based on environment policies
 * - ADHD context extraction from request metadata
 *
 * @example
 * ```typescript
 * // Create a standardized error response
 * const errorResponse: ErrorResponse = {
 *   success: false,
 *   error: {
 *     message: 'Voice transcription service is temporarily unavailable',
 *     statusCode: 503,
 *     code: ErrorCodes.VOICE_SERVICE_UNAVAILABLE,
 *     severity: ErrorSeverity.ERROR,
 *     category: 'voice_processing',
 *     userImpact: 'Your voice memo couldn\'t be processed right now',
 *     troubleshootingHints: [
 *       'Wait a few minutes and try again',
 *       'Check if Whisper service is running'
 *     ],
 *     retryPolicy: {
 *       retryable: true,
 *       maxAttempts: 3,
 *       backoffMs: 2000
 *     }
 *   },
 *   correlationId: 'abc-123-def',
 *   timestamp: new Date().toISOString()
 * };
 * ```
 */
