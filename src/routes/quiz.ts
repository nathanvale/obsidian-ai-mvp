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
      body: generateQuizSchema,
      response: {
        200: z.object({
          questions: z.array(z.object({
            id: z.string(),
            question: z.string(),
            options: z.array(z.string()),
            correctAnswer: z.number(),
            explanation: z.string(),
          })),
          topic: z.string(),
          difficulty: z.string(),
        }),
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