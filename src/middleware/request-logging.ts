import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import fp from 'fastify-plugin'
import { generateCorrelationId } from '@orchestr8/logger'
import { executeWithCorrelation, logWithContext } from '../services/logger.js'
import type {
  FastifyRequestWithContext,
  GenericObject,
} from '../types/fastify.js'

export interface RequestLoggingOptions {
  logRequestBody?: boolean
  logResponseBody?: boolean
  maxBodySize?: number
  excludePaths?: string[]
  logHeaders?: boolean
  enablePIIRedaction?: boolean
  maxLogLength?: number
}

// PII patterns for detection and redaction
const PII_PATTERNS = {
  // Email addresses
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  // Phone numbers (various formats)
  PHONE: /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g,
  // Credit card numbers
  CREDIT_CARD: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  // Social Security Numbers
  SSN: /\b\d{3}-?\d{2}-?\d{4}\b/g,
  // IP addresses (for privacy)
  IP_ADDRESS: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
  // File paths that might contain usernames
  FILE_PATH: /\/(?:Users|home|Documents)\/[^/\s]+/g,
}

// ADHD and medical-specific patterns
const MEDICAL_PATTERNS = {
  // Common ADHD medications
  ADHD_MEDS:
    /\b(?:adderall|ritalin|concerta|vyvanse|strattera|wellbutrin|focalin|daytrana|quillivant|methylphenidate|amphetamine|dextroamphetamine|lisdexamfetamine|atomoxetine|bupropion|guanfacine|clonidine|intuniv|kapvay)\b/gi,
  // Medical terms and symptoms
  SYMPTOMS:
    /\b(?:inattention|hyperactivity|impulsivity|executive function|working memory|hyperfocus|rejection sensitive dysphoria|rsd|stimming|fidgeting|procrastination|time blindness|emotional dysregulation)\b/gi,
  // Dosage information
  DOSAGE:
    /\b\d+\s*(?:mg|milligram|milligrams|ml|milliliter|milliliters|cc|tablet|tablets|pill|pills|dose|doses)\b/gi,
  // Medical appointment types
  APPOINTMENTS:
    /\b(?:psychiatrist|psychologist|therapist|counselor|doctor|physician|neurologist|psychopharmacologist|adhd specialist)\b/gi,
}

// Sensitive headers that should be redacted
const SENSITIVE_HEADERS = [
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-auth-token',
  'x-session-id',
  'x-csrf-token',
  'x-xsrf-token',
  'authentication',
  'proxy-authorization',
]

// Log injection patterns
const LOG_INJECTION_PATTERNS = {
  // ANSI escape codes
  // eslint-disable-next-line no-control-regex
  ANSI_ESCAPE: /\x1b\[[0-9;]*[a-zA-Z]/g,
  // Control characters
  // eslint-disable-next-line no-control-regex
  CONTROL_CHARS: /[\x00-\x1f\x7f-\x9f]/g,
  // Log format injection attempts
  LOG_FORMAT_INJECTION: /(?:\r|\n|\t|\\r|\\n|\\t|%0d|%0a|%09)/g,
}

const defaultOptions: RequestLoggingOptions = {
  logRequestBody: false,
  logResponseBody: false,
  maxBodySize: 1000,
  excludePaths: ['/health'],
  logHeaders: true,
  enablePIIRedaction: true,
  maxLogLength: 2000,
}

/**
 * Sanitize string to prevent log injection attacks and remove control characters.
 * Protects against ANSI escape codes, control characters, and log format injection.
 *
 * @param input - The string to sanitize
 * @param maxLength - Maximum length before truncation (default: 2000)
 * @returns Sanitized string safe for logging
 */
function preventLogInjection(input: string, maxLength: number = 2000): string {
  if (!input || typeof input !== 'string') {
    return String(input || '')
  }

  let sanitized = input

  // Remove ANSI escape codes
  sanitized = sanitized.replace(LOG_INJECTION_PATTERNS.ANSI_ESCAPE, '')

  // Remove control characters
  sanitized = sanitized.replace(LOG_INJECTION_PATTERNS.CONTROL_CHARS, '')

  // Remove log format injection attempts
  sanitized = sanitized.replace(
    LOG_INJECTION_PATTERNS.LOG_FORMAT_INJECTION,
    ' ',
  )

  // Limit length to prevent log flooding
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + '...[TRUNCATED]'
  }

  return sanitized
}

