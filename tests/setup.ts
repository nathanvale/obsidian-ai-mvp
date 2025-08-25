// Test setup file for ADHD Digital Second Brain
// Configures testing environment for local AI processing and structured logging

import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'

// Global test configuration
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test'
  process.env.LOG_LEVEL = 'warn' // Reduce log noise during tests

  // Disable external service calls during testing unless explicitly needed
  if (!process.env.TEST_WITH_SERVICES) {
    process.env.OLLAMA_ENABLED = 'false'
    process.env.CHROMADB_ENABLED = 'false'
  }
})

afterAll(async () => {
  // Clean up any test artifacts
  delete process.env.NODE_ENV
  delete process.env.LOG_LEVEL
  delete process.env.OLLAMA_ENABLED
  delete process.env.CHROMADB_ENABLED
})

// Test isolation
beforeEach(() => {
  // Clear any cached modules or state between tests
  // Note: Using Vitest's built-in mock clearing if available
  vi?.clearAllMocks?.()
})

afterEach(() => {
  // Clean up after each test
  vi?.restoreAllMocks?.()
})

// Helper function for ADHD-optimized test timeouts
export const adhdTimeouts = {
  fast: 5000, // Quick operations - 5s
  medium: 15000, // Local AI processing - 15s
  slow: 30000, // Full service integration - 30s
} as const

// Test utilities for ADHD development
export const testUtils = {
  // Skip tests that require external services unless explicitly enabled
  skipIfNoServices: () => {
    return process.env.TEST_WITH_SERVICES !== 'true'
  },

  // Get timeout based on test complexity
  getTimeout: (complexity: keyof typeof adhdTimeouts) =>
    adhdTimeouts[complexity],
} as const
