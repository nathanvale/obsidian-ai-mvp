# Tests Specification

This is the tests coverage details for the spec detailed in @.agent-os/specs/2025-08-24-orchestr8-integration-completion/spec.md

> Created: 2025-08-24
> Version: 1.0.0

## Test Coverage

Following the minimal testing philosophy (maximum 5 critical tests), focusing on smoke tests that validate the most critical ADHD support workflows won't be broken by @orchestr8 integration.

### Critical Smoke Tests (Following Minimal Testing Philosophy)

**1. Service Connectivity with Correlation Tracking Test**
- Verify OllamaService can generate embeddings with correlation ID headers
- Verify ChromaDBService can perform vector queries with correlation context
- Verify FileSystemService can scan vault with correlation logging
- Assert all services return correlation IDs in responses
- Assert structured logs contain correlation metadata

**2. Circuit Breaker Protection Test**
- Simulate Ollama service failure (connection refused)
- Verify circuit breaker opens and prevents cascade failures
- Simulate ChromaDB connection failure
- Verify graceful degradation without breaking ADHD workflows
- Assert error responses include correlation IDs for debugging

**3. Retry Policy Functionality Test**
- Inject temporary failures into OllamaService HTTP calls
- Verify automatic retry with exponential backoff
- Inject temporary failures into ChromaDBService operations
- Verify successful recovery without user intervention
- Assert retry attempts are logged with correlation context

**4. ADHD Workflow Integration Test**
- Execute complete voice memo pipeline: file detection → transcription → embeddings → storage
- Verify semantic search functionality remains operational
- Verify correlation IDs track the entire workflow end-to-end
- Assert no regression in performance for critical ADHD support features

**5. Error Context Propagation Test**
- Trigger service failures at different points in the pipeline
- Verify correlation IDs are maintained through error boundaries
- Verify structured error logs provide actionable debugging information
- Assert route handlers return correlation IDs in error responses

### Unit Tests

**OllamaService**
- Test correlation ID propagation to Ollama API calls
- Test circuit breaker behavior with various failure scenarios
- Test retry policy configuration and exponential backoff timing

**ChromaDBService**
- Test correlation context in vector database operations
- Test resilience patterns for bulk operations
- Test structured error handling for connection failures

**FileSystemService**
- Test retry policies for file watching operations
- Test correlation tracking for file processing workflows
- Test graceful degradation when vault becomes unavailable

### Integration Tests

**Service Orchestration**
- Test correlation ID flow through multi-service operations
- Test error recovery across service boundaries
- Test performance impact of @orchestr8 integration

**Route Handler Integration**
- Test request.getLogger() usage in all routes
- Test correlation ID propagation from routes to services
- Test structured error responses with debugging context

### Mocking Requirements

Following the minimal mocking philosophy:

- **OllamaService:** Mock HTTP failures for resilience testing only
- **ChromaDBService:** Use in-memory ChromaDB instance when possible
- **FileSystemService:** Mock file system failures for error path testing
- **@orchestr8 Infrastructure:** Use real @orchestr8 services to validate actual integration

### Test Environment Setup

- Use existing @orchestr8 logger and resilience services (no mocks)
- Configure lower thresholds for circuit breakers (faster test execution)
- Use test correlation IDs for validation
- Leverage structured logging for test assertions
- Maintain test database isolation without breaking ADHD workflow patterns

### Success Criteria

- All 5 critical smoke tests pass
- No regression in voice memo → semantic search pipeline performance
- Correlation IDs successfully track through all test scenarios
- Error scenarios produce actionable debugging information
- @orchestr8 integration adds < 100ms latency to critical operations

### Test Execution Strategy

- Run smoke tests first to validate core functionality
- Execute resilience tests with simulated failures
- Validate correlation tracking with end-to-end scenarios
- Use structured logging output for test result validation
- Leverage Bun's fast test execution for rapid feedback cycles