/**
 * Redact personally identifiable information (PII) from text using comprehensive patterns.
 * Removes emails, phone numbers, credit cards, SSNs, IP addresses, and file paths.
 *
 * @param text - The text to sanitize
 * @returns Text with PII redacted using placeholder tokens
 */
function redactPII(text: string): string {
  if (!text || typeof text !== 'string') {
    return String(text || '')
  }

  let redacted = text

  // Redact email addresses
  redacted = redacted.replace(PII_PATTERNS.EMAIL, '[EMAIL_REDACTED]')

  // Redact phone numbers
  redacted = redacted.replace(PII_PATTERNS.PHONE, '[PHONE_REDACTED]')

  // Redact credit card numbers
  redacted = redacted.replace(PII_PATTERNS.CREDIT_CARD, '[CC_REDACTED]')

  // Redact SSNs
  redacted = redacted.replace(PII_PATTERNS.SSN, '[SSN_REDACTED]')

  // Redact IP addresses for privacy
  redacted = redacted.replace(PII_PATTERNS.IP_ADDRESS, '[IP_REDACTED]')

  // Redact file paths that might contain usernames
  redacted = redacted.replace(PII_PATTERNS.FILE_PATH, '/[USER_PATH_REDACTED]')

  return redacted
}

/**
 * Redact ADHD and medical-specific sensitive data from text.
 * Protects medication names, symptoms, dosages, and healthcare provider references.
 * Critical for ADHD users who may include sensitive medical information in voice memos.
 *
 * @param text - The text to sanitize
 * @returns Text with medical/ADHD sensitive data redacted
 */
function redactMedicalData(text: string): string {
  if (!text || typeof text !== 'string') {
    return String(text || '')
  }

  let redacted = text

  // Redact ADHD medication names
  redacted = redacted.replace(
    MEDICAL_PATTERNS.ADHD_MEDS,
    '[MEDICATION_REDACTED]',
  )

  // Redact medical symptoms and terms
  redacted = redacted.replace(MEDICAL_PATTERNS.SYMPTOMS, '[SYMPTOM_REDACTED]')

  // Redact dosage information
  redacted = redacted.replace(MEDICAL_PATTERNS.DOSAGE, '[DOSAGE_REDACTED]')

  // Redact appointment types
  redacted = redacted.replace(
    MEDICAL_PATTERNS.APPOINTMENTS,
    '[PROVIDER_REDACTED]',
  )

  return redacted
}

/**
 * Comprehensive sanitization for logging that protects ADHD user privacy
 */
function sanitizeForLogging(
  input: unknown,
  maxLength: number = 2000,
): string | Record<string, unknown> | unknown[] | unknown {
  if (input === null || input === undefined) {
    return input
  }

  if (typeof input === 'string') {
    let sanitized = input

    // Apply PII redaction
    sanitized = redactPII(sanitized)

    // Apply medical data redaction
    sanitized = redactMedicalData(sanitized)

    // Apply log injection protection
    sanitized = preventLogInjection(sanitized, maxLength)

    return sanitized
  }

  if (typeof input === 'object') {
    if (Array.isArray(input)) {
      return input.map((item) => sanitizeForLogging(item, maxLength))
    }

    const sanitized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(input)) {
      // Sanitize both keys and values
      const sanitizedKey = sanitizeForLogging(key, 100) // Shorter limit for keys
      sanitized[String(sanitizedKey)] = sanitizeForLogging(value, maxLength)
    }
    return sanitized
  }

  // For primitives (numbers, booleans), convert to string and sanitize
  return sanitizeForLogging(String(input), maxLength)
}

