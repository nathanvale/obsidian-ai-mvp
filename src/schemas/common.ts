/**
 * Common validation schemas shared across API endpoints
 */

export const CorrelationIdSchema = {
  type: 'string',
  pattern: '^[a-zA-Z0-9-_]{8,64}$',
  description: 'Correlation ID for request tracing'
} as const;

export const CommonHeadersSchema = {
  type: 'object',
  properties: {
    'x-correlation-id': CorrelationIdSchema,
    'user-agent': {
      type: 'string',
      description: 'Client user agent'
    },
    'content-type': {
      type: 'string',
      enum: ['application/json', 'text/plain'],
      description: 'Request content type'
    }
  }
} as const;

export const SuccessResponseSchema = {
  type: 'object',
  required: ['success', 'data', 'correlationId'],
  properties: {
    success: {
      type: 'boolean',
      const: true,
      description: 'Always true for success responses'
    },
    data: {
      description: 'Response data - varies by endpoint'
    },
    correlationId: {
      type: 'string',
      description: 'Correlation ID for tracing requests'
    },
    timestamp: {
      type: 'string',
      format: 'date-time',
      description: 'ISO timestamp when response was generated'
    }
  }
} as const;

export const PaginationQuerySchema = {
  type: 'object',
  properties: {
    page: {
      type: 'integer',
      minimum: 1,
      default: 1,
      description: 'Page number (1-based)'
    },
    limit: {
      type: 'integer',
      minimum: 1,
      maximum: 100,
      default: 20,
      description: 'Number of items per page'
    },
    sort: {
      type: 'string',
      pattern: '^[a-zA-Z_][a-zA-Z0-9_]*(:asc|:desc)?$',
      description: 'Sort field and direction (e.g., "createdAt:desc")'
    }
  }
} as const;

export const PaginatedResponseSchema = {
  type: 'object',
  required: ['success', 'data', 'pagination', 'correlationId'],
  properties: {
    success: {
      type: 'boolean',
      const: true
    },
    data: {
      type: 'array',
      description: 'Array of items for current page'
    },
    pagination: {
      type: 'object',
      required: ['page', 'limit', 'total', 'pages'],
      properties: {
        page: {
          type: 'integer',
          minimum: 1,
          description: 'Current page number'
        },
        limit: {
          type: 'integer',
          minimum: 1,
          description: 'Items per page'
        },
        total: {
          type: 'integer',
          minimum: 0,
          description: 'Total number of items'
        },
        pages: {
          type: 'integer',
          minimum: 0,
          description: 'Total number of pages'
        }
      }
    },
    correlationId: {
      type: 'string'
    },
    timestamp: {
      type: 'string',
      format: 'date-time'
    }
  }
} as const;

/**
 * TypeScript interfaces for common responses
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