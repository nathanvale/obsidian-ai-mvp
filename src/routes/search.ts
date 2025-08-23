import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const searchRequestSchema = z.object({
  query: z.string().min(1, 'Query cannot be empty'),
  limit: z.number().int().positive().max(100).default(10),
  threshold: z.number().min(0).max(1).default(0.3),
});

export async function searchRoutes(server: FastifyInstance) {
  server.post('/', {
    schema: {
      body: searchRequestSchema,
      response: {
        200: z.object({
          results: z.array(z.object({
            id: z.string(),
            content: z.string(),
            metadata: z.record(z.any()),
            score: z.number(),
          })),
          query: z.string(),
          total: z.number(),
        }),
      },
    },
  }, async (request, reply) => {
    const { query, limit, threshold } = request.body as z.infer<typeof searchRequestSchema>;

    return reply.status(200).send({
      results: [],
      query,
      total: 0,
    });
  });
}