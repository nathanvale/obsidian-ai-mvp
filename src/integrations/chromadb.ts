import { ChromaClient } from 'chromadb'
import { config } from '@/config/environment'
import type { TextChunk, EmbeddingResult, SearchResult } from '@/types'

export class ChromaDBClient {
  private client: ChromaClient
  private collection: any
  private isConnected = false

  constructor() {
    this.client = new ChromaClient({
      path: `http://${config.CHROMADB_HOST}:${config.CHROMADB_PORT}`,
    })
  }

  async connect(): Promise<void> {
    try {
      // Test connection
      await this.client.heartbeat()

      // Get or create collection
      this.collection = await this.client.getOrCreateCollection({
        name: config.CHROMADB_COLLECTION_NAME,
        metadata: {
          description: 'Obsidian AI MVP embeddings collection',
          created: new Date().toISOString(),
        },
      })

      this.isConnected = true
      console.log(
        `✅ Connected to ChromaDB collection: ${config.CHROMADB_COLLECTION_NAME}`,
      )
    } catch (error) {
      this.isConnected = false
      console.error('❌ Failed to connect to ChromaDB:', error)
      throw new Error(`ChromaDB connection failed: ${error}`)
    }
  }

  async disconnect(): Promise<void> {
    this.isConnected = false
    console.log('📴 Disconnected from ChromaDB')
  }

  isHealthy(): boolean {
    return this.isConnected
  }

  async healthCheck(): Promise<{ status: string; details?: any }> {
    try {
      const heartbeat = await this.client.heartbeat()
      return {
        status: 'healthy',
        details: {
          heartbeat,
          collection: config.CHROMADB_COLLECTION_NAME,
          connected: this.isConnected,
        },
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error instanceof Error ? error.message : error },
      }
    }
  }

  async addEmbeddings(
    embeddings: EmbeddingResult[],
    chunks: TextChunk[],
  ): Promise<void> {
    if (!this.isConnected || !this.collection) {
      throw new Error('ChromaDB not connected')
    }

    try {
      const ids = chunks.map((chunk) => chunk.id)
      const embeddingVectors = embeddings.map((emb) => emb.embedding)
      const metadatas = chunks.map((chunk) => ({
        filePath: chunk.metadata.filePath,
        chunkIndex: chunk.metadata.chunkIndex,
        startLine: chunk.metadata.startLine,
        endLine: chunk.metadata.endLine,
      }))
      const documents = chunks.map((chunk) => chunk.content)

      await this.collection.add({
        ids,
        embeddings: embeddingVectors,
        metadatas,
        documents,
      })

      console.log(`✅ Added ${embeddings.length} embeddings to ChromaDB`)
    } catch (error) {
      console.error('❌ Failed to add embeddings:', error)
      throw new Error(`Failed to add embeddings: ${error}`)
    }
  }

  async updateEmbedding(
    embeddingResult: EmbeddingResult,
    chunk: TextChunk,
  ): Promise<void> {
    if (!this.isConnected || !this.collection) {
      throw new Error('ChromaDB not connected')
    }

    try {
      await this.collection.update({
        ids: [chunk.id],
        embeddings: [embeddingResult.embedding],
        metadatas: [
          {
            filePath: chunk.metadata.filePath,
            chunkIndex: chunk.metadata.chunkIndex,
            startLine: chunk.metadata.startLine,
            endLine: chunk.metadata.endLine,
          },
        ],
        documents: [chunk.content],
      })

      console.log(`✅ Updated embedding for chunk: ${chunk.id}`)
    } catch (error) {
      console.error('❌ Failed to update embedding:', error)
      throw new Error(`Failed to update embedding: ${error}`)
    }
  }

  async deleteEmbedding(chunkId: string): Promise<void> {
    if (!this.isConnected || !this.collection) {
      throw new Error('ChromaDB not connected')
    }

    try {
      await this.collection.delete({
        ids: [chunkId],
      })

      console.log(`✅ Deleted embedding for chunk: ${chunkId}`)
    } catch (error) {
      console.error('❌ Failed to delete embedding:', error)
      throw new Error(`Failed to delete embedding: ${error}`)
    }
  }

  async searchSimilar(
    queryEmbedding: number[],
    limit = 10,
    threshold = 0.7,
  ): Promise<SearchResult[]> {
    if (!this.isConnected || !this.collection) {
      throw new Error('ChromaDB not connected')
    }

    try {
      const results = await this.collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: limit,
      })

      const searchResults: SearchResult[] = []

      if (results.ids && results.ids[0]) {
        for (let i = 0; i < results.ids[0].length; i++) {
          const id = results.ids[0][i]
          const distance = results.distances?.[0]?.[i] || 0
          const similarity = 1 - distance // Convert distance to similarity
          const document = results.documents?.[0]?.[i] || ''
          const metadata = results.metadatas?.[0]?.[i] || {}

          // Apply threshold filter
          if (similarity >= threshold) {
            searchResults.push({
              chunk: {
                id,
                content: document,
                metadata: {
                  filePath: metadata.filePath || '',
                  chunkIndex: metadata.chunkIndex || 0,
                  startLine: metadata.startLine,
                  endLine: metadata.endLine,
                },
              },
              similarity,
              metadata: {
                filePath: metadata.filePath || '',
                relevanceScore: similarity,
              },
            })
          }
        }
      }

      console.log(
        `🔍 Found ${searchResults.length} similar chunks (threshold: ${threshold})`,
      )
      return searchResults
    } catch (error) {
      console.error('❌ Failed to search embeddings:', error)
      throw new Error(`Failed to search embeddings: ${error}`)
    }
  }

  async getCollectionInfo(): Promise<{
    count: number
    name: string
    metadata?: any
  }> {
    if (!this.isConnected || !this.collection) {
      throw new Error('ChromaDB not connected')
    }

    try {
      const count = await this.collection.count()
      return {
        count,
        name: config.CHROMADB_COLLECTION_NAME,
        metadata: this.collection.metadata,
      }
    } catch (error) {
      console.error('❌ Failed to get collection info:', error)
      throw new Error(`Failed to get collection info: ${error}`)
    }
  }

  async clearCollection(): Promise<void> {
    if (!this.isConnected || !this.collection) {
      throw new Error('ChromaDB not connected')
    }

    try {
      await this.client.deleteCollection({
        name: config.CHROMADB_COLLECTION_NAME,
      })

      // Recreate the collection
      this.collection = await this.client.getOrCreateCollection({
        name: config.CHROMADB_COLLECTION_NAME,
        metadata: {
          description: 'Obsidian AI MVP embeddings collection',
          created: new Date().toISOString(),
        },
      })

      console.log(`🗑️ Cleared collection: ${config.CHROMADB_COLLECTION_NAME}`)
    } catch (error) {
      console.error('❌ Failed to clear collection:', error)
      throw new Error(`Failed to clear collection: ${error}`)
    }
  }
}

// Singleton instance
export const chromaClient = new ChromaDBClient()
