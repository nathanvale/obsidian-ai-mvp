import type {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
  FastifyError,
} from 'fastify'
import fp from 'fastify-plugin'
import { generateCorrelationId } from '@orchestr8/logger'
import { getCurrentCorrelationId, logWithContext } from '../services/logger.js'
// ErrorResponse and ValidationErrorResponse types are redefined locally with ADHD enhancements
import type {
  ErrorWithStatus,
  FastifyRequestWithContext,
} from '../types/fastify.d.js'
// ErrorMessages not used - using context-aware ADHD-friendly messages instead

/**
 * ADHD-specific error categories for better user experience
 */
export enum AdhdErrorCategory {
  VOICE_PROCESSING = 'voice_processing',
  SEARCH = 'search',
  EMAIL_PROCESSING = 'email_processing',
  VAULT_ACCESS = 'vault_access',
  MEDICATION_TRACKING = 'medication_tracking',
  AUTHENTICATION = 'authentication',
  VALIDATION = 'validation',
  SERVICE_UNAVAILABLE = 'service_unavailable',
  RATE_LIMITING = 'rate_limiting',
  UNKNOWN = 'unknown',
}

/**
 * Enhanced error response with ADHD-friendly context
 */
interface EnhancedErrorResponse {
  success: false
  error: {
    message: string
    statusCode: number
    code?: string
    category: AdhdErrorCategory
    userImpact: string
    troubleshootingHint: string
    retryable: boolean
    details?: Record<string, unknown>
  }
  correlationId: string
  timestamp: string
}

/**
 * Enhanced validation error response with ADHD-friendly context
 */
interface EnhancedValidationErrorResponse {
  success: false
  error: {
    message: 'Validation failed'
    statusCode: 400
    code: 'VALIDATION_ERROR'
    category: AdhdErrorCategory
    userImpact: string
    troubleshootingHint: string
    retryable: boolean
    validation: Array<{
      field: string
      message: string
      value?: unknown
    }>
  }
  correlationId: string
  timestamp: string
}

/**
 * Error classification for ADHD workflows
 */
interface ErrorClassification {
  category: AdhdErrorCategory
  userImpact: string
  troubleshootingHint: string
  retryable: boolean
}

/**
 * Sanitized error context that removes sensitive ADHD data
 */
interface SanitizedErrorContext {
  method: string
  url: string
  statusCode: number
  userAgent?: string
  ip?: string
  requestId?: string
  adhdWorkflow?: boolean
  medicationHour?: number
}

export interface ErrorHandlerOptions {
  hideInternalErrors?: boolean
  includeStackTrace?: boolean
}

const defaultOptions: ErrorHandlerOptions = {
  hideInternalErrors: true,
  includeStackTrace: false,
}

/**
 * Centralized error handler plugin for consistent ADHD-optimized error responses
 *
 * Features:
 * - Consistent error serialization across all error types
 * - Correlation ID propagation throughout error handling chain
 * - ADHD-friendly error messages with clear impact and next steps
 * - Security-aware sanitization of sensitive data
 * - Structured logging integration with @orchestr8/logger
 * - Error categorization for ADHD workflow optimization
 *
 * @example
 * // Error response format:
 * {
 *   "success": false,
 *   "error": {
 *     "message": "Voice file processing failed",
 *     "statusCode": 503,
 *     "code": "SERVICE_UNAVAILABLE",
 *     "category": "voice_processing",
 *     "userImpact": "Your voice memo wasn't processed",
 *     "troubleshootingHint": "Try again in a few minutes or check if Whisper service is running",
 *     "retryable": true
 *   },
 *   "correlationId": "abc-123-def",
 *   "timestamp": "2025-08-24T10:30:00.000Z"
 * }
 */
