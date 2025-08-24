# Tests Specification

This is the tests coverage details for the spec detailed in @.agent-os/specs/2025-01-24-file-system-service/spec.md

> Created: 2025-01-24
> Version: 1.0.0

## Test Coverage

### Unit Tests

**IndexingService**

- Verify batch processing handles file groups correctly
- Test state management during indexing operations
- Validate error recovery for individual file failures

**FileWatcher**

- Confirm debouncing prevents excessive processing
- Test detection of file creation, modification, deletion
- Verify proper cleanup of watch handles

### Integration Tests

**End-to-End Indexing Pipeline**

- Create markdown file → verify indexed in ChromaDB within 5 seconds
- Modify existing file → confirm embedding updated
- Delete file → verify removal from vector database

**Search Functionality**

- Query with known content → verify relevant results returned
- Test semantic similarity with paraphrased queries
- Validate result ranking and relevance scoring

### Mocking Requirements

**Ollama Service**

- Mock embedding generation for consistent test results
- Simulate service unavailability for resilience testing

**File System**

- Mock file operations for controlled test scenarios
- Simulate file access errors and permission issues

## Critical Smoke Tests (Following Minimal Testing Philosophy)

### 1. Vault Initialization Test

- **Objective:** Verify initial vault scan completes without errors
- **Steps:** Start service with populated vault → check all markdown files indexed
- **Success Criteria:** All existing .md files appear in ChromaDB within 30 seconds

### 2. Real-time File Watching Test

- **Objective:** Confirm automatic indexing of new content
- **Steps:** Create new markdown file in vault → verify indexed
- **Success Criteria:** New file searchable within 5 seconds of creation

### 3. Semantic Search Accuracy Test

- **Objective:** Validate search returns relevant results
- **Steps:** Search for known content using varied terminology
- **Success Criteria:** Relevant files appear in top 5 results with score >0.7

### 4. Error Resilience Test

- **Objective:** Ensure service continues despite individual file failures
- **Steps:** Create file with permission issues → verify service keeps running
- **Success Criteria:** Service processes other files, logs warning for failed file

### 5. Performance Benchmark Test

- **Objective:** Confirm indexing performance meets ADHD usability requirements
- **Steps:** Index 100 markdown files → measure total time
- **Success Criteria:** Complete indexing in <30 seconds, search response <500ms
