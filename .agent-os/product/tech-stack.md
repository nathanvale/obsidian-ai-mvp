# Technical Stack

> Last Updated: 2025-08-24
> Version: 1.0.0

## Core Technologies

### Application Framework

- **Runtime:** Bun 1.2.20+
- **Version:** Latest stable
- **Language:** TypeScript with strict mode

### API Framework

- **Framework:** Fastify 4.24.3+
- **Middleware:** CORS, Helmet for security
- **Validation:** JSON Schema for route validation
- **Logging:** @orchestr8/logger with structured logging

### Database Systems

- **Vector Database:** ChromaDB 1.7.3+ for semantic search
- **Document Storage:** Obsidian vault (markdown files)
- **Configuration:** Environment-based with Zod validation

## AI & Processing Stack

### Local LLM Integration

- **Service:** Ollama (localhost:11434)
- **Model:** nomic-embed-text for embeddings
- **Processing:** Local-first, no cloud dependencies
- **Batch Processing:** Built-in rate limiting and batching

### Voice Processing

- **Transcription:** Whisper (to be implemented)
- **File Monitoring:** Chokidar for .m4a file detection
- **Source:** Apple Watch voice memos via iCloud sync

### Semantic Search

- **Engine:** ChromaDB collections with metadata
- **Embeddings:** Generated via Ollama service
- **Collections:** Domain-specific (voice, email, tasks, notes)

## Infrastructure

### Development Environment

- **Package Manager:** Bun (preferred), npm (fallback)
- **Build Tool:** Bun native compilation
- **Hot Reload:** Bun --watch for development

### Monitoring & Resilience

- **Circuit Breakers:** @orchestr8/resilience 1.0.0+
- **Retry Policies:** Service-specific configurations
- **Logging:** Correlation ID tracking with @orchestr8/logger
- **Health Checks:** Automated service connectivity monitoring

### File System Integration

- **Vault Access:** Direct file system monitoring
- **File Watching:** Native fs.watch with recursive monitoring
- **Security:** Path validation and vault boundary enforcement

## External Integrations

### Email & Calendar

- **Gmail API:** @google-cloud/local-auth for OAuth2
- **Calendar API:** Google Calendar integration
- **Processing:** Local LLM classification and deadline extraction

### Interface

- **Dashboard:** Raycast extension (to be implemented)
- **Quick Capture:** Keyboard shortcuts and instant access
- **Visual Design:** ADHD-optimized with max 3 options

### Voice Memo Pipeline

- **Source:** ~/Library/Group Containers/\*/Recordings
- **Processing:** Whisper transcription + Ollama embeddings
- **Storage:** ChromaDB + Obsidian markdown files

## Deployment Architecture

### Local Development

- **Host:** localhost (127.0.0.1)
- **Port:** 3000 (configurable)
- **Hot Reload:** Automatic with file watching
- **Environment:** .env file configuration

### Production (Personal Use)

- **Target:** Personal M4 MacBook
- **Services:** All running locally
- **Data:** Stored locally, no cloud sync
- **Privacy:** Complete local processing

## Performance Considerations

### M4 MacBook Optimization

- **Memory:** 6-8GB for LLM, 4-6GB for ChromaDB
- **CPU:** Metal Performance Shaders for Whisper
- **Storage:** SSD for fast file system operations
- **Network:** Local-only, no external API calls

### Scaling Strategy

- **Voice Processing:** Batch transcription during idle periods
- **Email Processing:** Configurable polling intervals
- **Search:** ChromaDB indexing with incremental updates
- **UI Responsiveness:** Async processing with progress indicators

## Security & Privacy

### Data Protection

- **Processing:** 100% local on device
- **Storage:** AES-256 encryption for sensitive ChromaDB collections
- **Access:** Oauth2 with minimal Google permissions
- **Network:** No external data transmission for core features

### Development Security

- **Dependencies:** Regular security audits
- **Environment:** Secure credential management
- **Validation:** Input sanitization and path traversal protection
