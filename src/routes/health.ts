import type { FastifyInstance } from 'fastify';
import { chromaClient } from '../services/chromadb.js';
import { ollamaClient } from '../services/ollama.js';

export async function healthRoutes(server: FastifyInstance) {
  server.get('/', async (request, reply) => {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        chromadb: 'unknown',
        ollama: 'unknown',
      },
    };

    try {
      await chromaClient.heartbeat();
      health.services.chromadb = 'connected';
    } catch (error) {
      health.services.chromadb = 'disconnected';
    }

    try {
      await ollamaClient.ping();
      health.services.ollama = 'connected';
    } catch (error) {
      health.services.ollama = 'disconnected';
    }

    const overallHealthy = Object.values(health.services).every(
      status => status === 'connected'
    );

    return reply.status(overallHealthy ? 200 : 503).send({
      ...health,
      status: overallHealthy ? 'healthy' : 'degraded',
    });
  });
}
