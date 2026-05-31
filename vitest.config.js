/**
 * Vitest configuration for ZSMS.
 *
 * HOW TO RUN:
 *   npm test           — run all Vitest suites once
 *   npm run test:watch — watch mode
 *   npm run test:ui    — browser UI
 *   npm run test:jest  — legacy Jest component tests
 *
 * WHERE TO PUT TESTS:
 *   __tests__/unit/  — pure function tests
 *   __tests__/api/   — API route tests (mocked DB + services)
 */
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['__tests__/setup.js'],
    include: [
      '__tests__/api/**/*.test.js',
      '__tests__/unit/**/*.test.js',
      '__tests__/security/**/*.test.js',
      'test/security/**/*.test.js',
      'lib/timetable/__tests__/**/*.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['lib/**', 'app/api/**'],
      exclude: ['**/*.test.js', '**/__mocks__/**'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
      'next/server': resolve(__dirname, '__tests__/helpers/next-server.js'),
    },
  },
})