/**
 * Sanitize HTTP headers with comprehensive security filtering
 */
function sanitizeHeaders(
  headers: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const sanitized: Record<string, string> = {}

  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase()

    // Redact sensitive headers entirely
    if (SENSITIVE_HEADERS.includes(lowerKey)) {
      sanitized[key] = '[REDACTED]'
      continue
    }

    // For non-sensitive headers, apply general sanitization
    if (value) {
      const sanitizedValue = sanitizeForLogging(value, 500) // Shorter limit for headers
      sanitized[key] =
        typeof sanitizedValue === 'string'
          ? sanitizedValue
          : String(sanitizedValue)
    }
  }

  return sanitized
}

/**
 * Sanitize request/response body with special handling for ADHD-sensitive content
 */
function sanitizeBody(body: unknown, maxSize: number): string {
  if (!body) {
    return '[EMPTY_BODY]'
  }

  try {
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body)

    // Apply comprehensive sanitization
    const sanitized = sanitizeForLogging(bodyStr, maxSize)
    const sanitizedStr =
      typeof sanitized === 'string' ? sanitized : String(sanitized)

    // If the sanitized body is still too long, truncate safely
    if (sanitizedStr.length > maxSize) {
      return sanitizedStr.substring(0, maxSize) + '...[TRUNCATED_FOR_PRIVACY]'
    }

    return sanitizedStr
  } catch (error) {
    logWithContext.warn('Body serialization failed', { error })
    return '[BODY_SERIALIZATION_ERROR]'
  }
}

/**
 * Create a privacy-safe representation of an IP address
 */
