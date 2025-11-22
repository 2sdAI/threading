module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup/jest.setup.js'],
  testMatch: [
    '**/__tests__/unit/**/*.test.js',
    '**/__tests__/integration/**/*.test.js'
  ],
  collectCoverageFrom: [
    'js/**/*.js',
    '!js/app.js',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    }
  },
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/__tests__/helpers/styleMock.js'
  },
  testTimeout: 10000
};
