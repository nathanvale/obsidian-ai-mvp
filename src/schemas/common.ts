/**
 * Common validation schemas shared across API endpoints
 * Enhanced with comprehensive validation patterns for ADHD Digital Second Brain
 */

/**
 * Industry-standard email validation regex pattern
 * Based on RFC 5322 specification with practical constraints
 */
const EMAIL_PATTERN = '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$';

/**
 * URL validation pattern supporting http/https/file protocols
 * Optimized for ADHD workflow context (including local file references)
 */
const URL_PATTERN =
  "^(?:https?://|file://|/)[\\w\\-._~:/?#[\\]@!$&'()*+,;=%]+$";

/**
 * ADHD medication name pattern - allows common medication formats
 * Supports brand names, generics, and common abbreviations
 */
const MEDICATION_NAME_PATTERN = '^[a-zA-Z][a-zA-Z0-9\\s\\-().]*$';

/**
 * Time format pattern for medication schedules (24-hour and 12-hour)
 * Examples: "08:00", "2:30 PM", "14:15"
 */
const TIME_PATTERN =
  '^(?:(?:[01]?\\d|2[0-3]):[0-5]\\d(?:\\s?[AaPp][Mm])?|(?:0?[1-9]|1[0-2]):[0-5]\\d\\s?[AaPp][Mm])$';

/**
 * Voice memo transcript pattern - flexible for speech-to-text variations
 * Allows common speech patterns and filler words but excludes HTML tags
 */
const VOICE_TRANSCRIPT_PATTERN =
  '^[\\w\\s\\-.,!?\'":;()\\[\\]{}/@#$%&*+=~`|\\n\\r\\t]*$';

export const CorrelationIdSchema = {
  type: 'string',
  pattern: '^[a-zA-Z0-9-_]{8,64}$',
  description: 'Correlation ID for request tracing',
} as const;

export const CommonHeadersSchema = {
  type: 'object',
  properties: {
    'x-correlation-id': CorrelationIdSchema,
    'user-agent': {
      type: 'string',
      description: 'Client user agent',
    },
    'content-type': {
      type: 'string',
      enum: ['application/json', 'text/plain'],
      description: 'Request content type',
    },
  },
} as const;

export const SuccessResponseSchema = {
  type: 'object',
  required: ['success', 'data', 'correlationId'],
  properties: {
    success: {
      type: 'boolean',
      const: true,
      description: 'Always true for success responses',
    },
    data: {
      description: 'Response data - varies by endpoint',
    },
    correlationId: {
      type: 'string',
      description: 'Correlation ID for tracing requests',
    },
    timestamp: {
      type: 'string',
      format: 'date-time',
      description: 'ISO timestamp when response was generated',
    },
  },
} as const;

export const PaginationQuerySchema = {
  type: 'object',
  properties: {
    page: {
      type: 'integer',
      minimum: 1,
      default: 1,
      description: 'Page number (1-based)',
    },
    limit: {
      type: 'integer',
      minimum: 1,
      maximum: 100,
      default: 20,
      description: 'Number of items per page',
    },
    sort: {
      type: 'string',
      pattern: '^[a-zA-Z_][a-zA-Z0-9_]*(:asc|:desc)?$',
      description: 'Sort field and direction (e.g., "createdAt:desc")',
    },
  },
} as const;

export const PaginatedResponseSchema = {
  type: 'object',
  required: ['success', 'data', 'pagination', 'correlationId'],
  properties: {
    success: {
      type: 'boolean',
      const: true,
    },
    data: {
      type: 'array',
      description: 'Array of items for current page',
    },
    pagination: {
      type: 'object',
      required: ['page', 'limit', 'total', 'pages'],
      properties: {
        page: {
          type: 'integer',
          minimum: 1,
          description: 'Current page number',
        },
        limit: {
          type: 'integer',
          minimum: 1,
          description: 'Items per page',
        },
        total: {
          type: 'integer',
          minimum: 0,
          description: 'Total number of items',
        },
        pages: {
          type: 'integer',
          minimum: 0,
          description: 'Total number of pages',
        },
      },
    },
    correlationId: {
      type: 'string',
    },
    timestamp: {
      type: 'string',
      format: 'date-time',
    },
  },
} as const;

/**
 * Enhanced validation schemas for ADHD Digital Second Brain data types
 */
export const EmailSchema = {
  type: 'string',
  minLength: 3,
  maxLength: 254, // RFC 5321 maximum email length
  pattern: EMAIL_PATTERN,
  format: 'email',
  description: 'Valid email address (RFC 5322 compliant)',
  errorMessage: {
    pattern: 'Please provide a valid email address (e.g., user@example.com)',
    minLength: 'Email must be at least 3 characters long',
    maxLength: 'Email cannot exceed 254 characters',
  },
} as const;

