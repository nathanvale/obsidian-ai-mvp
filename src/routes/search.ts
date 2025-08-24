import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const searchRequestSchema = z.object({
  query: z.string().min(1, 'Query cannot be empty'),
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
            query: { type: 'string', minLength: 1 },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 10 },
            threshold: { type: 'number', minimum: 0, maximum: 1, default: 0.3 },
          },
          required: ['query'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              results: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    content: { type: 'string' },
                    metadata: { type: 'object' },
                    score: { type: 'number' },
                  },
                },
              },
              query: { type: 'string' },
              total: { type: 'number' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { query, limit, threshold } = request.body as z.infer<
        typeof searchRequestSchema
      >;

      return reply.status(200).send({
        results: [],
        query,
        total: 0,
        limit,
        threshold,
      });
    }
  );
}
