# Ollama Service API Specification

## Endpoints

### GET /ollama/health

**Purpose:** Retrieve comprehensive Ollama service health status
**Response Formats:**

```typescript
interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  modelAvailable: boolean
  lastChecked: string
  responseTime: number
  details?: {
    modelName: string
    modelVersion: string
    issues?: string[]
  }
}
```

### POST /ollama/embeddings

**Purpose:** Generate embeddings with enhanced resilience
**Request Body:**

```typescript
interface EmbeddingRequest {
  texts: string[]
  model?: string // Optional model selection
  options?: {
    timeout?: number
    retryAttempts?: number
  }
}
```

**Response Body:**

```typescript
interface EmbeddingResponse {
  embeddings: number[][]
  processingTime: number
  correlationId: string
  warnings?: string[]
}
```

### GET /ollama/models

**Purpose:** List and manage available models
**Response Body:**

```typescript
interface ModelInfo {
  name: string
  version: string
  size: number
  lastUpdated: string
  status: 'downloaded' | 'downloading' | 'not_available'
}

interface ModelsResponse {
  models: ModelInfo[]
  totalModels: number
}
```

## Error Handling

### Standard Error Response

```typescript
interface ErrorResponse {
  code: string
  message: string
  details?: any
  correlationId: string
}
```

### Potential Error Codes

- `OLLAMA_CONNECTION_ERROR`
- `MODEL_UNAVAILABLE`
- `EMBEDDING_GENERATION_FAILED`
- `TIMEOUT_ERROR`

## Configuration Endpoints

### POST /ollama/config

**Purpose:** Dynamic configuration of Ollama service
**Configurable Parameters:**

- Retry attempts
- Timeout durations
- Default model
- Logging verbosity

## Performance Considerations

- All endpoints include correlation IDs
- Comprehensive error logging
- Minimal overhead in health checking
- Configurable timeouts and retry mechanisms
