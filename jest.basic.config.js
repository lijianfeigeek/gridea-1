module.exports = {
  testEnvironment: 'node',
  testTimeout: 30000,
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  testMatch: [
    '**/tests/**/*.test.[jt]s?(x)',
  ],
  verbose: true,
}
