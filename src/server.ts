// Load environment variables
import { existsSync, readFileSync } from 'fs';
if (existsSync('.env.local')) {
  const envContent = readFileSync('.env.local', 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, value] = trimmed.split('=');
      if (key && value && !process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

import Fastify from 'fastify'
import { config } from '@/config/environment'
import { registerRoutes } from '@/controllers'
import { chromaClient } from '@/integrations/chromadb'
import { ollamaClient } from '@/integrations/ollama'
import { fileProcessor } from '@/utils/file-processor'

const server = Fastify({
  logger: {
    level: config.LOG_LEVEL,
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    }
  },
  trustProxy: true
});

async function registerPlugins(fastify: typeof server): Promise<void> {
  // Register CORS
  await fastify.register(import('@fastify/cors'), {
    origin: config.CORS_ORIGINS.split(','),
    credentials: true
  });

  // Register Helmet for security
  await fastify.register(import('@fastify/helmet'), {
    global: true
  });
}

async function initializeServices(): Promise<void> {
  console.log('🔄 Initializing services...')

  try {
    // Validate vault path
    const vaultValidation = await fileProcessor.validateVaultPath()
    if (!vaultValidation.valid) {
      throw new Error(`Vault validation failed: ${vaultValidation.error}`)
    }
    console.log(`✅ Vault path validated: ${fileProcessor.getVaultPath()}`)

    // Try to connect to ChromaDB (non-blocking)
    try {
      await chromaClient.connect()
    } catch (error) {
      console.warn('⚠️ ChromaDB connection failed:', error instanceof Error ? error.message : error)
      console.warn('⚠️ ChromaDB integration will not be available')
    }

    // Check Ollama health (non-blocking)
    try {
      const ollamaHealth = await ollamaClient.healthCheck()
      if (ollamaHealth.status !== 'healthy') {
        console.warn('⚠️ Ollama health check failed:', ollamaHealth.details)
        console.warn('⚠️ Ollama integration will not be available')
      } else {
        console.log(`✅ Ollama connected: ${ollamaClient.getModelName()}`)
      }
    } catch (error) {
      console.warn('⚠️ Ollama health check failed:', error instanceof Error ? error.message : error)
      console.warn('⚠️ Ollama integration will not be available')
    }

    console.log('✅ Services initialized successfully')
  } catch (error) {
    console.error('❌ Service initialization failed:', error)
    throw error
  }
}

async function startServer(): Promise<void> {
  try {
    // Register plugins
    await registerPlugins(server)
    
    // Register routes
    await registerRoutes(server)
    
    // Initialize services
    await initializeServices()
    
    // Start server
    const address = await server.listen({ 
      port: config.PORT, 
      host: config.HOST 
    })
    
    console.log(`🚀 Server running at ${address}`)
  } catch (error) {
    server.log.error(error)
    process.exit(1)
  }
}

// Graceful shutdown
async function shutdown(): Promise<void> {
  console.log('📴 Shutting down server...')
  
  try {
    // Disconnect from ChromaDB
    await chromaClient.disconnect()
    
    // Close server
    await server.close()
    
    console.log('✅ Server shut down successfully')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error during shutdown:', error)
    process.exit(1)
  }
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

startServer();