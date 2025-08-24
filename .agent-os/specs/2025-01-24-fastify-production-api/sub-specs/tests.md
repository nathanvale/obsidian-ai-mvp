# Tests Specification

This is the tests coverage details for the spec detailed in @.agent-os/specs/2025-01-24-fastify-production-api/spec.md

> Created: 2025-01-24
> Version: 1.0.0

## Test Coverage

Following the project's "speed over perfection" principle, this spec will implement minimal but critical smoke tests only.

### Smoke Tests (5 Maximum)

**API Server Integration**
- Server starts successfully with all plugins registered
- Health endpoint returns valid response with status metrics
- Rate limiting properly blocks excessive requests

**Error Handling**
- Validation errors return consistent error format
- Server errors include correlation IDs in response

**Security & Performance**
- Compression activates for large JSON responses

### Integration Tests

**Plugin Integration**
- All security plugins load without conflicts
- Logging middleware captures request/response data with correlation IDs
- Back-pressure detection triggers appropriate responses

### Manual Testing Scenarios

**Rate Limiting Verification**
- Use curl/Postman to exceed rate limits and verify 429 responses
- Confirm rate limit headers appear in responses

**Performance Testing**
- Measure response times before/after compression
- Verify graceful shutdown doesn't drop active connections

**Error Response Validation**
- Send malformed requests and verify consistent error format
- Check correlation IDs match between logs and error responses

## Mocking Requirements

Given the minimal testing approach and focus on real-world usage:

- **No complex mocking** - Use actual services and dependencies
- **@orchestr8/logger** - Allow real logging for observability (use pino adapter with it)
- **Rate limiting** - Use in-memory store for test isolation
- **Back-pressure monitoring** - Use actual resource monitoring

## Testing Strategy

### Primary Approach
- **Smoke tests only** for critical failure scenarios
- **Manual verification** for performance and security features
- **Real-world usage** for comprehensive validation

### Observability Focus
- Rely heavily on @orchestr8/logger structured logging (with pino adapter)
- Use correlation IDs for debugging and issue tracking
- Monitor actual API performance metrics

### Validation Criteria
- All plugins register without errors
- Health endpoint shows green status
- Rate limiting prevents abuse
- Error responses include correlation IDs
- Compression reduces payload sizes