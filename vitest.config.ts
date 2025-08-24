import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    conditions: ['import', 'module', 'browser', 'default'], // Skip 'development'
    alias: {
      // Force all @orchestr8 packages to use built ESM files
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
    },
  },
});
