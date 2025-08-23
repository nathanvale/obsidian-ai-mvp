import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('localhost'),
  OBSIDIAN_VAULT_PATH: z.string().optional(),
  CHROMADB_URL: z.string().default('http://localhost:8000'),
  OLLAMA_URL: z.string().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().default('nomic-embed-text'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),
});

const env = envSchema.parse(process.env);

export const config = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  host: env.HOST,
  obsidianVaultPath: env.OBSIDIAN_VAULT_PATH,
  chromaDbUrl: env.CHROMADB_URL,
  ollamaUrl: env.OLLAMA_URL,
  ollamaModel: env.OLLAMA_MODEL,
  logLevel: env.LOG_LEVEL,
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
};