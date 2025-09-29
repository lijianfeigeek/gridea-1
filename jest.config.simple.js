module.exports = {
  testEnvironment: 'node',
  testTimeout: 30000,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  transformIgnorePatterns: [
    '/node_modules/',
  ],
  testMatch: [
    '**/tests/**/*.test.[jt]s?(x)',
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/helpers/test-setup.ts'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/main.ts',
    '!src/background.ts',
    '!src/**/*.d.ts',
    '!src/server/**/*.ts',
    '!node_modules/**',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: [
    'text',
    'lcov',
    'clover',
  ],
  verbose: true,
}
