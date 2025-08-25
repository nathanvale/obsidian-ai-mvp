# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-01-24-file-system-service/spec.md

> Created: 2025-01-24
> Version: 1.0.0

## Endpoints

### GET /api/index/status

**Purpose:** Check current vault indexing status and progress
**Parameters:** None
**Response:**

```json
{
  "status": "idle | indexing | completed | error",
  "progress": 0.75,
  "totalFiles": 1000,
  "processedFiles": 750,
  "lastUpdated": "2025-01-24T10:30:00Z"
}
```

**Errors:**

- 500: Internal server error during status retrieval

### POST /api/index/start

**Purpose:** Trigger full vault indexing process
**Parameters:** None
**Response:**

```json
{
  "message": "Indexing started",
  "status": "indexing"
}
```

**Errors:**

- 400: Indexing already in progress
- 500: Failed to start indexing process

### POST /api/index/stop

**Purpose:** Cancel ongoing indexing operation
**Parameters:** None
**Response:**

```json
{
  "message": "Indexing stopped",
  "status": "idle"
}
```

**Errors:**

- 400: No indexing operation to stop
- 500: Failed to stop indexing process

### POST /api/search

**Purpose:** Perform semantic search across indexed vault contents
**Request Body:**

```json
{
  "query": "ADHD medication management strategies",
  "limit": 10,
  "threshold": 0.3
}
```

**Response:**

```json
{
  "results": [
    {
      "id": "base64-encoded-file-id",
      "content": "File content snippet...",
      "metadata": {
        "path": "Health/ADHD-Management.md",
        "modifiedAt": "2025-01-24T09:15:00Z"
      },
      "score": 0.85
    }
  ],
  "query": "ADHD medication management strategies",
  "total": 3
}
```

**Errors:**

- 400: Invalid query parameters
- 503: Search service temporarily unavailable

## Controllers

### IndexController

- **Actions:** status, start, stop
- **Business Logic:** Coordinate with IndexingService for status updates and control
- **Error Handling:** Graceful degradation when services unavailable

### SearchController

- **Actions:** semantic search
- **Business Logic:** Generate query embeddings, query ChromaDB, format results
- **Error Handling:** Return empty results on service failures with proper error codes
