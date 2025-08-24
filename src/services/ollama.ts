import { config } from '../config/environment.js';

interface OllamaEmbeddingResponse {
  embedding: number[];
}

interface OllamaEmbeddingRequest {
  model: string;
  prompt: string;
}

interface OllamaModelInfo {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
}

interface OllamaListResponse {
  models: OllamaModelInfo[];
}

class OllamaService {
  private baseUrl: string;
  private model: string;

  constructor() {
    this.baseUrl = config.ollamaUrl;
    this.model = config.ollamaModel;
  }

  async ping(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const requestBody: OllamaEmbeddingRequest = {
      model: this.model,
      prompt: text,
    };

    try {
      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
      }

      const result: OllamaEmbeddingResponse = await response.json();
      return result.embedding;
    } catch (error) {
      throw new Error(`Failed to generate embedding: ${error}`);
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    for (const text of texts) {
      const embedding = await this.generateEmbedding(text);
      embeddings.push(embedding);
    }

    return embeddings;
  }

  async batchGenerateEmbeddings(
    texts: string[],
    batchSize: number = 10
  ): Promise<number[][]> {
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchEmbeddings = await this.generateEmbeddings(batch);
      results.push(...batchEmbeddings);

      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  async listModels(): Promise<OllamaModelInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);

      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.status}`);
      }

      const result: OllamaListResponse = await response.json();
      return result.models;
    } catch (error) {
      throw new Error(`Failed to list models: ${error}`);
    }
  }

  async checkModelAvailability(): Promise<boolean> {
    try {
      const models = await this.listModels();
      return models.some(model => model.name.includes(this.model));
    } catch (error) {
      return false;
    }
  }

  async pullModel(modelName?: string): Promise<void> {
    const model = modelName || this.model;

    try {
      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: model }),
      });

      if (!response.ok) {
        throw new Error(`Failed to pull model: ${response.status}`);
      }
    } catch (error) {
      throw new Error(`Failed to pull model ${model}: ${error}`);
    }
  }

  getModelInfo(): { name: string; url: string } {
    return {
      name: this.model,
      url: this.baseUrl,
    };
  }
}

export const ollamaClient = new OllamaService();
