import type { FastifyInstance } from 'fastify';
import { healthRoutes } from './health.js';
import { searchRoutes } from './search.js';
import { chatRoutes } from './chat.js';
import { quizRoutes } from './quiz.js';
import { indexRoutes } from './index-routes.js';

export async function setupRoutes(server: FastifyInstance) {
  await server.register(healthRoutes, { prefix: '/health' });
  await server.register(searchRoutes, { prefix: '/api/search' });
  await server.register(chatRoutes, { prefix: '/api/chat' });
  await server.register(quizRoutes, { prefix: '/api/quiz' });
  await server.register(indexRoutes, { prefix: '/api/index' });

  server.get('/', async () => {
    return {
      message: 'Obsidian AI MVP API',
      version: '0.1.0',
      endpoints: {
        health: '/health',
        search: '/api/search',
        chat: '/api/chat',
        quiz: '/api/quiz',
        index: '/api/index',
      },
    };
  });
}
