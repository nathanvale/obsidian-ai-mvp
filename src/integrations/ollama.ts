import { config } from '@/config/environment'
import type { TextChunk, EmbeddingResult } from '@/types'

export interface OllamaEmbedResponse {
  embedding: number[]
}

export interface OllamaChatResponse {
  model: string
  created_at: string
  response: string
  done: boolean
  context?: number[]
  total_duration?: number
  load_duration?: number
  prompt_eval_count?: number
  prompt_eval_duration?: number
  eval_count?: number
  eval_duration?: number
}

export class OllamaClient {
  private baseUrl: string
  private model: string
  private isHealthy = false

  constructor() {
    this.baseUrl = config.OLLAMA_HOST
    this.model = config.OLLAMA_MODEL
  }

  async healthCheck(): Promise<{ status: string; details?: any }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      const availableModels = data.models || []
      const modelExists = availableModels.some(
        (model: any) => model.name === this.model,
      )

      this.isHealthy = response.ok && modelExists

      return {
        status: this.isHealthy ? 'healthy' : 'unhealthy',
        details: {
          baseUrl: this.baseUrl,
          model: this.model,
          modelExists,
          availableModels: availableModels.map((m: any) => m.name),
        },
      }
    } catch (error) {
      this.isHealthy = false
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : error,
          baseUrl: this.baseUrl,
          model: this.model,
        },
      }
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt: text,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data: OllamaEmbedResponse = await response.json()
      return data.embedding
    } catch (error) {
      console.error('❌ Failed to generate embedding:', error)
      throw new Error(`Failed to generate embedding: ${error}`)
    }
  }

  async generateEmbeddings(chunks: TextChunk[]): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = []
    const batchSize = config.MAX_BATCH_SIZE

    console.log(
      `🔄 Generating embeddings for ${chunks.length} chunks (batch size: ${batchSize})`,
    )

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize)
      console.log(
        `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}`,
      )

      const batchPromises = batch.map(async (chunk) => {
        try {
          const embedding = await this.generateEmbedding(chunk.content)
          return {
            embedding,
            chunkId: chunk.id,
          }
        } catch (error) {
          console.error(
            `Failed to generate embedding for chunk ${chunk.id}:`,
            error,
          )
          throw error
        }
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      // Add a small delay between batches to avoid overwhelming Ollama
      if (i + batchSize < chunks.length) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    console.log(`✅ Generated ${results.length} embeddings`)
    return results
  }

  async generateChatCompletion(
    messages: Array<{ role: string; content: string }>,
    systemPrompt?: string,
  ): Promise<string> {
    try {
      const prompt = this.formatPrompt(messages, systemPrompt)

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model.replace('nomic-embed-text', 'llama2'), // Use a chat model
          prompt,
          stream: false,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data: OllamaChatResponse = await response.json()
      return data.response
    } catch (error) {
      console.error('❌ Failed to generate chat completion:', error)
      throw new Error(`Failed to generate chat completion: ${error}`)
    }
  }

  private formatPrompt(
    messages: Array<{ role: string; content: string }>,
    systemPrompt?: string,
  ): string {
    let prompt = ''

    if (systemPrompt) {
      prompt += `System: ${systemPrompt}\n\n`
    }

    for (const message of messages) {
      if (message.role === 'user') {
        prompt += `Human: ${message.content}\n\n`
      } else if (message.role === 'assistant') {
        prompt += `Assistant: ${message.content}\n\n`
      }
    }

    prompt += 'Assistant: '
    return prompt
  }

  async pullModel(modelName?: string): Promise<void> {
    const model = modelName || this.model

    try {
      console.log(`🔄 Pulling model: ${model}`)

      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: model,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      console.log(`✅ Successfully pulled model: ${model}`)
    } catch (error) {
      console.error(`❌ Failed to pull model ${model}:`, error)
      throw new Error(`Failed to pull model ${model}: ${error}`)
    }
  }

  getModelName(): string {
    return this.model
  }

  getBaseUrl(): string {
    return this.baseUrl
  }

  isModelHealthy(): boolean {
    return this.isHealthy
  }
}

// Singleton instance
export const ollamaClient = new OllamaClient()
