// Core types for the Obsidian AI MVP

export interface MarkdownFile {
  path: string
  content: string
  lastModified: Date
  metadata?: Record<string, unknown>
}

export interface TextChunk {
  id: string
  content: string
  metadata: {
    filePath: string
    chunkIndex: number
    startLine?: number
    endLine?: number
  }
}

export interface EmbeddingResult {
  embedding: number[]
  chunkId: string
}

export interface SearchQuery {
  query: string
  limit?: number
  threshold?: number
}

export interface SearchResult {
  chunk: TextChunk
  similarity: number
  metadata: {
    filePath: string
    relevanceScore: number
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

export interface ChatSession {
  id: string
  messages: ChatMessage[]
  createdAt: Date
  updatedAt: Date
}