async function errorHandlerPlugin(
  fastify: FastifyInstance,
  options: ErrorHandlerOptions = {},
) {
  const config = { ...defaultOptions, ...options }

  // Set up global error handler
  fastify.setErrorHandler(
    async (
      error: FastifyError,
      request: FastifyRequest,
      reply: FastifyReply,
    ) => {
      // Check if reply was already sent
      if (reply.sent) {
        return
      }

      // Get or generate correlation ID with fallback chain
      const correlationId = getCorrelationIdFromRequest(request)
      const timestamp = new Date().toISOString()

      // Create sanitized error context for logging
      const errorContext = createSanitizedErrorContext(request, error)

      // Classify error for ADHD workflow optimization
      const classification = classifyError(error, request)

      // Log the error with enhanced structured context
      logWithContext.error(
        `${classification.category.toUpperCase()} error occurred`,
        {
          ...errorContext,
          errorCategory: classification.category,
          retryable: classification.retryable,
          adhdWorkflowImpact: classification.userImpact,
        },
        error,
      )

      // Handle validation errors with enhanced ADHD-friendly messaging
      if (error.validation) {
        const enhancedValidationError = createEnhancedValidationError(
          error,
          correlationId,
          timestamp,
          classification,
        )

        reply.status(400)
        return enhancedValidationError
      }

      // Determine status code using consistent logic
      const statusCode = determineStatusCode(error)

      // Create enhanced error response with ADHD-optimized messaging
      const errorResponse = createEnhancedErrorResponse(
        error,
        statusCode,
        correlationId,
        timestamp,
        classification,
        config,
      )

      reply.status(statusCode)
      return errorResponse
    },
  )

  // Handle 404 Not Found for unmatched routes with enhanced context
  fastify.setNotFoundHandler(
    async (request: FastifyRequest, reply: FastifyReply) => {
      const correlationId = getCorrelationIdFromRequest(request)
      const timestamp = new Date().toISOString()
      const sanitizedContext = createSanitizedErrorContext(request)

      logWithContext.warn('Route not found', {
        ...sanitizedContext,
        errorCategory: AdhdErrorCategory.UNKNOWN,
      })

      const errorResponse: EnhancedErrorResponse = {
        success: false,
        error: {
          message: getAdhdFriendlyMessage(404),
          statusCode: 404,
          code: 'NOT_FOUND',
          category: AdhdErrorCategory.UNKNOWN,
          userImpact: "The feature you're trying to access doesn't exist",
          troubleshootingHint:
            'Check the URL or try accessing the feature from the main dashboard',
          retryable: false,
        },
        correlationId,
        timestamp,
      }

      reply.status(404)
      return errorResponse
    },
  )

  // Enhanced correlation ID management with context propagation
  fastify.addHook('preHandler', async (request: FastifyRequest) => {
    const existingCorrelationId = request.headers['x-correlation-id'] as string
    const requestCorrelationId = (request as FastifyRequestWithContext)
      .correlationId

    // Use existing correlation ID or generate new one
    const correlationId =
      existingCorrelationId || requestCorrelationId || generateCorrelationId()

    // Store correlation ID in request for error handling
    ;(request as FastifyRequestWithContext).correlationId = correlationId

    // Set correlation ID in response headers for client tracing
    const reply = (request as unknown as { reply?: FastifyReply }).reply
    if (reply && !reply.sent) {
      reply.header('x-correlation-id', correlationId)
    }
  })
}

/**
 * Get correlation ID from request with fallback chain
 */
function getCorrelationIdFromRequest(request: FastifyRequest): string {
  const headerCorrelationId = request.headers['x-correlation-id'] as string
  const requestCorrelationId = (request as FastifyRequestWithContext)
    .correlationId
  const contextCorrelationId = getCurrentCorrelationId()

  return (
    headerCorrelationId ||
    requestCorrelationId ||
    contextCorrelationId ||
    generateCorrelationId()
  )
}

/**
 * Create sanitized error context that removes sensitive ADHD data
 */
function createSanitizedErrorContext(
  request: FastifyRequest,
  error?: FastifyError,
): SanitizedErrorContext {
  const context: SanitizedErrorContext = {
    method: request.method,
    url: sanitizeUrl(request.url),
    statusCode: error?.statusCode || 500,
    userAgent: request.headers['user-agent'],
    ip: request.ip,
  }

  // Add ADHD workflow context if available (without sensitive data)
  const adhdPerformance = (
    request as unknown as {
      performance?: {
        isAdhdWorkflow(): boolean
        getAdhdContext(): { medicationHour?: number }
      }
    }
  ).performance
  if (adhdPerformance?.isAdhdWorkflow?.()) {
    context.adhdWorkflow = true
    const adhdContext = adhdPerformance.getAdhdContext?.()
    if (adhdContext?.medicationHour) {
      context.medicationHour = adhdContext.medicationHour
    }
  }

  return context
}

/**
 * Sanitize URL to remove sensitive query parameters and paths
 */
