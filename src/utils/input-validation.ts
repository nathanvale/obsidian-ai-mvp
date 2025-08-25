/**
 * Security-focused input validation utilities
 * Provides XSS protection, injection prevention, and content sanitization
 */

import { logWithContext } from '../services/logger.js'

/**
 * Configuration for input validation
 */
export interface ValidationConfig {
  /** Maximum allowed string length */
  maxLength: number
  /** Whether to allow HTML entities */
  allowHtml?: boolean
  /** Whether to log security violations */
  logViolations?: boolean
}

/**
 * Default validation configurations for different input types
 */
export const ValidationDefaults = {
  SEARCH_QUERY: { maxLength: 500, allowHtml: false, logViolations: true },
  TOPIC_NAME: { maxLength: 100, allowHtml: false, logViolations: true },
  GENERAL_STRING: { maxLength: 200, allowHtml: false, logViolations: true },
} as const

/**
 * Dangerous patterns that should be blocked in user input
 * These patterns indicate potential XSS, injection, or other attacks
 */
const DANGEROUS_PATTERNS = [
  // XSS patterns
  /<script[\s\S]*?<\/script>/gi,
  /<iframe[\s\S]*?<\/iframe>/gi,
  /on\w+\s*=/gi, // Event handlers like onclick=, onload=, etc.
  /<\s*\/?\s*[a-z][a-z0-9]*[^>]*>/gi, // HTML tags

  // SQL injection patterns - only match obvious SQL commands
  /;\s*(drop|delete|truncate|insert|update|alter|create|exec|execute)\s+/gi,
  /union\s+select/gi,
  /'\s*or\s+'1'\s*=\s*'1/gi, // Classic SQL injection
  /--\s*$/gm, // SQL comments at end of line

  // Command injection patterns - be more specific to avoid false positives
  /[;&|`]\s*(rm|del|format|curl|wget|nc|netcat|bash|sh|cmd|powershell)/gi,
  /\$\(\s*[a-z]/gi, // Command substitution like $(command)
  /`[^`]*`/g, // Backtick command execution

  // Path traversal (including URL encoded)
  /\.\.[/\\]/g,
  /%2e%2e[/\\%2f]/gi, // URL encoded ../

  // Control characters (including null bytes)
  // eslint-disable-next-line no-control-regex
  /[\x00-\x1f\x7f-\x9f]/g,

  // Excessive special characters (potential buffer overflow)
  /(.)\1{50,}/g, // Same character repeated 50+ times

  // Repeated suspicious characters that could be used to bypass validation
  /[;"]{2,}/g, // Multiple semicolons (2 or more is suspicious)
  /['"]{4,}/g, // Multiple quotes (4 or more)
] as const

/**
 * JavaScript URI pattern (separate to handle it differently)
 */
const JAVASCRIPT_URI_PATTERN = /javascript:/gi

/**
 * Characters that should be encoded to prevent XSS
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#96;',
  '=': '&#61;',
} as const

/**
 * Security validation result
 */
export interface ValidationResult {
  /** Whether the input is valid and safe */
  isValid: boolean
  /** Sanitized version of the input */
  sanitized: string
  /** List of security issues found */
  violations: string[]
  /** Whether the input was modified during sanitization */
  wasModified: boolean
}

/**
 * Escapes HTML entities to prevent XSS attacks
 * Converts dangerous characters to their HTML entity equivalents
 */
export function escapeHtml(input: string): string {
  return input.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char)
}

/**
 * Removes or neutralizes dangerous patterns in user input
 * This is a defensive approach - when in doubt, block it
 */
export function sanitizeInput(
  input: string,
  config: ValidationConfig = ValidationDefaults.GENERAL_STRING,
): ValidationResult {
  const violations: string[] = []
  let sanitized = input
  let wasModified = false

  // Check length limits first
  if (sanitized.length > config.maxLength) {
    violations.push(
      `Input exceeds maximum length of ${config.maxLength} characters`,
    )
    sanitized = sanitized.substring(0, config.maxLength)
    wasModified = true
  }

  // Check for JavaScript URIs first (special handling)
  const jsMatches = sanitized.match(JAVASCRIPT_URI_PATTERN)
  if (jsMatches && jsMatches.length > 0) {
    violations.push('JavaScript URI detected')
    sanitized = sanitized.replace(JAVASCRIPT_URI_PATTERN, '')
    wasModified = true
  }

  // Check for other dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    const matches = sanitized.match(pattern)
    if (matches && matches.length > 0) {
      violations.push(`Dangerous pattern detected: ${pattern.toString()}`)

      // Remove the dangerous content
      sanitized = sanitized.replace(pattern, '')
      wasModified = true
    }
  }

  // HTML escape unless explicitly allowed
  if (!config.allowHtml) {
    const htmlEscaped = escapeHtml(sanitized)
    if (htmlEscaped !== sanitized) {
      sanitized = htmlEscaped
      wasModified = true
    }
  }

  // Normalize whitespace
  const normalizedWhitespace = sanitized.replace(/\s+/g, ' ').trim()
  if (normalizedWhitespace !== sanitized) {
    sanitized = normalizedWhitespace
    wasModified = true
  }

  const isValid = violations.length === 0

  // Log security violations if configured (only if logViolations is true and logger is available)
  if (config.logViolations && violations.length > 0) {
    try {
      logWithContext.warn('Input validation violations detected', {
        originalInput: input.substring(0, 200), // Only log first 200 chars for privacy
        violations,
        wasModified,
        sanitizedLength: sanitized.length,
        originalLength: input.length,
      })
    } catch (logError) {
      // Logger not initialized - continue without logging in test environment
      // This allows tests to run without requiring logger initialization
    }
  }

  return {
    isValid,
    sanitized,
    violations,
    wasModified,
  }
}

/**
 * Validates and sanitizes a search query specifically
 * Applies strict validation rules suitable for search operations
 */
export function validateSearchQuery(query: string): ValidationResult {
  const result = sanitizeInput(query, ValidationDefaults.SEARCH_QUERY)

  // Additional search-specific validation - check for empty or whitespace-only after sanitization
  if (result.sanitized.trim().length < 1) {
    result.violations.push('Search query cannot be empty after sanitization')
    result.isValid = false
  }

  // Check for excessively complex queries that could cause DoS
  const wordCount = result.sanitized.split(/\s+/).length
  if (wordCount > 50) {
    result.violations.push('Search query contains too many words (maximum 50)')
    result.isValid = false
  }

  return result
}

/**
 * Validates and sanitizes a topic name for quiz generation
 * Applies rules suitable for educational content topics
 */
export function validateTopicName(topic: string): ValidationResult {
  const result = sanitizeInput(topic, ValidationDefaults.TOPIC_NAME)

  // Additional topic-specific validation
  if (result.sanitized.trim().length < 2) {
    result.violations.push(
      'Topic name must be at least 2 characters after sanitization',
    )
    result.isValid = false
  }

  // Check if the topic is just HTML entities (like "&lt;&gt;" from "<>")
  // This catches cases where dangerous input becomes "valid" HTML entities
  const htmlEntityOnlyPattern = /^(&[a-zA-Z0-9]+;|\s)*$/
  if (htmlEntityOnlyPattern.test(result.sanitized.trim())) {
    result.violations.push('Topic name contains only HTML entities')
    result.isValid = false
  }

  // Topics should be reasonable educational subjects - allow HTML entities from escaping
  const allowedTopicPattern = /^[a-zA-Z0-9\s\-_.,&()#;]+$/
  if (result.sanitized.trim() && !allowedTopicPattern.test(result.sanitized)) {
    result.violations.push('Topic name contains invalid characters')
    result.isValid = false
  }

  return result
}

/**
 * Creates a validation error response that doesn't expose internal details
 * This prevents information leakage while still providing useful feedback
 */
export function createSecurityErrorResponse(
  violations: string[],
  correlationId: string,
): {
  success: false
  error: {
    message: string
    statusCode: number
    code: string
    details?: {
      violationCount: number
    }
  }
  correlationId: string
  timestamp: string
} {
  // Don't expose the actual violation details to prevent information leakage
  const publicMessage =
    violations.length > 1
      ? 'Input validation failed: Multiple security policy violations'
      : 'Input validation failed: Security policy violation'

  return {
    success: false,
    error: {
      message: publicMessage,
      statusCode: 400,
      code: 'INPUT_SECURITY_VIOLATION',
      details: {
        violationCount: violations.length,
      },
    },
    correlationId,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Fastify JSON Schema definitions for secure input validation
 */
export const SecureSchemas = {
  /**
   * Schema for search query with comprehensive security validation
   */
  SEARCH_QUERY: {
    type: 'string',
    minLength: 1,
    maxLength: 500,
    pattern: '^[^<>\\x00-\\x1f\\x7f-\\x9f]*$', // No control characters or HTML brackets
    description: 'Search query (max 500 chars, no HTML or control characters)',
  },

  /**
   * Schema for topic names with educational content validation
   */
  TOPIC_NAME: {
    type: 'string',
    minLength: 2,
    maxLength: 100,
    pattern: '^[a-zA-Z0-9\\s\\-_.,&()]+$',
    description:
      'Topic name for quiz generation (alphanumeric, spaces, and basic punctuation only)',
  },

  /**
   * Schema for general string inputs with security constraints
   */
  SECURE_STRING: {
    type: 'string',
    minLength: 1,
    maxLength: 200,
    pattern: '^[^<>\\x00-\\x1f\\x7f-\\x9f]*$',
    description: 'General string input with security validation',
  },
} as const
