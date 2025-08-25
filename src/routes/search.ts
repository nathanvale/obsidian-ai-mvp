import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  validateSearchQuery,
  createSecurityErrorResponse,
  SecureSchemas,
} from '../utils/input-validation.js';
import { logWithContext, getCurrentCorrelationId } from '../services/logger.js';
import { ErrorResponseSchema } from '../schemas/errors.js';

/**
 * Zod schema with enhanced security validation
 */
const searchRequestSchema = z.object({
  query: z
    .string()
    .min(1, 'Query cannot be empty')
    .max(500, 'Query too long (maximum 500 characters)')
    // eslint-disable-next-line no-control-regex
    .regex(/^[^<>\x00-\x1f\x7f-\x9f]*$/, 'Query contains invalid characters'),
  limit: z.number().int().positive().max(100).default(10),
  threshold: z.number().min(0).max(1).default(0.3),
});

export async function searchRoutes(server: FastifyInstance) {
  server.post(
    '/',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            query: SecureSchemas.SEARCH_QUERY,
            limit: {
              type: 'number',
              minimum: 1,
              maximum: 100,
              default: 10,
              description: 'Maximum number of search results to return',
            },
            threshold: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              default: 0.3,
              description: 'Minimum similarity threshold for search results',
            },
          },
          required: ['query'],
          additionalProperties: false, // Prevent additional properties
        },
        response: {
          200: {
            type: 'object',
            required: ['success', 'data', 'correlationId', 'timestamp'],
            properties: {
              success: { type: 'boolean', const: true },
              data: {
                type: 'object',
                required: ['results', 'query', 'total', 'limit', 'threshold'],
                properties: {
                  results: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['id', 'content', 'metadata', 'score'],
                      properties: {
                        id: { type: 'string' },
                        content: { type: 'string' },
                        metadata: {
                          type: 'object',
                          description:
                            'Document metadata and indexing information',
                        },
                        score: {
                          type: 'number',
                          minimum: 0,
                          maximum: 1,
                          description:
                            'Similarity score (0-1, higher is more relevant)',
                        },
                      },
                    },
                  },
                  query: {
                    type: 'string',
                    description: 'Original search query',
                  },
                  total: {
                    type: 'number',
                    minimum: 0,
                    description: 'Total number of matching results',
                  },
                  limit: { type: 'number', minimum: 1, maximum: 100 },
                  threshold: { type: 'number', minimum: 0, maximum: 1 },
                },
              },
              correlationId: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          400: ErrorResponseSchema,
          429: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
        security: [
          {
            description: 'Rate limited to prevent abuse',
            'x-rate-limit': '100 requests per 15 minutes per IP',
          },
        ],
      },
    },
    async (request, reply) => {
      const correlationId = getCurrentCorrelationId() || 'search-request';

      try {
        // First, validate using Zod schema (catches basic format issues)
        const parseResult = searchRequestSchema.safeParse(request.body);

        if (!parseResult.success) {
          logWithContext.warn('Search request failed Zod validation', {
            errors: parseResult.error.errors,
            body: request.body,
          });

          return reply.status(400).send({
            success: false,
            error: {
              message: 'Invalid request format',
              statusCode: 400,
              code: 'VALIDATION_ERROR',
              details: {
                issues: parseResult.error.errors.map(err => ({
                  field: err.path.join('.'),
                  message: err.message,
                })),
              },
            },
            correlationId,
            timestamp: new Date().toISOString(),
          });
        }

        const { query, limit, threshold } = parseResult.data;

        // Second, perform deep security validation on the query
        const queryValidation = validateSearchQuery(query);

        if (!queryValidation.isValid) {
          // Log the security violation (violations are already logged in validateSearchQuery)
          logWithContext.error('Search query failed security validation', {
            originalQuery: query.substring(0, 100), // Only log first 100 chars
            violationCount: queryValidation.violations.length,
            wasModified: queryValidation.wasModified,
            clientIp: request.ip,
            userAgent: request.headers['user-agent'],
          });

          const securityError = createSecurityErrorResponse(
            queryValidation.violations,
            correlationId
          );

          return reply.status(400).send(securityError);
        }

        // Use the sanitized query for processing
        const sanitizedQuery = queryValidation.sanitized;

        // Log successful search request
        logWithContext.info('Processing search request', {
          queryLength: sanitizedQuery.length,
          limit,
          threshold,
          wasQueryModified: queryValidation.wasModified,
          clientIp: request.ip,
        });

        // TODO: Implement actual search logic here
        // For now, return empty results with proper structure
        const searchResults = {
          results: [],
          query: sanitizedQuery, // Return the sanitized version
          total: 0,
          limit,
          threshold,
        };

        return reply.status(200).send({
          success: true,
          data: searchResults,
          correlationId,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        // Never expose internal errors to clients
        logWithContext.error('Search request processing error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          body: request.body,
        });

        return reply.status(500).send({
          success: false,
          error: {
            message: 'Internal server error',
            statusCode: 500,
            code: 'INTERNAL_ERROR',
          },
          correlationId,
          timestamp: new Date().toISOString(),
        });
      }
    }
  );
}
