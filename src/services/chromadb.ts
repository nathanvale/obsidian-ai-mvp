import { ChromaClient } from 'chromadb';
import { config } from '../config/environment.js';
import { logWithContext } from './logger.js';

class ChromaDBService {
  private client: ChromaClient;
  private readonly collectionName = 'obsidian_knowledge';

  constructor() {
    this.client = new ChromaClient({
      path: config.chromaDbUrl,
    });
  }

  async initialize(): Promise<void> {
    try {
      await this.client.heartbeat();
    } catch (error) {
      throw new Error(`Failed to initialize ChromaDB: ${error}`);
    }
  }

  async heartbeat(): Promise<void> {
    await this.client.heartbeat();
  }

  async getCollection() {
    return await this.client.getOrCreateCollection({
      name: this.collectionName,
      metadata: {
        description: 'Obsidian knowledge base embeddings',
        created_at: new Date().toISOString(),
      },
    });
  }

  async addDocuments(
    documents: string[],
    metadatas: Record<string, string | number | boolean>[],
    ids: string[],
    embeddings: number[][]
  ): Promise<void> {
    const collection = await this.getCollection();

    await collection.add({
      embeddings,
      metadatas,
      documents,
      ids,
    });
  }

  async query(
    queryEmbeddings: number[][],
    numResults: number = 10,
    where?: Record<string, unknown>
  ) {
    const collection = await this.getCollection();

    const result = await collection.query({
      queryEmbeddings,
      nResults: numResults,
      where,
    });

    return {
      ids: result.ids || [],
      distances: result.distances || [],
      metadatas: result.metadatas || [],
      documents: result.documents || [],
    };
  }

  async deleteCollection(): Promise<void> {
    try {
      await this.client.deleteCollection({ name: this.collectionName });
    } catch (error) {
      logWithContext.warn('Failed to delete collection', { 
        collectionName: this.collectionName,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async getCollectionInfo() {
    const collection = await this.getCollection();
    const count = await collection.count();

    return {
      name: this.collectionName,
      count: count,
      metadata: {},
    };
  }

  async upsertDocument(
    id: string,
    document: string,
    metadata: Record<string, string | number | boolean>,
    embedding: number[]
  ): Promise<void> {
    const collection = await this.getCollection();

    await collection.upsert({
      ids: [id],
      embeddings: [embedding],
      documents: [document],
      metadatas: [metadata],
    });
  }

  async deleteDocuments(ids: string[]): Promise<void> {
    const collection = await this.getCollection();
    await collection.delete({ ids });
  }
}

export const chromaClient = new ChromaDBService();