# Obsidian AI Agent MVP Setup Guide

## 🎯 MVP Goal
Create a local semantic search system for your Obsidian vault using TypeScript, Bun, and ChromaDB that can:
1. Index your Obsidian markdown files
2. Provide semantic search via API
3. Generate contextual quizzes
4. Work entirely locally (no external APIs required)

## 📋 Prerequisites & Setup

```bash
# Install Bun (if not already installed)
## 🚀 Step 8: Main Server

**src/server.ts**
```typescript
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { registerRoutes } from './api/routes.js';

const VAULT_PATH = process.env.OBSIDIAN_VAULT_PATH || './vault';
const PORT = parseInt(process.env.PORT || '3000');
const HOST = process.env.HOST || 'localhost';

async function startServer() {
  const fastify = Fastify({ 
    logger: true,
    bodyLimit: 10485760 // 10MB
  });

  // Register CORS
  await fastify.register(cors, {
    origin: true
  });

  // Register routes
  await registerRoutes(fastify, VAULT_PATH);

  try {
    await fastify.listen({ port: PORT, host: HOST });
    console.log(`
🚀 Obsidian AI Agent MVP Server Started!

📍 Server: http://${HOST}:${PORT}
📁 Vault: ${VAULT_PATH}
🤖 LLM: Ollama (http://localhost:11434)
🗃️ Vector DB: ChromaDB (http://localhost:8000)

Available endpoints:
• GET  /health          - Health check & stats
• POST /index           - Index your vault
• GET  /search?q=...    - Semantic search
• POST /quiz            - Generate quiz
• POST /chat            - Chat with your notes

Next steps:
1. Index your vault: curl -X POST http://${HOST}:${PORT}/index
2. Search: http://${HOST}:${PORT}/search?q=your+query
    `);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

startServer();
```

## 📦 Step 9: Configuration Files

**package.json**
```json
{
  "name": "obsidian-ai-mvp",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "bun --watch src/server.ts",
    "start": "bun src/server.ts",
    "build": "bun build src/server.ts --outdir dist",
    "setup": "bun install && bun run services:start",
    "services:start": "docker-compose up -d",
    "services:stop": "docker-compose down",
    "services:logs": "docker-compose logs -f"
  },
  "dependencies": {
    "chromadb": "^1.8.1",
    "fastify": "^4.24.3",
    "@fastify/cors": "^9.0.1",
    "gray-matter": "^4.0.3"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0"
  }
}
```

**tsconfig.json**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "allowJs": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**docker-compose.yml**
```yaml
version: '3.8'
services:
  chromadb:
    image: chromadb/chroma:latest
    ports:
      - "8000:8000"
    volumes:
      - chromadb_data:/chroma/chroma
    environment:
      - CHROMA_SERVER_AUTHN_CREDENTIALS_FILE=/chroma/server.htpasswd
      - CHROMA_SERVER_AUTHN_PROVIDER=chromadb.auth.basic.BasicAuthenticationServerProvider
    command: uvicorn chromadb.app:app --host 0.0.0.0 --port 8000

volumes:
  chromadb_data:
    driver: local
```

## 🎯 Step 10: Quick Start Guide

**1. Start Services**
```bash
# Start ChromaDB
bun run services:start

# Start Ollama (in separate terminal)
ollama serve

# Verify Ollama models are ready
ollama list
```

**2. Setup Environment**
```bash
# Set your Obsidian vault path
export OBSIDIAN_VAULT_PATH="/path/to/your/obsidian/vault"

# Or create a .env file
echo 'OBSIDIAN_VAULT_PATH="/path/to/your/obsidian/vault"' > .env
```

**3. Install & Run**
```bash
bun install
bun run dev
```

**4. Index Your Vault**
```bash
# Index your vault (do this first!)
curl -X POST http://localhost:3000/index
```

**5. Test Semantic Search**
```bash
# Search your notes
curl "http://localhost:3000/search?q=productivity+tips"

# Generate a quiz
curl -X POST http://localhost:3000/quiz \
  -H "Content-Type: application/json" \
  -d '{"topic": "javascript", "numQuestions": 3}'

# Chat with your notes
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What are my main takeaways about productivity?"}'
```

## 🎨 Step 11: Simple Web Interface (Optional)

**public/index.html**
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Obsidian AI Search</title>
    <style>
        body { font-family: system-ui; max-width: 800px; margin: 0 auto; padding: 2rem; }
        .search-box { width: 100%; padding: 1rem; font-size: 1.2rem; margin-bottom: 2rem; }
        .result { border: 1px solid #ddd; padding: 1rem; margin-bottom: 1rem; border-radius: 8px; }
        .result-header { font-weight: bold; color: #333; }
        .result-path { color: #666; font-size: 0.9rem; }
        .result-content { margin-top: 0.5rem; }
        .similarity { background: #e3f2fd; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem; }
    </style>
</head>
<body>
    <h1>🧠 Obsidian AI Search</h1>
    <input type="text" id="searchBox" class="search-box" placeholder="Search your notes semantically..." />
    <div id="results"></div>

    <script>
        const searchBox = document.getElementById('searchBox');
        const resultsDiv = document.getElementById('results');
        
        let timeout;
        searchBox.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(search, 300);
        });
        
        async function search() {
            const query = searchBox.value.trim();
            if (!query) {
                resultsDiv.innerHTML = '';
                return;
            }
            
            try {
                const response = await fetch(`/search?q=${encodeURIComponent(query)}`);
                const data = await response.json();
                
                resultsDiv.innerHTML = data.results.map(result => `
                    <div class="result">
                        <div class="result-header">
                            ${result.heading || 'Untitled Section'}
                            <span class="similarity">${Math.round(result.similarity * 100)}% match</span>
                        </div>
                        <div class="result-path">${result.notePath}</div>
                        <div class="result-content">${result.content.substring(0, 300)}${result.content.length > 300 ? '...' : ''}</div>
                    </div>
                `).join('');
                
            } catch (error) {
                resultsDiv.innerHTML = `<div class="result">Error: ${error.message}</div>`;
            }
        }
    </script>
</body>
</html>
```

## 🔧 Advanced Configuration

**Environment Variables**
```bash
# .env file
OBSIDIAN_VAULT_PATH="/Users/you/Documents/ObsidianVault"
PORT=3000
HOST=localhost
OLLAMA_URL=http://localhost:11434
CHROMADB_URL=http://localhost:8000
EMBEDDING_MODEL=nomic-embed-text
CHAT_MODEL=llama3.2:3b
```

## 🚀 Production Deployment

**For production**, consider:

1. **Process Management**: Use PM2 or systemd
2. **Reverse Proxy**: Nginx or Caddy
3. **SSL/TLS**: Let's Encrypt certificates
4. **Monitoring**: Add health checks and logging
5. **Backup**: Regular ChromaDB data backups
6. **Security**: API authentication and rate limiting

This MVP gives you a powerful, completely local AI-powered semantic search system for your Obsidian vault with quiz generation and chat capabilities! 🎉

## 🏗️ Project Structure

```
obsidian-ai-mvp/
├── src/
│   ├── types/
│   │   └── index.ts
│   ├── services/
│   │   ├── embeddings.ts
│   │   ├── vectordb.ts
│   │   └── obsidian.ts
│   ├── api/
│   │   └── routes.ts
│   ├── utils/
│   │   └── chunking.ts
│   └── server.ts
├── package.json
├── tsconfig.json
├── docker-compose.yml
└── README.md
```

## 🚀 Step 1: Initialize Project

```bash
mkdir obsidian-ai-mvp
cd obsidian-ai-mvp

# Initialize with Bun
bun init

# Install dependencies
bun add chromadb fastify @fastify/cors gray-matter
bun add -d @types/node typescript

# Create directory structure
mkdir -p src/{types,services,api,utils}
```

## 📝 Step 2: Core Type Definitions

**src/types/index.ts**
```typescript
export interface ObsidianNote {
  id: string;
  path: string;
  title: string;
  content: string;
  metadata: Record<string, any>;
  chunks: NoteChunk[];
  lastModified: Date;
}

export interface NoteChunk {
  id: string;
  content: string;
  heading?: string;
  noteId: string;
  notePath: string;
  startIndex: number;
  endIndex: number;
}

export interface SearchResult {
  chunk: NoteChunk;
  note: ObsidianNote;
  similarity: number;
  context?: string;
}

export interface EmbeddingResponse {
  embedding: number[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  source: string;
}
```

## 🔧 Step 3: Local LLM Embedding Service

**src/services/embeddings.ts**
```typescript
export class LocalEmbeddingService {
  private ollamaUrl: string;
  private model: string;

  constructor(ollamaUrl = 'http://localhost:11434', model = 'nomic-embed-text') {
    this.ollamaUrl = ollamaUrl;
    this.model = model;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json();
      return data.embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    
    // Process in batches to avoid overwhelming the local LLM
    const batchSize = 5;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchPromises = batch.map(text => this.generateEmbedding(text));
      const batchResults = await Promise.all(batchPromises);
      embeddings.push(...batchResults);
      
      // Small delay to be gentle on local resources
      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return embeddings;
  }

  async generateChatCompletion(prompt: string, model = 'llama3.2:3b'): Promise<string> {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Error generating chat completion:', error);
      throw error;
    }
  }
}
```

## 🗃️ Step 4: ChromaDB Vector Database Service

**src/services/vectordb.ts**
```typescript
import { ChromaClient, Collection } from 'chromadb';
import { LocalEmbeddingService } from './embeddings.js';
import type { NoteChunk, SearchResult } from '../types/index.js';

export class VectorDBService {
  private client: ChromaClient;
  private collection: Collection | null = null;
  private embeddingService: LocalEmbeddingService;
  private collectionName = 'obsidian-notes';

  constructor() {
    this.client = new ChromaClient({ path: 'http://localhost:8000' });
    this.embeddingService = new LocalEmbeddingService();
  }

  async initialize(): Promise<void> {
    try {
      // Try to get existing collection first
      try {
        this.collection = await this.client.getCollection({ 
          name: this.collectionName 
        });
        console.log('✅ Connected to existing ChromaDB collection');
      } catch (error) {
        // Collection doesn't exist, create it
        this.collection = await this.client.createCollection({ 
          name: this.collectionName 
        });
        console.log('✅ Created new ChromaDB collection');
      }
    } catch (error) {
      console.error('❌ Failed to initialize ChromaDB:', error);
      throw error;
    }
  }

  async addChunks(chunks: NoteChunk[]): Promise<void> {
    if (!this.collection) throw new Error('Collection not initialized');
    
    console.log(`📝 Processing ${chunks.length} chunks for embedding...`);
    
    const texts = chunks.map(chunk => chunk.content);
    const embeddings = await this.embeddingService.generateBatchEmbeddings(texts);
    
    const ids = chunks.map(chunk => chunk.id);
    const metadatas = chunks.map(chunk => ({
      noteId: chunk.noteId,
      notePath: chunk.notePath,
      heading: chunk.heading || '',
      startIndex: chunk.startIndex,
      endIndex: chunk.endIndex,
    }));

    await this.collection.add({
      ids,
      embeddings,
      documents: texts,
      metadatas,
    });

    console.log(`✅ Added ${chunks.length} chunks to vector database`);
  }

  async search(query: string, limit = 10): Promise<SearchResult[]> {
    if (!this.collection) throw new Error('Collection not initialized');

    console.log(`🔍 Searching for: "${query}"`);
    
    const queryEmbedding = await this.embeddingService.generateEmbedding(query);
    
    const results = await this.collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: limit,
    });

    const searchResults: SearchResult[] = [];
    
    if (results.ids && results.distances && results.documents && results.metadatas) {
      for (let i = 0; i < results.ids[0].length; i++) {
        const metadata = results.metadatas[0][i] as any;
        const chunk: NoteChunk = {
          id: results.ids[0][i],
          content: results.documents[0][i] || '',
          heading: metadata.heading,
          noteId: metadata.noteId,
          notePath: metadata.notePath,
          startIndex: metadata.startIndex,
          endIndex: metadata.endIndex,
        };

        searchResults.push({
          chunk,
          note: {} as any, // Will be populated by the API layer
          similarity: 1 - (results.distances[0][i] || 0), // Convert distance to similarity
          context: chunk.heading ? `## ${chunk.heading}` : undefined,
        });
      }
    }

    console.log(`📊 Found ${searchResults.length} results`);
    return searchResults;
  }

  async deleteCollection(): Promise<void> {
    if (this.collection) {
      await this.client.deleteCollection({ name: this.collectionName });
      this.collection = null;
      console.log('🗑️ Deleted collection');
    }
  }

  async getStats(): Promise<{ count: number }> {
    if (!this.collection) throw new Error('Collection not initialized');
    
    const count = await this.collection.count();
    return { count };
  }
}
```