# Tests Specification

This is the tests coverage details for the spec detailed in @.agent-os/specs/2025-08-24-chromadb-semantic-search/spec.md

> Created: 2025-08-24
> Version: 1.0.0

## Test Coverage

### Unit Tests

**DocumentIndexingService**

- chunkDocument splits content appropriately (500-word chunks with overlap)
- extractMetadata returns correct file information and timestamps
- indexFile processes single file through complete pipeline
- deleteFileIndex removes all chunks for specified file
- getIndexingProgress returns accurate status information

**SearchService**

- generateQueryEmbedding calls Ollama service correctly
- filterResultsByCognitiveLoad applies appropriate limits based on time patterns
- search returns properly formatted results with metadata
- search handles empty results gracefully

**Updated SearchController (routes/search.ts)**

- POST /search validates query parameters correctly
- POST /search returns semantic results from ChromaDB
- POST /search handles Ollama service failures with text fallback
- POST /search applies cognitive load filtering appropriately
- POST /search respects result limit parameters

**Updated IndexController (routes/index-routes.ts)**

- POST /index/vault initiates background indexing job
- GET /index/status returns accurate progress information
- POST /index/file processes single file correctly
- DELETE /index/file removes file from index completely
- All endpoints handle service unavailability gracefully

### Integration Tests

**Complete Indexing Workflow**

- Vault scanning → chunking → embedding → ChromaDB storage pipeline
- File watcher detects changes and triggers re-indexing automatically
- Background processing handles large vaults without blocking API
- Error recovery continues processing after individual file failures

**End-to-End Search Workflow**

- Natural language query → embedding generation → ChromaDB query → formatted results
- Search results include proper metadata and relevance scoring
- Progressive disclosure returns additional results when requested
- Cognitive load adaptation filters results based on user patterns

**Service Integration**

- ChromaDB connectivity with proper error handling and circuit breaker
- Ollama embedding generation with batch processing and rate limiting
- FileSystemService integration for vault monitoring and file operations
- @orchestr8 logging captures all operations with correlation IDs

### Mocking Requirements

**Ollama Service Mocking**

- Mock embedding generation responses for consistent test vectors
- Simulate service unavailability for error handling tests
- Mock batch processing delays for progress tracking tests

**ChromaDB Service Mocking**

- Mock document storage and retrieval operations
- Simulate query responses with realistic relevance scores
- Mock connection failures for resilience testing

**FileSystem Service Mocking**

- Mock file scanning results for vault initialization tests
- Simulate file change events for real-time update tests
- Mock file reading operations for content processing tests

## Manual Testing Scenarios

### ADHD User Workflow Testing

**Voice-to-Search Simulation**

1. Create test Obsidian vault with diverse content
2. Index vault completely via POST /index/vault
3. Perform natural language searches: "medication timing", "work deadlines", "therapy notes"
4. Verify results are semantically relevant and limited to 3 initial items
5. Test progressive disclosure by requesting more results

**Real-time Indexing Validation**

1. Start file monitoring via DocumentIndexingService
2. Create new Obsidian note with significant content
3. Verify automatic indexing occurs within 30 seconds
4. Modify existing note and confirm re-indexing
5. Delete note and verify removal from search index

**Cognitive Load Adaptation**

1. Perform searches during different times of day
2. Simulate medication timing patterns (peak vs. wear-off periods)
3. Verify result complexity adapts appropriately
4. Test visual progress indicators during large indexing operations

### Error Recovery Testing

**Service Failure Scenarios**

1. Stop ChromaDB service during indexing - verify graceful degradation
2. Stop Ollama service during search - verify text-based fallback
3. Simulate file system permission errors - verify error logging and continuation
4. Test partial vault indexing with mixed success/failure results

**Resource Constraint Testing**

1. Index large vault (1000+ files) - verify memory usage stays within limits
2. Perform concurrent searches during indexing - verify performance impact
3. Test batch embedding generation with rate limiting
4. Verify progress tracking accuracy during long-running operations

## Testing Strategy

### Primary Approach

- **Structured Logging Validation**: Use @orchestr8/logger to verify correct operation flow and error handling
- **Service Integration Testing**: Focus on critical paths between ChromaDB, Ollama, and file system services
- **Real-world Content Testing**: Use actual Obsidian vault content for semantic search validation
- **Performance Monitoring**: Track embedding generation times and search response latency

### Observability Focus

- **Correlation ID Tracking**: Verify all operations maintain request correlation through the pipeline
- **Error Rate Monitoring**: Track service failures and recovery patterns
- **Performance Metrics**: Monitor embedding generation, ChromaDB query times, and overall search latency
- **User Pattern Analytics**: Validate cognitive load detection and adaptive result filtering

### Validation Criteria

- Semantic search returns relevant results >85% of the time for natural language queries
- Vault indexing completes without data loss for repositories up to 1000 files
- Real-time file updates appear in search results within 60 seconds
- Search API responds within 2 seconds for typical queries
- Background indexing provides accurate progress updates throughout operation
