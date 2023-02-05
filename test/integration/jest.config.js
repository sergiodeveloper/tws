/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  reporters: ['default'],
  collectCoverage: true,
  coverageReporters: ['text'],
  coverageThreshold: {
    global: {
      statements: 100,
    }
  },
  collectCoverageFrom: [
    'src/**/*.{ts,json}',
  ],
  testTimeout: 100,
  testMatch: [
    '**/test/integration/**/*.spec.ts',
  ],
};
