module.exports = {
  testEnvironment: 'node',
  testTimeout: 30000,
  testMatch: [
    // 明确指定Jest应该运行的测试文件
    '<rootDir>/tests/unit/background/ipc.test.ts', // Jest IPC测试
    '<rootDir>/tests/unit/background/**/!(ipc-vitest).*.test.{js,ts}', // 背景测试，排除Vitest文件
    '<rootDir>/tests/unit/components/**/*.test.{js,ts}', // 组件测试
    '<rootDir>/tests/unit/validators/**/*.test.{js,ts}', // 验证器测试
    '<rootDir>/tests/unit/services/**/*.test.{js,ts}', // 服务测试
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
    // 明确排除Vitest专用测试文件
    '/tests/unit/api/', // API测试由Vitest负责
    '/tests/integration/', // 集成测试由Vitest负责
    '.*-vitest\\.test\\.(js|ts)$', // 排除文件名包含-vitest的测试
    '/tests/unit/background/ipc-vitest.test.ts', // 明确排除Vitest IPC测试
  ],
}
