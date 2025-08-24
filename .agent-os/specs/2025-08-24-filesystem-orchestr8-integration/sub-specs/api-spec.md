# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-08-24-filesystem-orchestr8-integration/spec.md

> Created: 2025-08-24
> Version: 1.0.0

## Endpoints

### GET /health/filesystem

**Purpose:** Provides real-time health status of the FileSystemService including vault accessibility, watcher status, and cache performance for ADHD-focused system reliability monitoring

**Parameters:** None

**Response:** JSON object with comprehensive health status
```json
{
  "status": "healthy" | "degraded" | "unhealthy",
  "vault": {
    "accessible": true,
    "path": "/Users/example/Documents/ObsidianVault",
    "totalFiles": 1247,
    "lastScanDuration": "1.2s",
    "configValid": true
  },
  "watcher": {
    "active": true,
    "eventsProcessed": 42,
    "lastEventTime": "2025-08-24T15:30:22.123Z",
    "reconnectCount": 0
  },
  "cache": {
    "hitRate": 0.87,
    "memoryUsage": "45.2MB",
    "entriesCount": 312,
    "evictionsCount": 8
  },
  "performance": {
    "avgReadTime": "12ms",
    "avgScanTime": "1.8s",
    "operationCount24h": 1834
  },
  "timestamp": "2025-08-24T15:35:45.789Z"
}
```

**Errors:**
- 500 Internal Server Error: FileSystemService initialization failure
- 503 Service Unavailable: Vault path not accessible or configured

### GET /metrics/filesystem

**Purpose:** Detailed performance metrics for FileSystemService operations, supporting developer observability and ADHD workflow optimization analysis

**Parameters:**
- `timeRange` (query, optional): "1h", "6h", "24h", "7d" (default: "1h")
- `includeOperations` (query, optional): boolean (default: false) - Include individual operation metrics

**Response:** JSON object with comprehensive performance and reliability metrics
```json
{
  "timeRange": "1h",
  "operations": {
    "readFile": {
      "count": 234,
      "avgDuration": "8ms",
      "p95Duration": "23ms",
      "errorRate": 0.02,
      "cacheHitRate": 0.89
    },
    "scanMarkdownFiles": {
      "count": 12,
      "avgDuration": "1.4s",
      "p95Duration": "2.8s",
      "errorRate": 0.0,
      "filesScanned": 1247
    },
    "watchForChanges": {
      "eventsReceived": 156,
      "eventsProcessed": 152,
      "processingErrors": 4,
      "reconnections": 1
    }
  },
  "cache": {
    "totalRequests": 456,
    "hits": 398,
    "misses": 58,
    "hitRate": 0.87,
    "evictions": 12,
    "memoryPeak": "52.1MB",
    "memoryCurrent": "45.2MB"
  },
  "errors": {
    "total": 8,
    "byType": {
      "FilePermissionError": 3,
      "VaultConfigurationError": 1,
      "FileSystemUnavailableError": 4
    },
    "recoverySuccessRate": 0.75
  },
  "resilience": {
    "retriesExecuted": 15,
    "circuitBreakerTrips": 2,
    "operationTimeouts": 1
  },
  "timestamp": "2025-08-24T15:35:45.789Z"
}
```

**Errors:**
- 400 Bad Request: Invalid timeRange parameter
- 500 Internal Server Error: Metrics collection failure

### POST /filesystem/cache/clear

**Purpose:** Manual cache clearing for troubleshooting ADHD workflow issues or forcing fresh file content reload during development

**Parameters:** None (body can be empty)

**Response:** JSON confirmation of cache clearing operation
```json
{
  "success": true,
  "clearedEntries": 312,
  "memoryFreed": "45.2MB",
  "timestamp": "2025-08-24T15:35:45.789Z"
}
```

**Errors:**
- 500 Internal Server Error: Cache clearing operation failure

### GET /filesystem/vault/status

**Purpose:** Comprehensive vault status information for ADHD users and developers to understand current system state

**Parameters:** None

**Response:** JSON object with detailed vault information
```json
{
  "vault": {
    "path": "/Users/example/Documents/ObsidianVault",
    "accessible": true,
    "totalFiles": 1247,
    "totalSize": "45.2MB",
    "lastScanned": "2025-08-24T15:30:22.123Z",
    "scanDuration": "1.2s"
  },
  "configuration": {
    "watcherEnabled": true,
    "cacheEnabled": true,
    "cacheTTL": "5m",
    "maxCacheSize": "100MB",
    "parallelOpsLimit": 10
  },
  "recentActivity": {
    "filesModified": 3,
    "filesAdded": 1,
    "filesDeleted": 0,
    "lastActivity": "2025-08-24T15:32:15.456Z"
  },
  "health": "healthy",
  "timestamp": "2025-08-24T15:35:45.789Z"
}
```

**Errors:**
- 404 Not Found: Vault path not configured
- 500 Internal Server Error: Vault status determination failure

## Controllers

### FileSystemHealthController

**Action:** getHealth()
**Business Logic:** 
- Check vault path accessibility and configuration validity
- Verify file watcher operational status and recent activity
- Analyze cache performance and memory usage
- Calculate overall system health score based on ADHD reliability requirements

**Error Handling:**
- Graceful degradation when vault temporarily inaccessible
- Clear error messages for configuration issues
- Timeout protection for health check operations

### FileSystemMetricsController

**Action:** getMetrics(timeRange, includeOperations)
**Business Logic:**
- Aggregate operation metrics from @orchestr8/logger structured logs
- Calculate performance percentiles and error rates
- Provide cache performance analysis and memory usage trends
- Format metrics for ADHD-focused dashboard consumption

**Error Handling:**
- Handle missing metrics gracefully with partial responses
- Validate time range parameters with clear error messages
- Protect against memory exhaustion during large metric queries

### FileSystemCacheController

**Action:** clearCache()
**Business Logic:**
- Safely clear LRU cache contents while preserving performance metrics
- Log cache clearing operation with correlation ID for troubleshooting
- Trigger garbage collection to free memory immediately
- Provide confirmation with impact metrics (entries cleared, memory freed)

**Error Handling:**
- Handle concurrent cache operations safely
- Provide clear success/failure status with specific error details
- Ensure system remains functional even if cache clearing fails

### VaultStatusController

**Action:** getVaultStatus()
**Business Logic:**
- Perform real-time vault accessibility check without full scan
- Gather recent file activity from watcher event logs
- Compile configuration settings for system transparency
- Calculate vault health based on file system responsiveness

**Error Handling:**
- Distinguish between temporary and permanent vault issues
- Provide actionable error messages for vault configuration problems
- Handle permission errors with clear user-friendly explanations

## Integration with Existing Fastify Routes

### Route Registration Pattern
```typescript
// In src/routes/index-routes.ts or dedicated filesystem routes file
fastify.register(async function fileSystemRoutes(fastify) {
  fastify.get('/health/filesystem', fileSystemHealthController.getHealth);
  fastify.get('/metrics/filesystem', fileSystemMetricsController.getMetrics);
  fastify.post('/filesystem/cache/clear', fileSystemCacheController.clearCache);
  fastify.get('/filesystem/vault/status', vaultStatusController.getVaultStatus);
});
```

### Request Logging Integration
All endpoints will use @orchestr8/logger with correlation IDs to track requests across the ADHD user journey from Raycast → API → FileSystem → ChromaDB/Ollama services.

### Response Time Targets
- Health endpoints: <50ms for instant ADHD user feedback
- Metrics endpoints: <200ms for dashboard responsiveness  
- Cache operations: <100ms for immediate workflow continuation
- Vault status: <150ms for real-time system awareness