function sanitizeIPAddress(ip: string): string {
  if (!ip || typeof ip !== 'string') {
    return '[NO_IP]'
  }

  // For IPv4, show only first two octets for privacy
  const ipv4Match = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (ipv4Match) {
    return `${ipv4Match[1]}.${ipv4Match[2]}.*.* (IPv4)`
  }

  // For IPv6, show only prefix for privacy
  if (ip.includes(':')) {
    const parts = ip.split(':')
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}:*:*:*:*:*:* (IPv6)`
    }
  }

  // For other formats, completely redact
  return '[IP_REDACTED]'
}

/**
 * Request/Response logging middleware that integrates with @orchestr8/logger
 * Provides correlation ID tracking and structured request logging with comprehensive
 * PII redaction and ADHD-specific data protection
 */
async function requestLoggingPlugin(
  fastify: FastifyInstance,
  options: RequestLoggingOptions = {},
) {
  const config = { ...defaultOptions, ...options }

  // Pre-handler: Set up correlation context and log incoming request
  fastify.addHook(
    'preHandler',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const startTime = Date.now()

      // Get or generate correlation ID
      const existingCorrelationId = request.headers[
        'x-correlation-id'
      ] as string
      const correlationId = existingCorrelationId || generateCorrelationId()

      // Store correlation ID and start time in request
      ;(request as FastifyRequestWithContext).correlationId = correlationId
      ;(request as FastifyRequestWithContext).startTime = startTime

      // Add correlation ID to response headers
      reply.header('x-correlation-id', correlationId)

      // Skip logging for excluded paths
      if (config.excludePaths?.includes(request.url)) {
        return
      }

      // Execute in correlation context and log request
      await executeWithCorrelation(correlationId, async () => {
        const logData: GenericObject = {
          method: request.method,
          url: config.enablePIIRedaction
            ? sanitizeForLogging(request.url, 500)
            : request.url,
          userAgent: config.enablePIIRedaction
            ? sanitizeForLogging(request.headers['user-agent'], 200)
            : request.headers['user-agent'],
          ip: config.enablePIIRedaction
            ? sanitizeIPAddress(request.ip)
            : request.ip,
          contentLength: request.headers['content-length'],
        }

        // Include headers if configured with comprehensive sanitization
        if (config.logHeaders) {
          logData.headers = config.enablePIIRedaction
            ? sanitizeHeaders(request.headers)
            : {
                authorization: request.headers.authorization
                  ? '[REDACTED]'
                  : undefined,
                'content-type': request.headers['content-type'],
                'user-agent': request.headers['user-agent'],
                'x-forwarded-for': request.headers['x-forwarded-for'],
              }
        }

        // Include request body if configured with comprehensive sanitization
        if (config.logRequestBody && request.body) {
          if (config.enablePIIRedaction) {
            logData.requestBody = sanitizeBody(
              request.body,
              config.maxBodySize!,
            )
          } else {
            const bodyStr = JSON.stringify(request.body)
            logData.requestBody =
              bodyStr.length > config.maxBodySize!
                ? bodyStr.substring(0, config.maxBodySize!) + '...[TRUNCATED]'
                : bodyStr
          }
        }

        logWithContext.info('Incoming HTTP request', logData)
      })
    },
  )

  // Pre-serialization: Log response details before sending
  fastify.addHook(
    'preSerialization',
    async (request: FastifyRequest, reply: FastifyReply, payload: unknown) => {
      const correlationId = (request as FastifyRequestWithContext).correlationId
      const startTime = (request as FastifyRequestWithContext).startTime

      if (!correlationId || config.excludePaths?.includes(request.url)) {
        return payload
      }

      await executeWithCorrelation(correlationId, async () => {
        const duration = startTime ? Date.now() - startTime : 0

        const logData: GenericObject = {
          method: request.method,
          url: config.enablePIIRedaction
            ? sanitizeForLogging(request.url, 500)
            : request.url,
          statusCode: reply.statusCode,
          duration,
          contentLength: reply.getHeader('content-length'),
        }

        // Include response body if configured with comprehensive sanitization
        if (config.logResponseBody && payload) {
          if (config.enablePIIRedaction) {
            logData.responseBody = sanitizeBody(payload, config.maxBodySize!)
          } else {
            const bodyStr = JSON.stringify(payload)
            logData.responseBody =
              bodyStr.length > config.maxBodySize!
                ? bodyStr.substring(0, config.maxBodySize!) + '...[TRUNCATED]'
                : bodyStr
          }
        }

        // Log based on response status with enhanced security
        const baseMessage =
          reply.statusCode >= 400
            ? 'HTTP request completed with error'
            : 'HTTP request completed successfully'
        const logMessage = config.enablePIIRedaction
          ? String(sanitizeForLogging(baseMessage, config.maxLogLength!))
          : baseMessage

        if (reply.statusCode >= 400) {
          logWithContext.warn(logMessage, logData)
        } else {
          logWithContext.info(logMessage, logData)
        }
      })

      return payload
    },
  )

  // Error handler: Ensure errors are logged with correlation context
  fastify.addHook(
    'onError',
    async (request: FastifyRequest, reply: FastifyReply, error: Error) => {
      const correlationId = (request as FastifyRequestWithContext).correlationId
      const startTime = (request as FastifyRequestWithContext).startTime

      if (!correlationId) {
        return
      }

      await executeWithCorrelation(correlationId, async () => {
        const duration = startTime ? Date.now() - startTime : undefined

        // Sanitize error context data for ADHD privacy protection
        const errorContext = config.enablePIIRedaction
          ? {
              method: request.method,
              url: sanitizeForLogging(request.url, 500),
              duration,
              userAgent: sanitizeForLogging(request.headers['user-agent'], 200),
              ip: sanitizeIPAddress(request.ip),
            }
          : {
              method: request.method,
              url: request.url,
              duration,
              userAgent: request.headers['user-agent'],
              ip: request.ip,
            }

        // Sanitize error message and stack trace for PII/medical data
        const sanitizedError = config.enablePIIRedaction
          ? new Error(
              String(sanitizeForLogging(error.message, config.maxLogLength!)),
            )
          : error

        // Copy other error properties but sanitize them
        if (config.enablePIIRedaction && error.stack) {
          sanitizedError.stack = String(
            sanitizeForLogging(error.stack, config.maxLogLength! * 2),
          )
        } else {
          sanitizedError.stack = error.stack
        }

        const logMessage = config.enablePIIRedaction
          ? String(
              sanitizeForLogging(
                'HTTP request failed with error',
                config.maxLogLength!,
              ),
            )
          : 'HTTP request failed with error'

        logWithContext.error(logMessage, errorContext, sanitizedError)
      })
    },
  )

  // Add helper to get current request's correlation ID
  fastify.decorateRequest('getCorrelationId', function () {
    return (this as FastifyRequestWithContext).correlationId
  })

  // Add helper to create correlated child logger for route handlers with PII protection
  fastify.decorateRequest('getLogger', function () {
    const correlationId = (this as FastifyRequestWithContext).correlationId
    const enablePII = config.enablePIIRedaction
    const maxLength = config.maxLogLength!

    return {
      debug: (message: string, context?: GenericObject) => {
        const sanitizedMessage = enablePII
          ? String(sanitizeForLogging(message, maxLength))
          : message
        const sanitizedContext =
          enablePII && context
            ? (sanitizeForLogging(context, maxLength) as Record<
                string,
                unknown
              >)
            : context || {}
        logWithContext.debug(sanitizedMessage, {
          ...sanitizedContext,
          correlationId,
        })
      },
      info: (message: string, context?: GenericObject) => {
        const sanitizedMessage = enablePII
          ? String(sanitizeForLogging(message, maxLength))
          : message
        const sanitizedContext =
          enablePII && context
            ? (sanitizeForLogging(context, maxLength) as Record<
                string,
                unknown
              >)
            : context || {}
        logWithContext.info(sanitizedMessage, {
          ...sanitizedContext,
          correlationId,
        })
      },
      warn: (message: string, context?: GenericObject) => {
        const sanitizedMessage = enablePII
          ? String(sanitizeForLogging(message, maxLength))
          : message
        const sanitizedContext =
          enablePII && context
            ? (sanitizeForLogging(context, maxLength) as Record<
                string,
                unknown
              >)
            : context || {}
        logWithContext.warn(sanitizedMessage, {
          ...sanitizedContext,
          correlationId,
        })
      },
      error: (message: string, context?: GenericObject, error?: Error) => {
        const sanitizedMessage = enablePII
          ? String(sanitizeForLogging(message, maxLength))
          : message
        const sanitizedContext =
          enablePII && context
            ? (sanitizeForLogging(context, maxLength) as Record<
                string,
                unknown
              >)
            : context || {}

        let sanitizedError = error
        if (enablePII && error) {
          sanitizedError = new Error(
            String(sanitizeForLogging(error.message, maxLength)),
          )
          if (error.stack) {
            sanitizedError.stack = String(
              sanitizeForLogging(error.stack, maxLength * 2),
            )
          }
        }

        logWithContext.error(
          sanitizedMessage,
          { ...sanitizedContext, correlationId },
          sanitizedError,
        )
      },
    }
  })
}

// Extend FastifyRequest interface for TypeScript
declare module 'fastify' {
  interface FastifyRequest {
    getCorrelationId(): string
    getLogger(): {
      debug(message: string, context?: Record<string, unknown>): void
      info(message: string, context?: Record<string, unknown>): void
      warn(message: string, context?: Record<string, unknown>): void
      error(
        message: string,
        context?: Record<string, unknown>,
        error?: Error,
      ): void
    }
  }
}

export default fp(requestLoggingPlugin, {
  name: 'request-logging',
  fastify: '4.x',
})
