module.exports = {
  testEnvironment: 'node',
  testTimeout: 30000,
  testMatch: [
    '**/tests/**/*.test.{js,ts}',
  ],
  transform: {
    '^.+\\.js$': ['babel-jest', { configFile: './babel.config.jest.js' }],
    '^.+\\.ts$': ['babel-jest', { configFile: './babel.config.jest.js' }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{js}',
    '!src/main.ts',
    '!src/background.ts',
    '!src/**/*.ts',
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
