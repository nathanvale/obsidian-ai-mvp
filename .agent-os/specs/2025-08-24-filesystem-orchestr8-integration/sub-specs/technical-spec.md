# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-08-24-filesystem-orchestr8-integration/spec.md

> Created: 2025-08-24
> Version: 1.0.0

## Technical Requirements

### Core @orchestr8 Integration

- **Structured Logging:** Replace all console.log/console.warn/console.error with @orchestr8/logger logWithContext utilities
- **Correlation ID Tracking:** All file operations must include correlation IDs for request tracing across service boundaries
- **Resilience Patterns:** Wrap file I/O operations with resilienceService.applyFileSystemPolicy() supporting retry logic and circuit breaker patterns
- **Error Classification:** Implement custom error classes (FileSystemError, VaultConfigurationError, FilePermissionError) with structured error details

### Performance & Caching Architecture

- **LRU File Content Cache:** Implement in-memory cache with configurable TTL (default 5 minutes) and size limits (default 100MB) for frequently accessed file content
- **Batch Processing:** Add batched file processing for large vault operations with configurable concurrency limits (default 10 parallel operations)
- **Async Operation Management:** Convert synchronous operations to async where beneficial for ADHD user experience (non-blocking UI)
- **Memory Management:** Implement cache eviction policies and memory pressure monitoring for M4 MacBook optimization

### Enhanced File Monitoring

- **Robust File Watcher:** Enhance existing fs.watch with reconnection logic, error recovery, and graceful degradation when file system is unavailable
- **Change Event Filtering:** Add intelligent filtering to reduce noise from temporary files, lock files, and system-generated changes
- **Batch Change Processing:** Group rapid file changes into batches to prevent overwhelming downstream services (ChromaDB, Ollama)
- **Watch Error Recovery:** Automatic watcher restart with exponential backoff when file system monitoring fails

### ADHD-Optimized Error Handling

- **Clear Error Messages:** Error messages designed for cognitive load reduction - specific, actionable, and non-technical
- **Progress Indicators:** For long-running operations (large vault scans), provide clear progress feedback
- **Graceful Degradation:** When services are unavailable, provide reduced functionality rather than complete failure
- **Operation Timeout Management:** Prevent operations from hanging during medication wear-off periods when user can't troubleshoot

## Approach Options

**Option A: Gradual Enhancement (Selected)**
- Pros: Maintains existing API compatibility, minimal risk of breaking current functionality, allows incremental testing and rollback
- Cons: Some code duplication during transition period, requires careful method signature preservation

**Option B: Complete Service Rewrite**
- Pros: Clean architecture, optimal @orchestr8 integration patterns, modern async/await throughout
- Cons: High risk of breaking existing integrations, significant development time, delays Phase 1 voice processing work

**Option C: Wrapper Service Approach**
- Pros: Zero risk to existing functionality, can develop new patterns in isolation
- Cons: Confusing dual APIs, additional complexity, doesn't improve existing code paths

**Rationale:** Option A aligns with the project's "speed over perfection" philosophy while ensuring existing voice memo and search functionality continues working. The gradual approach allows ADHD users to benefit immediately from improved reliability without waiting for a complete rewrite.

## External Dependencies

### New Package Dependencies

- **@lru-cache/lru-cache** - High-performance LRU cache implementation for file content caching
- **Justification:** Native Map-based caching is insufficient for memory management and TTL requirements. This package provides production-ready cache eviction and memory pressure handling.

- **p-limit** - Concurrency control for parallel file operations  
- **Justification:** Prevents overwhelming the file system and ChromaDB with too many concurrent operations, which could cause performance degradation during large vault processing.

### Enhanced @orchestr8 Usage

- **@orchestr8/logger** - Already installed, expanding usage for comprehensive structured logging
- **@orchestr8/resilience** - Already installed, implementing file system resilience policies
- **Justification:** These provide enterprise-grade observability and reliability patterns needed for ADHD users who depend on system consistency during cognitive low periods.

## Implementation Architecture

### Service Module Structure

```
src/services/filesystem/
├── index.ts                    # Main FileSystemService with enhanced methods
├── cache/
│   ├── file-content-cache.ts   # LRU cache implementation for file content
│   └── cache-metrics.ts        # Cache performance tracking
├── operations/
│   ├── file-operations.ts      # Enhanced file I/O with resilience patterns
│   ├── vault-scanner.ts        # Optimized vault scanning with batch processing
│   └── file-watcher.ts         # Enhanced file watching with reconnection logic
├── errors/
│   ├── filesystem-errors.ts    # Custom error classes with structured details
│   └── error-handlers.ts       # Centralized error handling and recovery
├── metrics/
│   ├── operation-metrics.ts    # Performance and reliability metrics
│   └── health-checks.ts        # System health monitoring
└── types/
    ├── interfaces.ts           # Enhanced TypeScript interfaces
    └── config.ts               # Configuration schemas and validation
```

### Integration Points

- **Existing Ollama Service:** File content changes trigger embedding generation through existing service patterns
- **Existing ChromaDB Service:** File indexing continues through current API while benefiting from improved reliability
- **Fastify API Routes:** New health and metrics endpoints integrate with existing route structure
- **Environment Configuration:** Leverage existing config service for new cache and performance settings

### Backward Compatibility Strategy

- All existing public methods maintain identical signatures and return types
- Internal method enhancements are transparent to existing consumers  
- New features (caching, metrics) are opt-in and don't affect current workflows
- Existing error handling patterns are preserved while adding structured logging
- Configuration defaults ensure zero-config upgrade path for existing users

## Performance Considerations

### M4 MacBook Optimization

- **Memory Management:** Cache size limits based on available system memory (default 5% of total RAM)
- **CPU Usage:** Parallel processing limited to available cores minus 2 for system responsiveness
- **SSD Optimization:** Batch read operations to minimize SSD wear and maximize throughput
- **Power Management:** Reduce background scanning frequency on battery power

### ADHD User Experience Optimization

- **Response Time Targets:** File operations <100ms for individual files, vault scans <2 seconds for typical 1000-file vault
- **Progress Feedback:** Clear progress indicators for operations >1 second to prevent user anxiety
- **Error Recovery:** Automatic retry with user-friendly progress messages rather than technical error dumps
- **Cognitive Load Reduction:** Maximum 3 status messages simultaneously, with clear priority ordering

### Monitoring and Alerting

- **Operation Duration Tracking:** P50, P95, P99 latency metrics for all file operations
- **Error Rate Monitoring:** Track error frequency and patterns for proactive issue identification
- **Cache Performance:** Hit/miss ratios, memory usage, and eviction rates for optimization insights
- **System Health Indicators:** File system availability, vault accessibility, and watcher status