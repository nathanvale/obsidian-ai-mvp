# Technical Stack

> Last Updated: 2025-08-23
> Version: 1.0.0

## Core Technologies

### Runtime Environment
- **Runtime:** Bun
- **Version:** Latest stable
- **Language:** TypeScript

### Database & Vector Storage
- **Vector Database:** ChromaDB
- **Version:** Latest stable
- **Purpose:** Vector embeddings storage and similarity search

## Backend Stack

### API Framework
- **Framework:** Fastify
- **Version:** Latest stable
- **Purpose:** Lightweight, high-performance API server

### Local AI Integration
- **LLM Runtime:** Ollama
- **Embedding Model:** nomic-embed-text
- **Purpose:** Local embedding generation and AI processing

### File Processing
- **File System:** Node.js fs module
- **Markdown Processing:** Custom TypeScript implementation
- **Text Chunking:** Intelligent semantic chunking algorithms

## Frontend Stack (Future)

### JavaScript Framework
- **Framework:** React (planned)
- **Version:** Latest stable
- **Build Tool:** Vite

### CSS Framework
- **Framework:** TailwindCSS (planned)
- **Version:** 4.0+

### UI Components
- **Library:** To be determined
- **Implementation:** React components

## Development Tools

### Package Management
- **Package Manager:** Bun
- **Lock File:** bun.lockb
- **Node Compatibility:** Full Node.js module support

### Development Environment
- **Language:** TypeScript
- **Type Checking:** Built-in Bun TypeScript support
- **Hot Reload:** Bun development server

### Code Quality
- **Linting:** To be configured
- **Formatting:** To be configured
- **Testing Framework:** To be determined

## Infrastructure

### Local Services
- **ChromaDB:** Local Docker container or standalone
- **Ollama:** Local installation
- **File System:** Direct access to Obsidian vault directory

### Deployment
- **Environment:** Local development machine
- **Process Management:** Direct Bun execution
- **Configuration:** Environment variables

### Data Storage
- **Vault Access:** Read-only access to Obsidian markdown files
- **Vector Storage:** ChromaDB local persistence
- **Configuration:** Local environment variables

## API Architecture

### Service Layer
- **Indexing Service:** Processes markdown files and generates embeddings
- **Search Service:** Handles semantic search queries
- **Quiz Service:** Generates quizzes from knowledge base content
- **Chat Service:** Provides conversational AI interface

### Data Flow
- **Input:** Obsidian markdown files
- **Processing:** Text chunking → Embedding generation → Vector storage
- **Output:** RESTful API endpoints for search, quiz, and chat functionality

## Security & Privacy

### Local-First Architecture
- **External Dependencies:** None for core AI functionality
- **Data Privacy:** All processing occurs locally
- **Network Requirements:** Only for initial setup and model downloads

### File System Access
- **Permissions:** Read-only access to specified Obsidian vault
- **Security:** No file modification capabilities
- **Isolation:** Sandboxed access pattern

## Performance Considerations

### Optimization Strategy
- **Batch Processing:** Efficient embedding generation for large vaults
- **Caching:** Vector embeddings persistence in ChromaDB
- **Memory Management:** Streaming file processing for large notes
- **Concurrent Processing:** Parallel embedding generation where possible

### Scalability
- **Vault Size:** Designed to handle large knowledge bases (1000+ notes)
- **Real-time Updates:** Incremental indexing for modified files
- **Resource Usage:** Optimized for local machine constraints