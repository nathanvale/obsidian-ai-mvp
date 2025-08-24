# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-01-24-file-system-service/spec.md

> Created: 2025-01-24
> Version: 1.0.0

## Technical Requirements

### Architecture Components
- **IndexingService**: Orchestrate vault scanning and embedding generation
- **FileWatcher**: Enhanced real-time file monitoring
- **EmbeddingGenerator**: Ollama-based semantic embedding creation
- **ChromaDBManager**: Manage vector database operations

### Integration Flow
1. File created/modified in Obsidian vault
2. FileWatcher detects change
3. IndexingService triggers processing
4. EmbeddingGenerator creates vector embeddings
5. ChromaDBManager updates vector database
6. Search API ready for queries

### Performance Considerations
- Batch processing for multiple file changes (5-10 files per batch)
- Configurable debouncing intervals (500ms default)
- Minimal CPU/memory footprint during background processing
- Background processing to prevent UI blocking

### Service Integration Architecture
```
[FileSystemService] → [IndexingService] → [OllamaService] → [ChromaDBService]
                            ↓
                    [IndexingStateManager]
                            ↓
                      [Route Handlers]
```

## Approach Options

### Option A: Real-time Indexing (Selected)
- Pros: 
  - Immediate search availability for new content
  - Low latency for file changes
  - Supports ADHD need for instant cognitive capture
- Cons: 
  - Slightly higher continuous CPU usage
  - Potential performance impact during large file changes

**Rationale:** ADHD users need immediate access to captured thoughts. Delayed indexing breaks the cognitive flow.

### Option B: Scheduled Batch Indexing
- Pros:
  - Lower continuous resource consumption
  - Predictable processing windows
- Cons:
  - Delayed search availability (breaks ADHD workflow)
  - More complex scheduling logic

## External Dependencies

### Ollama (Local LLM Service)
- **Purpose:** Generate semantic embeddings for markdown content
- **Version:** 0.5.17+
- **Model:** nomic-embed-text
- **Justification:** Privacy-preserving local AI processing essential for ADHD-sensitive personal data

### ChromaDB (Vector Database)
- **Purpose:** Store and query semantic embeddings
- **Version:** 1.7.3+
- **Configuration:** In-memory collection with file metadata support
- **Justification:** High-performance local vector storage with minimal setup

### Chokidar (File Watching)
- **Purpose:** Monitor Obsidian vault for file system changes
- **Integration:** Already available in project dependencies
- **Justification:** Robust cross-platform file watching with proper debouncing