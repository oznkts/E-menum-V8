/**
 * Vitest Configuration
 *
 * This configuration sets up Vitest for unit and integration testing
 * with React Testing Library and jsdom environment.
 *
 * @see https://nextjs.org/docs/app/guides/testing/vitest
 * @see https://vitest.dev/config/
 */

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [
    // Enable React JSX transformation for tests
    react(),
    // Respect tsconfig.json path aliases (@/* -> ./src/*)
    tsconfigPaths(),
  ],
  test: {
    // Use jsdom environment for DOM testing
    environment: 'jsdom',

    // Global test setup - runs before each test file
    globals: true,

    // Test file patterns
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],

    // Exclude patterns
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/coverage/**',
    ],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '.next/',
        'coverage/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/types/**',
      ],
    },

    // Reporter options
    reporters: ['default'],

    // Test timeout (10 seconds)
    testTimeout: 10000,

    // Hook timeout (10 seconds)
    hookTimeout: 10000,

    // Mock reset between tests
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,
  },
})
