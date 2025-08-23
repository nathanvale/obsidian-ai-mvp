import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const chatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  context: z.array(z.string()).optional(),
});

export async function chatRoutes(server: FastifyInstance) {
  server.post('/', {
    schema: {
      body: chatRequestSchema,
      response: {
        200: z.object({
          response: z.string(),
          context: z.array(z.string()),
        }),
      },
    },
  }, async (request, reply) => {
    const { message, context = [] } = request.body as z.infer<typeof chatRequestSchema>;

    return reply.status(200).send({
      response: `This is a placeholder response to: "${message}"`,
      context,
    });
  });
}