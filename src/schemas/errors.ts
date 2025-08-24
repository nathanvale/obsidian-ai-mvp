/**
 * Error response schemas for consistent API error handling
 */

export const ErrorResponseSchema = {
  type: 'object',
  required: ['success', 'error', 'correlationId'],
  properties: {
    success: {
      type: 'boolean',
      const: false,
      description: 'Always false for error responses',
    },
    error: {
      type: 'object',
      required: ['message', 'statusCode'],
      properties: {
        message: {
          type: 'string',
          description: 'Human-readable error message',
        },
        statusCode: {
          type: 'integer',
          minimum: 400,
          maximum: 599,
          description: 'HTTP status code',
        },
        code: {
          type: 'string',
          description: 'Optional error code for programmatic handling',
        },
        details: {
          type: 'object',
          description: 'Optional additional error details',
        },
      },
    },
    correlationId: {
      type: 'string',
      description: 'Correlation ID for tracing requests',
    },
    timestamp: {
      type: 'string',
      format: 'date-time',
      description: 'ISO timestamp when error occurred',
    },
  },
} as const;

export const ValidationErrorResponseSchema = {
  type: 'object',
  required: ['success', 'error', 'correlationId'],
  properties: {
    success: {
      type: 'boolean',
      const: false,
    },
    error: {
      type: 'object',
      required: ['message', 'statusCode', 'validation'],
      properties: {
        message: {
          type: 'string',
          const: 'Validation failed',
        },
        statusCode: {
          type: 'integer',
          const: 400,
        },
        code: {
          type: 'string',
          const: 'VALIDATION_ERROR',
        },
        validation: {
          type: 'array',
          items: {
            type: 'object',
            required: ['field', 'message'],
            properties: {
              field: {
                type: 'string',
                description: 'Field that failed validation',
              },
              message: {
                type: 'string',
                description: 'Validation error message',
              },
              value: {
                description: 'The invalid value that was provided',
              },
            },
          },
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
 * TypeScript interfaces for error responses
 */
export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    statusCode: number;
    code?: string;
    details?: Record<string, unknown>;
  };
  correlationId: string;
  timestamp: string;
}

export interface ValidationErrorResponse {
  success: false;
  error: {
    message: 'Validation failed';
    statusCode: 400;
    code: 'VALIDATION_ERROR';
    validation: Array<{
      field: string;
      message: string;
      value?: unknown;
    }>;
  };
  correlationId: string;
  timestamp: string;
}

/**
 * Common HTTP error messages
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
} as const;
