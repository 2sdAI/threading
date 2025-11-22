// Add custom matchers
require('@testing-library/jest-dom');

// Mock localStorage
require('jest-localstorage-mock');

// Global test timeout
jest.setTimeout(10000);

// Suppress console errors in tests (optional)
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  })
);
