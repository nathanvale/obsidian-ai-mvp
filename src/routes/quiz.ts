import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  validateTopicName,
  createSecurityErrorResponse,
  SecureSchemas,
} from '../utils/input-validation.js';
import { logWithContext, getCurrentCorrelationId } from '../services/logger.js';
import { ErrorResponseSchema } from '../schemas/errors.js';

/**
 * Zod schema with enhanced security validation for quiz generation
 */
const generateQuizSchema = z.object({
  topic: z
    .string()
    .min(2, 'Topic must be at least 2 characters')
    .max(100, 'Topic too long (maximum 100 characters)')
    .regex(/^[a-zA-Z0-9\s\-_.,&()]+$/, 'Topic contains invalid characters'),
  numQuestions: z.number().int().positive().max(20).default(5),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
});

export async function quizRoutes(server: FastifyInstance) {
  server.post(
    '/generate',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            topic: SecureSchemas.TOPIC_NAME,
            numQuestions: {
              type: 'number',
              minimum: 1,
              maximum: 20,
              default: 5,
              description: 'Number of quiz questions to generate (1-20)',
            },
            difficulty: {
              type: 'string',
              enum: ['easy', 'medium', 'hard'],
              default: 'medium',
              description: 'Difficulty level for quiz questions',
            },
          },
          required: ['topic'],
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
                required: ['questions', 'topic', 'difficulty', 'numQuestions'],
                properties: {
                  questions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: [
                        'id',
                        'question',
                        'options',
                        'correctAnswer',
                        'explanation',
                      ],
                      properties: {
                        id: {
                          type: 'string',
                          description: 'Unique question identifier',
                        },
                        question: {
                          type: 'string',
                          description: 'The quiz question text',
                        },
                        options: {
                          type: 'array',
                          items: { type: 'string' },
                          minItems: 2,
                          maxItems: 6,
                          description: 'Multiple choice answer options',
                        },
                        correctAnswer: {
                          type: 'number',
                          minimum: 0,
                          description: 'Index of the correct answer (0-based)',
                        },
                        explanation: {
                          type: 'string',
                          description: 'Explanation of the correct answer',
                        },
                      },
                    },
                  },
                  topic: {
                    type: 'string',
                    description: 'Quiz topic (sanitized)',
                  },
                  difficulty: {
                    type: 'string',
                    enum: ['easy', 'medium', 'hard'],
                  },
                  numQuestions: { type: 'number', minimum: 1, maximum: 20 },
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
            description: 'Rate limited to prevent abuse of AI quiz generation',
            'x-rate-limit': '20 requests per 5 minutes per IP',
          },
        ],
      },
    },
    async (request, reply) => {
      const correlationId = getCurrentCorrelationId() || 'quiz-generate';

      try {
        // First, validate using Zod schema (catches basic format issues)
        const parseResult = generateQuizSchema.safeParse(request.body);

        if (!parseResult.success) {
          logWithContext.warn('Quiz generation request failed Zod validation', {
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

        const { topic, numQuestions, difficulty } = parseResult.data;

        // Second, perform deep security validation on the topic
        const topicValidation = validateTopicName(topic);

        if (!topicValidation.isValid) {
          // Log the security violation (violations are already logged in validateTopicName)
          logWithContext.error('Quiz topic failed security validation', {
            originalTopic: topic.substring(0, 100), // Only log first 100 chars
            violationCount: topicValidation.violations.length,
            wasModified: topicValidation.wasModified,
            numQuestions,
            difficulty,
            clientIp: request.ip,
            userAgent: request.headers['user-agent'],
          });

          const securityError = createSecurityErrorResponse(
            topicValidation.violations,
            correlationId
          );

          return reply.status(400).send(securityError);
        }

        // Use the sanitized topic for processing
        const sanitizedTopic = topicValidation.sanitized;

        // Additional validation - prevent resource exhaustion attacks
        if (numQuestions > 10 && difficulty === 'hard') {
          logWithContext.warn(
            'High complexity quiz generation attempt blocked',
            {
              numQuestions,
              difficulty,
              topic: sanitizedTopic,
              clientIp: request.ip,
            }
          );

          return reply.status(400).send({
            success: false,
            error: {
              message: 'Cannot generate more than 10 hard questions at once',
              statusCode: 400,
              code: 'RESOURCE_LIMIT_EXCEEDED',
              details: {
                maxHardQuestions: 10,
                requested: numQuestions,
              },
            },
            correlationId,
            timestamp: new Date().toISOString(),
          });
        }

        // Log successful quiz generation request
        logWithContext.info('Processing quiz generation request', {
          topic: sanitizedTopic,
          topicLength: sanitizedTopic.length,
          numQuestions,
          difficulty,
          wasTopicModified: topicValidation.wasModified,
          clientIp: request.ip,
        });

        // TODO: Implement actual quiz generation logic here
        // This would integrate with Ollama to generate quiz questions
        const quizData = {
          questions: [],
          topic: sanitizedTopic, // Return the sanitized version
          difficulty,
          numQuestions,
        };

        return reply.status(200).send({
          success: true,
          data: quizData,
          correlationId,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        // Never expose internal errors to clients
        logWithContext.error('Quiz generation processing error', {
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
