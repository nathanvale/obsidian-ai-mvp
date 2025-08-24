import type { FastifyInstance } from 'fastify';


export async function indexRoutes(server: FastifyInstance) {
  server.get('/status', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['idle', 'indexing', 'completed', 'error'] },
            progress: { type: 'number', minimum: 0, maximum: 1 },
            totalFiles: { type: 'number', minimum: 0 },
            processedFiles: { type: 'number', minimum: 0 },
            lastUpdated: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    return reply.status(200).send({
      status: 'idle' as const,
      progress: 0,
      totalFiles: 0,
      processedFiles: 0,
      lastUpdated: new Date().toISOString(),
    });
  });

  server.post('/start', async (request, reply) => {
    return reply.status(200).send({
      message: 'Indexing started',
      status: 'indexing',
    });
  });

  server.post('/stop', async (request, reply) => {
    return reply.status(200).send({
      message: 'Indexing stopped',
      status: 'idle',
    });
  });
}