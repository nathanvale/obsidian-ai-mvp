import type { FastifyInstance } from 'fastify'
import { registerHealthRoutes } from './health'

export async function registerRoutes(fastify: FastifyInstance): Promise<void> {
  // API info endpoint
  fastify.get('/api/info', async () => {
    return {
      name: 'Obsidian AI MVP',
      description: 'Local-first AI-powered Obsidian knowledge assistant',
      version: '0.1.0',
      endpoints: [
        { method: 'GET', path: '/health', description: 'Basic health check' },
        {
          method: 'GET',
          path: '/health/detailed',
          description: 'Detailed system health check',
        },
        {
          method: 'GET',
          path: '/health/vault',
          description: 'Vault health check',
        },
        {
          method: 'GET',
          path: '/health/chromadb',
          description: 'ChromaDB health check',
        },
        {
          method: 'GET',
          path: '/health/ollama',
          description: 'Ollama health check',
        },
        { method: 'GET', path: '/api/info', description: 'API information' },
      ],
    }
  })

  // Register health routes
  await registerHealthRoutes(fastify)

  // Future route registrations will go here
  // await registerSearchRoutes(fastify)
  // await registerChatRoutes(fastify)
  // await registerIndexingRoutes(fastify)
}
