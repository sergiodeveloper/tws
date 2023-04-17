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
      branches: 100,
      functions: 100,
      lines: 100,
    }
  },
  collectCoverageFrom: [
    'src/**/*.{ts,json}',
  ],
  testTimeout: 50,
  testMatch: [
    '**/test/**/*.spec.ts',
  ],
};
