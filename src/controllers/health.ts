import type { FastifyInstance } from 'fastify'
import { chromaClient } from '@/integrations/chromadb'
import { ollamaClient } from '@/integrations/ollama'
import { fileProcessor } from '@/utils/file-processor'

export async function registerHealthRoutes(fastify: FastifyInstance) {
  // Basic health check
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      environment: process.env.NODE_ENV || 'development',
    }
  })

  // Detailed system health check
  fastify.get('/health/detailed', async () => {
    const vaultValidation = await fileProcessor.validateVaultPath()
    const chromaHealth = await chromaClient.healthCheck()
    const ollamaHealth = await ollamaClient.healthCheck()

    const overall =
      vaultValidation.valid &&
      chromaHealth.status === 'healthy' &&
      ollamaHealth.status === 'healthy'

    return {
      status: overall ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        vault: {
          status: vaultValidation.valid ? 'healthy' : 'unhealthy',
          path: fileProcessor.getVaultPath(),
          error: vaultValidation.error,
        },
        chromadb: chromaHealth,
        ollama: ollamaHealth,
      },
    }
  })

  // Service-specific health checks
  fastify.get('/health/vault', async () => {
    const validation = await fileProcessor.validateVaultPath()
    return {
      status: validation.valid ? 'healthy' : 'unhealthy',
      path: fileProcessor.getVaultPath(),
      error: validation.error,
    }
  })

  fastify.get('/health/chromadb', async () => {
    return await chromaClient.healthCheck()
  })

  fastify.get('/health/ollama', async () => {
    return await ollamaClient.healthCheck()
  })
}
