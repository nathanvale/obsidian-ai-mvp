# Obsidian AI MVP

A local-first AI-powered knowledge assistant for Obsidian vaults.

## Phase 1 - Core Infrastructure ✅

Phase 1 infrastructure is now complete with the following features:

### ✅ Completed Features

- **Bun + TypeScript Setup**: Fast runtime with native TypeScript support
- **Fastify API Server**: High-performance REST API with the following endpoints:
  - `GET /` - API information and available endpoints
  - `GET /health` - Health check for ChromaDB and Ollama services
  - `POST /api/search` - Semantic search (placeholder)
  - `POST /api/chat` - Conversational AI (placeholder)  
  - `POST /api/quiz/generate` - Quiz generation (placeholder)
  - `GET /api/index/status` - Indexing status
  - `POST /api/index/start` - Start indexing
  - `POST /api/index/stop` - Stop indexing
- **ChromaDB Integration**: Vector database connection and collection management
- **Ollama Integration**: Local LLM embedding generation
- **File System Access**: Secure Obsidian vault file reading and scanning
- **Environment Configuration**: Comprehensive config system with validation

## Prerequisites

1. **Bun**: Install from [bun.sh](https://bun.sh)
2. **Ollama**: Install and run with `nomic-embed-text` model
3. **ChromaDB**: Running locally (Docker or standalone)
4. **Obsidian Vault**: Accessible file path

## Quick Start

1. **Install Dependencies**:
   ```bash
   bun install
   ```

2. **Configure Environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your vault path and service URLs
   ```

3. **Start Services** (in separate terminals):
   ```bash
   # Start ChromaDB
   docker run -p 8000:8000 chromadb/chroma
   
   # Start Ollama and pull model
   ollama serve
   ollama pull nomic-embed-text
   ```

4. **Run Development Server**:
   ```bash
   bun run dev
   ```

5. **Test API**:
   ```bash
   curl http://localhost:3000/health
   ```

## Environment Variables

- `OBSIDIAN_VAULT_PATH`: Path to your Obsidian vault directory
- `CHROMADB_URL`: ChromaDB server URL (default: http://localhost:8000)
- `OLLAMA_URL`: Ollama server URL (default: http://localhost:11434)
- `OLLAMA_MODEL`: Embedding model (default: nomic-embed-text)
- `PORT`: Server port (default: 3000)
- `HOST`: Server host (default: localhost)

## Next Steps

Phase 1 provides the foundational infrastructure. The next phase will implement:

- Document processing and chunking
- Embedding generation and storage
- Incremental indexing system

## Architecture

```
├── src/
│   ├── config/           # Environment configuration
│   ├── routes/           # API endpoints
│   └── services/         # Core services
│       ├── chromadb.ts   # Vector database operations
│       ├── filesystem.ts # Vault file operations
│       └── ollama.ts     # LLM embedding generation
```

## Technology Stack

- **Runtime**: Bun
- **API Framework**: Fastify
- **Vector Database**: ChromaDB  
- **LLM Integration**: Ollama
- **Language**: TypeScript