function sanitizeUrl(url: string): string {
  try {
    const urlObj = new URL(url, 'http://localhost')

    // Remove sensitive query parameters
    const sensitiveParams = [
      'token',
      'password',
      'secret',
      'key',
      'auth',
      'medication',
    ]
    sensitiveParams.forEach((param) => {
      if (urlObj.searchParams.has(param)) {
        urlObj.searchParams.set(param, '[REDACTED]')
      }
    })

    // Redact vault paths that might contain personal information
    let pathname = urlObj.pathname
    if (pathname.includes('/vault/') || pathname.includes('/notes/')) {
      pathname = pathname
        .replace(/\/vault\/[^/]+/g, '/vault/[REDACTED]')
        .replace(/\/notes\/[^/]+/g, '/notes/[REDACTED]')
    }

    return pathname + urlObj.search
  } catch {
    // If URL parsing fails, just redact the entire URL
    return '[REDACTED_URL]'
  }
}

/**
 * Classify error for ADHD workflow optimization
 */
function classifyError(
  error: FastifyError,
  request: FastifyRequest,
): ErrorClassification {
  const url = request.url
  const statusCode = error.statusCode || 500

  // Voice processing errors
  if (
    url.includes('/voice') ||
    url.includes('/transcribe') ||
    error.message.includes('whisper')
  ) {
    return {
      category: AdhdErrorCategory.VOICE_PROCESSING,
      userImpact: "Your voice memo couldn't be processed",
      troubleshootingHint:
        'Try recording again or check if the voice service is running',
      retryable: statusCode < 500,
    }
  }

  // Search functionality errors
  if (
    url.includes('/search') ||
    url.includes('/query') ||
    error.message.includes('chroma')
  ) {
    return {
      category: AdhdErrorCategory.SEARCH,
      userImpact: "Search isn't working right now",
      troubleshootingHint:
        'Try a simpler search term or check if the search service is available',
      retryable: true,
    }
  }

  // Email processing errors
  if (
    url.includes('/email') ||
    url.includes('/gmail') ||
    error.message.includes('gmail')
  ) {
    return {
      category: AdhdErrorCategory.EMAIL_PROCESSING,
      userImpact: 'Email processing is temporarily unavailable',
      troubleshootingHint:
        'Check your internet connection and Gmail permissions',
      retryable: true,
    }
  }

  // Vault access errors
  if (
    url.includes('/vault') ||
    url.includes('/obsidian') ||
    error.message.includes('vault')
  ) {
    return {
      category: AdhdErrorCategory.VAULT_ACCESS,
      userImpact: "Can't access your notes right now",
      troubleshootingHint:
        'Check if Obsidian vault path is correct and accessible',
      retryable: false,
    }
  }

  // Validation errors
  if (error.validation || statusCode === 400) {
    return {
      category: AdhdErrorCategory.VALIDATION,
      userImpact: 'The information you provided needs to be corrected',
      troubleshootingHint: 'Double-check the required fields and try again',
      retryable: true,
    }
  }

  // Authentication errors
  if (statusCode === 401 || statusCode === 403) {
    return {
      category: AdhdErrorCategory.AUTHENTICATION,
      userImpact: 'You need to sign in again',
      troubleshootingHint: 'Refresh the page or check your login credentials',
      retryable: true,
    }
  }

  // Rate limiting errors
  if (statusCode === 429) {
    return {
      category: AdhdErrorCategory.RATE_LIMITING,
      userImpact: "You're making requests too quickly",
      troubleshootingHint: 'Wait a minute before trying again',
      retryable: true,
    }
  }

  // Service unavailable errors
  if (statusCode >= 500) {
    return {
      category: AdhdErrorCategory.SERVICE_UNAVAILABLE,
      userImpact: 'The service is temporarily down',
      troubleshootingHint:
        'Try again in a few minutes, or check service status',
      retryable: true,
    }
  }

  // Default classification
  return {
    category: AdhdErrorCategory.UNKNOWN,
    userImpact: 'Something went wrong',
    troubleshootingHint:
      'Try refreshing or contact support if the problem persists',
    retryable: statusCode < 500,
  }
}

/**
 * Determine status code with consistent logic
 */
function determineStatusCode(error: FastifyError): number {
  return error.statusCode || (error as ErrorWithStatus).status || 500
}

/**
 * Get ADHD-friendly error message based on status code and context
 */
function getAdhdFriendlyMessage(statusCode: number): string {
  // Add context-specific messages for ADHD workflows
  const contextualMessages: Record<number, string> = {
    400: 'The request needs some corrections before we can process it',
    401: 'You need to sign in to access this feature',
    403: "You don't have permission to access this",
    404: "This feature or page doesn't exist",
    405: "This action isn't allowed here",
    409: "There's a conflict with existing data",
    422: "The data provided can't be processed",
    429: "You're making requests too quickly - please slow down",
    500: 'Something went wrong on our end',
    502: 'The service is having connection issues',
    503: 'The service is temporarily unavailable',
    504: 'The request took too long to complete',
  }

  return (
    contextualMessages[statusCode] ||
    (statusCode >= 500
      ? 'A server error occurred'
      : 'There was a problem with your request')
  )
}

