import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error'])
    .default('info'),
  OBSIDIAN_VAULT_PATH: z.string(),
  CHROMADB_HOST: z.string().default('localhost'),
  CHROMADB_PORT: z.coerce.number().default(8000),
  CHROMADB_COLLECTION_NAME: z.string().default('obsidian_embeddings'),
  OLLAMA_HOST: z.string().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().default('nomic-embed-text'),
  MAX_BATCH_SIZE: z.coerce.number().default(100),
  MEMORY_LIMIT_MB: z.coerce.number().default(2048),
  PARALLEL_WORKERS: z.coerce.number().default(4),
  API_KEY_HEADER: z.string().default('X-API-Key'),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000,http://localhost:5173'),
})

export const config = envSchema.parse(process.env)
export type Config = z.infer<typeof envSchema>
