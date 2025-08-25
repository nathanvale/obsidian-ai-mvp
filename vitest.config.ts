import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // Environment and globals
    environment: 'node',
    globals: true,

    // Setup and configuration
    setupFiles: ['./tests/setup.ts'],

    // Performance optimizations for M4 MacBook and ADHD development
    // Use threads for better performance on modern hardware
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4, // Limit threads for M4 MacBook optimization
        minThreads: 1,
      },
    },

    // Timeouts optimized for local AI processing
    testTimeout: 30000, // 30s for tests involving Ollama/ChromaDB
    hookTimeout: 10000, // 10s for setup/teardown

    // Fast feedback for ADHD development workflow
    // Watch mode for development (can be overridden by CLI)
    watch: false, // Default to false, enable with --watch flag
    reporter: 'verbose',

    // Coverage configuration with appropriate thresholds
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',

      // Coverage thresholds balanced for ADHD project development
      thresholds: {
        lines: 75, // 75% line coverage - reasonable for rapid development
        functions: 70, // 70% function coverage - focus on critical functions
        branches: 65, // 65% branch coverage - covers main paths
        statements: 75, // 75% statement coverage - matches line coverage
      },

      // Include only source files for coverage
      include: ['src/**/*.ts'],

      // Exclude files that don't need coverage
      exclude: [
        'src/types/**', // Type definitions
        'src/server.ts', // Server entry point
        'tests/**', // Test files
        'node_modules/**', // Dependencies
        'dist/**', // Build output
        '**/*.d.ts', // Type declaration files
      ],

      // Skip empty lines for cleaner coverage reports
      skipFull: false,
      all: true,
    },

    // Test file patterns
    include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],

    // Exclude unnecessary files from testing
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
    ],

    // Define external dependencies that should not be transformed
    deps: {
      external: ['fastify'],
    },
  },

  resolve: {
    // Optimized import conditions for ESM compatibility
    conditions: ['import', 'module', 'browser', 'default'],

    alias: {
      // Force @orchestr8 packages to use built ESM files for compatibility
      '@orchestr8/logger': resolve(
        __dirname,
        'node_modules/@orchestr8/logger/dist/esm/index.js'
      ),
      '@orchestr8/resilience': resolve(
        __dirname,
        'node_modules/@orchestr8/resilience/dist/esm/index.js'
      ),
      '@orchestr8/schema': resolve(
        __dirname,
        'node_modules/@orchestr8/schema/dist/esm/index.js'
      ),
      // Path alias for clean imports
      '@': resolve(__dirname, './src'),
    },
  },

  // ESM/CJS compatibility
  esbuild: {
    target: 'es2022',
  },
});
