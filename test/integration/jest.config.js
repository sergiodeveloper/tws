/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  reporters: ['default', 'jest-junit'],
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
  testMatch: [
    '**/test/integration/**/*.spec.ts',
  ],
};