export const UrlSchema = {
  type: 'string',
  minLength: 3,
  maxLength: 2048, // Common browser URL length limit
  pattern: URL_PATTERN,
  description: 'Valid URL (http/https/file protocols supported)',
  errorMessage: {
    pattern:
      'Please provide a valid URL (e.g., https://example.com or file:///path/to/file)',
    minLength: 'URL must be at least 3 characters long',
    maxLength: 'URL cannot exceed 2048 characters',
  },
} as const;

export const MedicationNameSchema = {
  type: 'string',
  minLength: 2,
  maxLength: 100,
  pattern: MEDICATION_NAME_PATTERN,
  description: 'ADHD medication name (brand name, generic, or abbreviation)',
  errorMessage: {
    pattern:
      'Medication name can only contain letters, numbers, spaces, hyphens, periods, and parentheses',
    minLength: 'Medication name must be at least 2 characters long',
    maxLength: 'Medication name cannot exceed 100 characters',
  },
} as const;

export const MedicationDosageSchema = {
  type: 'number',
  minimum: 0.1,
  maximum: 1000,
  multipleOf: 0.1, // Allow decimal dosages like 2.5mg
  description: 'Medication dosage in milligrams',
  errorMessage: {
    minimum: 'Dosage must be at least 0.1mg',
    maximum:
      'Dosage cannot exceed 1000mg (please verify with healthcare provider)',
  },
} as const;

export const TimeSchema = {
  type: 'string',
  pattern: TIME_PATTERN,
  description: 'Time in 24-hour (HH:MM) or 12-hour (H:MM AM/PM) format',
  errorMessage: {
    pattern:
      'Please provide time in format like "08:00", "2:30 PM", or "14:15"',
  },
} as const;

export const AdhdSymptomSeveritySchema = {
  type: 'integer',
  minimum: 1,
  maximum: 10,
  description: 'ADHD symptom severity scale (1=minimal, 10=severe)',
  errorMessage: {
    minimum: 'Severity rating must be between 1 and 10',
    maximum: 'Severity rating must be between 1 and 10',
  },
} as const;

export const VoiceTranscriptSchema = {
  type: 'string',
  minLength: 1,
  maxLength: 10000, // Allow long voice memos
  pattern: VOICE_TRANSCRIPT_PATTERN,
  description: 'Voice memo transcript text (supports common speech patterns)',
  transform: ['trim'], // Auto-trim whitespace
  errorMessage: {
    pattern: 'Transcript contains unsupported characters',
    minLength: 'Transcript cannot be empty',
    maxLength: 'Transcript cannot exceed 10,000 characters',
  },
} as const;

export const MarkdownContentSchema = {
  type: 'string',
  minLength: 1,
  maxLength: 100000, // Large documents allowed
  description: 'Obsidian-compatible markdown content',
  transform: ['trim'],
  errorMessage: {
    minLength: 'Content cannot be empty',
    maxLength: 'Content cannot exceed 100,000 characters',
  },
} as const;

export const TagsSchema = {
  type: 'array',
  items: {
    type: 'string',
    minLength: 1,
    maxLength: 50,
    pattern: '^[a-zA-Z0-9_][a-zA-Z0-9\\s\\-_]*$',
    description: 'Tag name (alphanumeric, spaces, hyphens, underscores)',
  },
  maxItems: 20, // Reasonable limit for ADHD organization
  uniqueItems: true,
  description: 'Array of tags for content organization',
  errorMessage: {
    maxItems: 'Cannot have more than 20 tags',
    uniqueItems: 'Duplicate tags are not allowed',
  },
} as const;

export const CategorySchema = {
  type: 'string',
  enum: [
    'voice_memo',
    'email_important',
    'email_deadline',
    'email_medical',
    'email_financial',
    'task_urgent',
    'task_routine',
    'medication_reminder',
    'appointment',
    'personal_note',
    'work_related',
    'school_related',
    'family_related',
    'health_related',
    'other',
  ],
  description: 'Content category for ADHD workflow organization',
  errorMessage: {
    enum: 'Please select a valid category from the predefined list',
  },
} as const;

export const PrioritySchema = {
  type: 'string',
  enum: ['low', 'medium', 'high', 'urgent'],
  description: 'Priority level for ADHD task management',
  errorMessage: {
    enum: 'Priority must be: low, medium, high, or urgent',
  },
} as const;

export const DateTimeSchema = {
  type: 'string',
  format: 'date-time',
  description: 'ISO 8601 datetime string',
  errorMessage: {
    format:
      'Please provide a valid ISO 8601 datetime (e.g., "2023-12-25T10:30:00Z")',
  },
} as const;

export const DateSchema = {
  type: 'string',
  pattern: '^\\d{4}-\\d{2}-\\d{2}$',
  description: 'Date in YYYY-MM-DD format',
  errorMessage: {
    pattern: 'Please provide date in YYYY-MM-DD format (e.g., "2023-12-25")',
  },
} as const;

/**
 * Input sanitization and validation utilities
 */
export const TextSanitizationSchema = {
  type: 'string',
  transform: ['trim'], // Remove leading/trailing whitespace
  description: 'Auto-sanitized text input with whitespace normalization',
} as const;

