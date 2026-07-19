/** @type {import('jest').Config} */
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  // Legacy suite can leave open handles (jsdom); prefer exit over hang after tests pass.
  forceExit: true,
  modulePathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/.open-next/',
    '<rootDir>/dist/',
    '<rootDir>/build/',
    '<rootDir>/zsms-mobile/',
    '<rootDir>/coverage/',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/.open-next/',
    '<rootDir>/node_modules/',
    '<rootDir>/zsms-mobile/',
  ],
  // Avoid next/jest: withSentryConfig(next.config) can hang Jest config resolution.
  // Legacy suite is lib/unit-focused; vitest remains the primary Next-aware runner.
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': [
      'babel-jest',
      {
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }],
          '@babel/preset-typescript',
        ],
      },
    ],
  },
  transformIgnorePatterns: ['/node_modules/'],
  moduleNameMapper: {
    // uuid@9+ dropped deep requires; keep legacy callers working under package overrides
    '^uuid/v4$': '<rootDir>/__mocks__/uuid-v4.js',
    // Keep unit tests off the real Prisma client graph
    '^@/lib/prisma$': '<rootDir>/__mocks__/prisma.js',
    '^@/lib/prisma/(.*)$': '<rootDir>/__mocks__/prisma.js',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/pages/(.*)$': '<rootDir>/pages/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/(.*)$': '<rootDir>/$1',
  },
}

module.exports = customJestConfig
