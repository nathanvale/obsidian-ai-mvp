import { describe, it, expect } from 'vitest';
import { server } from '../src/server.js';

describe('ChromaDB Dependencies Smoke Test', () => {
  it('should be able to import ollama package', async () => {
    const ollama = await import('ollama');
    expect(ollama).toBeDefined();
  });

  it('should be able to import chromadb package', async () => {
    const chromadb = await import('chromadb');
    expect(chromadb).toBeDefined();
  });
});

describe('Request Logging Smoke Test', () => {
  it('should add correlation ID to response headers', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers).toHaveProperty('x-correlation-id');
    expect(typeof response.headers['x-correlation-id']).toBe('string');
  });

  it('should preserve custom correlation ID', async () => {
    const customCorrelationId = 'test-correlation-123';
    const response = await server.inject({
      method: 'GET',
      url: '/',
      headers: {
        'x-correlation-id': customCorrelationId,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['x-correlation-id']).toBe(customCorrelationId);
  });
});
