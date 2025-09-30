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
    '^@test/(.*)$': '<rootDir>/tests/$1',
  },
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/main.ts',
    '!src/background.ts',
    '!src/server/**/*.ts',
    '!src/**/*.d.ts',
    '!node_modules/**',
    '!tests/**',
    '!dist/**',
    '!coverage/**',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: [
    'text',
    'lcov',
    'clover',
    'html',
  ],
  verbose: true,
  setupFilesAfterEnv: ['<rootDir>/tests/setup-jest.js'],
  globals: {
    'ts-jest': {
      tsconfig: {
        target: 'es2017',
        module: 'commonjs',
        strict: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
      },
    },
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/tests/e2e/',
  ],
}
