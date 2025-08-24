# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-08-24-chromadb-semantic-search/spec.md

> Created: 2025-08-24
> Version: 1.0.0

## Endpoints

### POST /search

**Purpose:** Perform semantic search across indexed Obsidian vault content
**Parameters:** 
- `query` (string, required): Natural language search query
- `limit` (number, optional): Maximum results to return (default: 3, max: 10)
- `cognitiveMode` (string, optional): 'simplified' | 'standard' | 'comprehensive' (default: auto-detect)
**Response:** 
```json
{
  "results": [
    {
      "id": "doc_123",
      "content": "Matching document content chunk...",
      "metadata": {
        "filePath": "/path/to/note.md",
        "fileName": "note.md",
        "chunkIndex": 0,
        "relevanceScore": 0.89,
        "createdAt": "2025-08-24T10:30:00Z",
        "modifiedAt": "2025-08-24T15:45:00Z",
        "cognitiveComplexity": "low"
      }
    }
  ],
  "totalResults": 7,
  "hasMore": true,
  "processingTime": "245ms",
  "cognitiveMode": "simplified"
}
```
**Errors:** 
- 400: Invalid query parameters
- 503: Search service unavailable (Ollama/ChromaDB down)

### POST /index/vault

**Purpose:** Trigger full vault re-indexing with progress tracking
**Parameters:** None
**Response:**
```json
{
  "message": "Vault indexing started",
  "jobId": "index_job_123",
  "estimatedDuration": "5-10 minutes",
  "totalFiles": 247
}
```
**Errors:**
- 409: Indexing already in progress
- 503: Required services unavailable

### GET /index/status

**Purpose:** Get current indexing progress and system status
**Parameters:** None
**Response:**
```json
{
  "status": "indexing", // "idle" | "indexing" | "error"
  "progress": {
    "filesProcessed": 45,
    "totalFiles": 247,
    "percentage": 18.2,
    "currentFile": "Daily Notes/2025-08-24.md",
    "estimatedRemaining": "3.2 minutes"
  },
  "services": {
    "chromadb": "healthy",
    "ollama": "healthy", 
    "filesystem": "healthy"
  },
  "lastIndexed": "2025-08-24T10:30:00Z",
  "totalDocuments": 1456
}
```
**Errors:** None (always returns status)

### POST /index/file

**Purpose:** Index or re-index a specific file
**Parameters:**
- `filePath` (string, required): Relative path to file within vault
**Response:**
```json
{
  "message": "File indexed successfully",
  "filePath": "Projects/ADHD App.md",
  "chunksCreated": 3,
  "processingTime": "850ms"
}
```
**Errors:**
- 400: Invalid file path or file not found
- 422: File format not supported
- 503: Indexing services unavailable

### DELETE /index/file

**Purpose:** Remove a file from the search index
**Parameters:**
- `filePath` (string, required): Relative path to file within vault  
**Response:**
```json
{
  "message": "File removed from index",
  "filePath": "Deleted Note.md",
  "documentsRemoved": 2
}
```
**Errors:**
- 400: Invalid file path
- 404: File not found in index

## Controllers

### SearchController

**Action: search**
- Validates search query parameters
- Generates query embeddings via OllamaService
- Queries ChromaDB for semantic matches
- Applies cognitive load filtering based on user patterns
- Returns formatted results with metadata

**Business Logic:**
- Auto-detect cognitive mode based on time-of-day patterns
- Implement progressive disclosure (3 → 10 → all results)
- Track user interaction patterns for adaptive learning
- Handle service failures with graceful degradation to text search

**Error Handling:**
- Retry embedding generation with circuit breaker
- Fallback to fuzzy text search if embeddings fail
- Log all queries for pattern analysis

### IndexController  

**Action: indexVault**
- Validates vault accessibility and service availability
- Initiates background indexing job with DocumentIndexingService
- Returns job tracking information
- Implements singleton pattern to prevent concurrent indexing

**Action: getIndexingStatus**
- Returns real-time indexing progress from DocumentIndexingService
- Includes service health checks
- Provides system statistics and last update times

**Action: indexFile**
- Validates file path within vault boundaries
- Processes single file through complete indexing pipeline
- Handles file deletion detection and cleanup
- Updates real-time search index immediately

**Action: deleteFileIndex**
- Removes all document chunks for specified file from ChromaDB
- Updates index statistics and metadata
- Handles cascade deletion for file moves/renames

**Business Logic:**
- File path validation and security boundary enforcement
- Automatic detection of file format and processing strategy
- Metadata extraction and enrichment
- Progress tracking with estimated completion times

**Error Handling:**
- Graceful handling of permission errors and locked files
- Recovery from partial indexing failures
- Service connectivity resilience with retry policies