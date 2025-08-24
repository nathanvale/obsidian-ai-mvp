import type {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
  FastifyError,
} from 'fastify';
import fp from 'fastify-plugin';
import { generateCorrelationId } from '@orchestr8/logger';
import { getCurrentCorrelationId, logWithContext } from '../services/logger.js';
import type {
  ErrorResponse,
  ValidationErrorResponse,
} from '../schemas/errors.js';
import type {
  ErrorWithStatus,
  FastifyRequestWithContext,
} from '../types/fastify.js';
import { ErrorMessages } from '../schemas/errors.js';

export interface ErrorHandlerOptions {
  hideInternalErrors?: boolean;
  includeStackTrace?: boolean;
}

const defaultOptions: ErrorHandlerOptions = {
  hideInternalErrors: true,
  includeStackTrace: false,
};

/**
 * Centralized error handler plugin for consistent error responses
 * Integrates with @orchestr8/logger for structured error logging
 */
async function errorHandlerPlugin(
  fastify: FastifyInstance,
  options: ErrorHandlerOptions = {}
) {
  const config = { ...defaultOptions, ...options };

  // Set up global error handler
  fastify.setErrorHandler(
    async (
      error: FastifyError,
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      // Check if reply was already sent
      if (reply.sent) {
        return;
      }

      const correlationId =
        getCurrentCorrelationId() || generateCorrelationId();
      const timestamp = new Date().toISOString();

      // Log the error with context
      logWithContext.error(
        'Request error occurred',
        {
          method: request.method,
          url: request.url,
          statusCode: error.statusCode || 500,
          userAgent: request.headers['user-agent'],
          ip: request.ip,
        },
        error
      );

      // Handle validation errors specially
      if (error.validation) {
        const validationError: ValidationErrorResponse = {
          success: false,
          error: {
            message: 'Validation failed',
            statusCode: 400,
            code: 'VALIDATION_ERROR',
            validation: error.validation.map(
              (item: {
                instancePath?: string;
                schemaPath?: string;
                message?: string;
                data?: unknown;
              }) => ({
                field:
                  item.instancePath?.replace('/', '') ||
                  item.schemaPath ||
                  'unknown',
                message: item.message || 'Invalid value',
                value: item.data,
              })
            ),
          },
          correlationId,
          timestamp,
        };

        reply.status(400);
        return validationError;
      }

      // Determine status code
      const statusCode =
        error.statusCode || (error as ErrorWithStatus).status || 500;

      // Get appropriate error message
      let message = getErrorMessage(statusCode);

      // For development, include original error message
      if (!config.hideInternalErrors || statusCode < 500) {
        message = error.message || message;
      }

      // Build error response
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          message,
          statusCode,
          code: error.code,
          ...(config.includeStackTrace &&
            error.stack && { details: { stack: error.stack } }),
        },
        correlationId,
        timestamp,
      };

      reply.status(statusCode);
      return errorResponse;
    }
  );

  // Handle 404 Not Found for unmatched routes
  fastify.setNotFoundHandler(
    async (request: FastifyRequest, reply: FastifyReply) => {
      const correlationId =
        getCurrentCorrelationId() || generateCorrelationId();
      const timestamp = new Date().toISOString();

      logWithContext.warn('Route not found', {
        method: request.method,
        url: request.url,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
      });

      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          message: ErrorMessages.NOT_FOUND,
          statusCode: 404,
          code: 'NOT_FOUND',
        },
        correlationId,
        timestamp,
      };

      reply.status(404);
      return errorResponse;
    }
  );

  // Add correlation ID to request if not present
  fastify.addHook('preHandler', async (request: FastifyRequest) => {
    const existingCorrelationId = request.headers['x-correlation-id'] as string;
    const correlationId = existingCorrelationId || generateCorrelationId();

    // Store correlation ID in request for later use
    (request as FastifyRequestWithContext).correlationId = correlationId;
  });
}

/**
 * Get appropriate error message based on status code
 */
function getErrorMessage(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return ErrorMessages.BAD_REQUEST;
    case 401:
      return ErrorMessages.UNAUTHORIZED;
    case 403:
      return ErrorMessages.FORBIDDEN;
    case 404:
      return ErrorMessages.NOT_FOUND;
    case 405:
      return ErrorMessages.METHOD_NOT_ALLOWED;
    case 409:
      return ErrorMessages.CONFLICT;
    case 422:
      return ErrorMessages.UNPROCESSABLE_ENTITY;
    case 429:
      return ErrorMessages.TOO_MANY_REQUESTS;
    case 500:
      return ErrorMessages.INTERNAL_SERVER_ERROR;
    case 502:
      return ErrorMessages.BAD_GATEWAY;
    case 503:
      return ErrorMessages.SERVICE_UNAVAILABLE;
    case 504:
      return ErrorMessages.GATEWAY_TIMEOUT;
    default:
      return statusCode >= 500
        ? ErrorMessages.INTERNAL_SERVER_ERROR
        : ErrorMessages.BAD_REQUEST;
  }
}

export default fp(errorHandlerPlugin, {
  name: 'error-handler',
  fastify: '4.x',
});
