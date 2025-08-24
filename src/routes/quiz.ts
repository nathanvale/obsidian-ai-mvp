import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const generateQuizSchema = z.object({
  topic: z.string().min(1, 'Topic cannot be empty'),
  numQuestions: z.number().int().positive().max(20).default(5),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
});

export async function quizRoutes(server: FastifyInstance) {
  server.post('/generate', {
    schema: {
      body: {
        type: 'object',
        properties: {
          topic: { type: 'string', minLength: 1 },
          numQuestions: { type: 'number', minimum: 1, maximum: 20, default: 5 },
          difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'], default: 'medium' },
        },
        required: ['topic'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            questions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  question: { type: 'string' },
                  options: { type: 'array', items: { type: 'string' } },
                  correctAnswer: { type: 'number' },
                  explanation: { type: 'string' },
                },
              },
            },
            topic: { type: 'string' },
            difficulty: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { topic, numQuestions, difficulty } = request.body as z.infer<typeof generateQuizSchema>;

    return reply.status(200).send({
      questions: [],
      topic,
      difficulty,
    });
  });
}