/**
 * Create enhanced validation error response with ADHD-friendly messaging
 */
function createEnhancedValidationError(
  error: FastifyError,
  correlationId: string,
  timestamp: string,
  classification: ErrorClassification,
): EnhancedValidationErrorResponse {
  return {
    success: false,
    error: {
      message: 'Validation failed',
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      category: classification.category,
      userImpact: classification.userImpact,
      troubleshootingHint: classification.troubleshootingHint,
      retryable: classification.retryable,
      validation:
        error.validation?.map(
          (item: {
            instancePath?: string
            schemaPath?: string
            message?: string
            data?: unknown
          }) => ({
            field:
              item.instancePath?.replace('/', '') ||
              item.schemaPath ||
              'unknown',
            message: getValidationFieldMessage(item.message || 'Invalid value'),
            value: sanitizeValidationValue(item.data),
          }),
        ) || [],
    },
    correlationId,
    timestamp,
  }
}

/**
 * Create enhanced error response with ADHD optimization
 */
function createEnhancedErrorResponse(
  error: FastifyError,
  statusCode: number,
  correlationId: string,
  timestamp: string,
  classification: ErrorClassification,
  config: ErrorHandlerOptions & {
    hideInternalErrors?: boolean
    includeStackTrace?: boolean
  },
): EnhancedErrorResponse {
  // Get appropriate error message
  let message = getAdhdFriendlyMessage(statusCode)

  // For development or non-server errors, include original error message
  if (!config.hideInternalErrors || statusCode < 500) {
    message = error.message || message
  }

  const errorResponse: EnhancedErrorResponse = {
    success: false,
    error: {
      message,
      statusCode,
      code: error.code,
      category: classification.category,
      userImpact: classification.userImpact,
      troubleshootingHint: classification.troubleshootingHint,
      retryable: classification.retryable,
      ...(config.includeStackTrace &&
        error.stack && {
          details: {
            stack: sanitizeStackTrace(error.stack),
          },
        }),
    },
    correlationId,
    timestamp,
  }

  return errorResponse
}

/**
 * Get ADHD-friendly validation field messages
 */
function getValidationFieldMessage(originalMessage: string): string {
  const friendlyMessages: Record<string, string> = {
    'should be string': 'needs to be text',
    'should be number': 'needs to be a number',
    'should be boolean': 'should be true or false',
    'should be array': 'should be a list',
    'should be object': 'should be an object with properties',
    'is required': 'is required',
    'should NOT be empty': "can't be empty",
    'should match pattern': 'format is incorrect',
    'should be equal to one of the allowed values':
      'must be one of the allowed options',
  }

  for (const [pattern, friendly] of Object.entries(friendlyMessages)) {
    if (originalMessage.includes(pattern)) {
      return friendly
    }
  }

  return originalMessage
}

/**
 * Sanitize validation values to prevent sensitive data exposure
 */
function sanitizeValidationValue(value: unknown): unknown {
  if (typeof value === 'string') {
    // Redact sensitive patterns
    const sensitivePatterns = [
      /token/i,
      /password/i,
      /secret/i,
      /key/i,
      /auth/i,
      /medication/i,
      /personal/i,
    ]

    const strValue = value.toString()
    for (const pattern of sensitivePatterns) {
      if (pattern.test(strValue)) {
        return '[REDACTED]'
      }
    }
  }

  return value
}

/**
 * Sanitize stack trace to remove sensitive paths and information
 */
function sanitizeStackTrace(stack: string): string {
  return (
    stack
      // Remove file paths that might contain usernames or sensitive info
      .replace(/\/Users\/[^/]+/g, '/Users/[USER]')
      .replace(/\/home\/[^/]+/g, '/home/[USER]')
      .replace(/C:\\Users\\[^\\]+/g, 'C:\\Users\\[USER]')
      // Remove potential vault paths
      .replace(/\/[^/]*vault[^/]*\/[^/]+/gi, '/[VAULT]/[PATH]')
      // Limit stack trace length for readability
      .split('\n')
      .slice(0, 10)
      .join('\n')
  )
}

export default fp(errorHandlerPlugin, {
  name: 'error-handler',
  fastify: '4.x',
})
