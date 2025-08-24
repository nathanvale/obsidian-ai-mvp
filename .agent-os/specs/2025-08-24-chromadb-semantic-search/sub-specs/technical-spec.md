# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-08-24-chromadb-semantic-search/spec.md

> Created: 2025-08-24
> Version: 1.0.0

## Technical Requirements

- **Search Endpoint Implementation**: Complete `/search` route to process natural language queries, generate embeddings via Ollama, and return semantically relevant results from ChromaDB
- **Document Processing Pipeline**: Orchestrate file scanning → chunking → embedding → ChromaDB storage with proper error handling and logging
- **Real-time File Monitoring**: Integrate existing file watcher with indexing pipeline for automatic updates
- **Background Job Processing**: Implement queue system for large vault indexing with progress tracking and user feedback
- **ADHD Cognitive Load Management**: Result filtering based on time-of-day patterns and maximum 3 initial results with progressive disclosure
- **Metadata Enrichment**: Store file paths, creation dates, modification times, and user interaction patterns in ChromaDB metadata

## Approach Options

**Option A: Queue-based Processing with BullMQ**

- Pros: Robust job management, progress tracking, retry mechanisms, Redis-backed persistence
- Cons: Additional Redis dependency, increased complexity, overkill for single-user system

**Option B: Simple In-Memory Task Processing** (Selected)

- Pros: No external dependencies, simpler implementation, faster development, sufficient for personal use
- Cons: No persistence across restarts, limited scalability

**Option C: Event-driven Architecture with Native Workers**

- Pros: Node.js native, good performance, no external dependencies
- Cons: More complex implementation, harder to debug, unnecessary complexity

**Rationale:** Option B aligns with the project's "speed over perfection" principle and minimal dependency philosophy while providing sufficient functionality for the ADHD personal use case.

## External Dependencies

**No new dependencies required** - leveraging existing infrastructure:

- **chromadb**: Already integrated for vector storage
- **@orchestr8/logger**: Structured logging with correlation IDs
- **@orchestr8/resilience**: Circuit breakers and retry policies
- **chokidar**: File system monitoring (already in package.json)

## Implementation Architecture

### Document Processing Service

```typescript
interface DocumentIndexingService {
  // Primary processing methods
  indexVault(): Promise<IndexingProgress>;
  indexFile(filePath: string): Promise<void>;
  reindexFile(filePath: string): Promise<void>;
  deleteFileIndex(filePath: string): Promise<void>;

  // Document processing
  chunkDocument(
    content: string,
    metadata: FileMetadata
  ): Promise<DocumentChunk[]>;
  extractMetadata(filePath: string): Promise<FileMetadata>;

  // Progress tracking
  getIndexingProgress(): IndexingProgress;
}
```

### Search Integration

```typescript
interface SearchService {
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
  generateQueryEmbedding(query: string): Promise<number[]>;
  filterResultsByCognitiveLoad(
    results: SearchResult[]
  ): Promise<SearchResult[]>;
}
```

### ChromaDB Collection Strategy

```typescript
const COLLECTIONS = {
  'obsidian-documents': {
    name: 'obsidian-documents',
    metadata: {
      filePath: string,
      fileName: string,
      chunkIndex: number,
      createdAt: string,
      modifiedAt: string,
      fileSize: number,
      cognitiveComplexity?: number
    }
  },
  'user-patterns': {
    name: 'user-patterns',
    metadata: {
      queryTime: string,
      queryText: string,
      resultsClicked: string[],
      sessionDuration: number,
      medicationWindow: 'peak' | 'wearing-off' | 'off'
    }
  }
} as const;
```

## Processing Pipeline

### Vault Initialization Flow

```
1. FileSystemService.scanMarkdownFiles()
2. For each file: DocumentIndexingService.extractMetadata()
3. DocumentIndexingService.chunkDocument()
4. OllamaService.generateEmbeddings() (batch processing)
5. ChromaDBService.addDocuments() with metadata
6. Update progress tracking
```

### Real-time Update Flow

```
1. FileSystemService.watchForChanges() detects change
2. Determine change type: created/modified/deleted
3. Route to appropriate indexing method
4. Process with full error handling and logging
5. Update search index immediately
```

### Search Query Flow

```
1. POST /search receives natural language query
2. OllamaService.generateEmbedding() for query
3. ChromaDBService.query() with embedding vector
4. Filter results by cognitive load indicators
5. Return maximum 3 results with progressive disclosure option
```

## Performance Optimizations

### M4 MacBook Resource Management

- **Memory Allocation**: 2GB for ChromaDB, 4GB for Ollama embedding generation
- **Batch Processing**: Process embeddings in batches of 25 documents to prevent memory overflow
- **Chunk Size**: 500-word chunks for optimal embedding quality vs. processing speed
- **Concurrent Processing**: Maximum 2 concurrent embedding requests to Ollama

### ADHD-Specific Performance Features

- **Result Caching**: Cache frequent queries with 15-minute TTL
- **Cognitive Load Indicators**: Track query time patterns to identify peak vs. low-function periods
- **Progressive Loading**: Show first 3 results immediately, load additional on demand
- **Visual Progress**: Real-time indexing progress with estimated completion time

## Error Handling Strategy

### Service Resilience

- **ChromaDB Connectivity**: Circuit breaker with 3-failure threshold, 30-second recovery window
- **Ollama Availability**: Retry with exponential backoff, graceful degradation to text-based search
- **File System Errors**: Continue processing remaining files, log errors for manual review
- **Memory Constraints**: Monitor embedding generation memory usage, implement backpressure

### User Experience During Failures

- **Partial Search Results**: Return text-based matches when embeddings unavailable
- **Indexing Interruption**: Resume from last successful file, preserve partial progress
- **Service Recovery**: Automatic retry with user notification of service restoration