/**
 * Search query schema optimized for ADHD semantic search
 */
export const SearchQuerySchema = {
  type: 'string',
  minLength: 1,
  maxLength: 500,
  pattern: '^[^<>\\x00-\\x1f\\x7f-\\x9f]*$', // No control characters or HTML
  transform: ['trim'],
  description: 'Search query for semantic search (max 500 chars, no HTML)',
  errorMessage: {
    pattern:
      'Search query contains invalid characters (HTML tags and control characters not allowed)',
    minLength: 'Search query cannot be empty',
    maxLength: 'Search query cannot exceed 500 characters',
  },
} as const;

/**
 * File path validation for Obsidian vault integration
 */
export const VaultPathSchema = {
  type: 'string',
  minLength: 1,
  maxLength: 1000,
  pattern: '^[^<>:"|?*\\x00-\\x1f\\x7f-\\x9f]*$', // Valid file path characters
  description: 'Valid file path within Obsidian vault',
  errorMessage: {
    pattern: 'File path contains invalid characters',
    minLength: 'File path cannot be empty',
    maxLength: 'File path cannot exceed 1000 characters',
  },
} as const;

/**
 * TypeScript interfaces for common responses and ADHD-specific data types
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  correlationId: string;
  timestamp: string;
}

export interface PaginatedResponse<T = unknown> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  correlationId: string;
  timestamp: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
}

/**
 * ADHD-specific TypeScript interfaces
 */
export interface MedicationInfo {
  name: string;
  dosage: number;
  time: string;
  frequency: 'once' | 'twice' | 'three_times' | 'four_times' | 'as_needed';
  notes?: string;
}

export interface AdhdSymptomTracking {
  symptom:
    | 'focus'
    | 'hyperactivity'
    | 'impulsivity'
    | 'organization'
    | 'time_management'
    | 'emotional_regulation';
  severity: number; // 1-10 scale
  timestamp: string;
  context?: string;
  triggers?: string[];
}

export interface VoiceMemoMetadata {
  transcriptId: string;
  originalFilePath: string;
  transcriptionConfidence?: number;
  duration?: number; // in seconds
  timestamp: string;
  category?: string;
  tags?: string[];
}

export interface EmailClassification {
  emailId: string;
  category:
    | 'urgent'
    | 'medical'
    | 'financial'
    | 'school'
    | 'work'
    | 'family'
    | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  extractedDeadlines?: string[];
  actionRequired: boolean;
  confidenceScore?: number;
}

export interface TaskData {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  dueDate?: string;
  estimatedDuration?: number; // in minutes
  cognitiveLoad: 'low' | 'medium' | 'high'; // ADHD-specific
  medicationOptimal?: boolean; // Best done during medication effectiveness
  tags?: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  createdAt: string;
  updatedAt: string;
}

/**
 * Validation utility functions with enhanced error messaging
 */
export const ValidationErrorMessages = {
  INVALID_EMAIL:
    'Please provide a valid email address (e.g., user@example.com)',
  INVALID_URL: 'Please provide a valid URL (e.g., https://example.com)',
  INVALID_MEDICATION_NAME:
    'Medication name can only contain letters, numbers, spaces, hyphens, and parentheses',
  INVALID_TIME_FORMAT:
    'Please provide time in format like "08:00", "2:30 PM", or "14:15"',
  INVALID_SEVERITY_SCALE: 'Severity rating must be between 1 and 10',
  INVALID_SEARCH_QUERY:
    'Search query contains invalid characters (HTML tags not allowed)',
  CONTENT_TOO_LONG: 'Content exceeds maximum allowed length',
  CONTENT_EMPTY: 'Content cannot be empty',
  INVALID_FILE_PATH: 'File path contains invalid characters or is malformed',
  INVALID_CATEGORY: 'Please select a valid category from the available options',
  INVALID_PRIORITY: 'Priority must be: low, medium, high, or urgent',
  DUPLICATE_TAGS: 'Duplicate tags are not allowed',
  TOO_MANY_TAGS: 'Cannot have more than 20 tags',
} as const;

/**
 * Comprehensive validation schema factory for creating context-aware validators
 */
export function createValidationSchema(
  type: 'email' | 'url' | 'medication' | 'time' | 'search' | 'content' | 'tags',
  options?: {
    maxLength?: number;
    minLength?: number;
    required?: boolean;
  }
) {
  const baseSchemas = {
    email: EmailSchema,
    url: UrlSchema,
    medication: MedicationNameSchema,
    time: TimeSchema,
    search: SearchQuerySchema,
    content: MarkdownContentSchema,
    tags: TagsSchema,
  };

  const schema = { ...baseSchemas[type] };

  if (options?.maxLength && typeof schema.maxLength !== 'undefined') {
    schema.maxLength = Math.min(schema.maxLength, options.maxLength);
  }

  if (options?.minLength && typeof schema.minLength !== 'undefined') {
    schema.minLength = Math.max(schema.minLength, options.minLength);
  }

  return schema;
}
