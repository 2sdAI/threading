// __tests__/helpers/test-utils.js
/**
 * Test utilities and helper functions
 */

/**
 * Create a mock Chat instance
 */
export function createMockChat(overrides = {}) {
  return {
    id: `chat-${Date.now()}`,
    title: 'Test Chat',
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    projectId: null,
    defaultProviderId: null,
    defaultModelId: null,
    archived: false,
    pinned: false,
    metadata: {},
    ...overrides
  };
}

/**
 * Create a mock Message instance
 */
export function createMockMessage(overrides = {}) {
  return {
    id: `msg-${Date.now()}`,
    role: 'user',
    content: 'Test message',
    timestamp: new Date().toISOString(),
    agentId: null,
    providerId: null,
    providerName: null,
    modelId: null,
    modelName: null,
    metadata: {},
    edited: false,
    editedAt: null,
    ...overrides
  };
}

/**
 * Create a mock Provider instance
 */
export function createMockProvider(overrides = {}) {
  return {
    id: `provider-${Date.now()}`,
    name: 'Test Provider',
    type: 'custom',
    apiUrl: 'https://api.test.com/v1/chat/completions',
    apiKey: 'test-key-123',
    defaultModel: 'test-model',
    models: [
      { id: 'test-model', name: 'Test Model', description: 'For testing' }
    ],
    enabled: true,
    ...overrides
  };
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(condition, timeout = 5000, interval = 100) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Create a mock DOM element
 */
export function createMockElement(tag = 'div', attributes = {}) {
  const element = document.createElement(tag);
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  return element;
}

/**
 * Clean up DOM after test
 */
export function cleanupDOM() {
  document.body.innerHTML = '';
}

/**
 * Mock fetch responses
 */
export function mockFetch(responses) {
  const originalFetch = global.fetch;
  const mockResponses = Array.isArray(responses) ? responses : [responses];
  let callCount = 0;

  global.fetch = jest.fn(async (url, options) => {
    const response = mockResponses[callCount] || mockResponses[mockResponses.length - 1];
    callCount++;

    return {
      ok: response.ok !== false,
      status: response.status || 200,
      json: async () => response.data || response,
      text: async () => JSON.stringify(response.data || response),
      headers: new Headers(response.headers || {})
    };
  });

  return () => {
    global.fetch = originalFetch;
  };
}

/**
 * Create a mock IndexedDB database
 */
export async function createMockDB(dbName = 'TestDB') {
  const fakeIndexedDB = require('fake-indexeddb');
  const FDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');
  
  global.indexedDB = fakeIndexedDB;
  global.IDBKeyRange = FDBKeyRange;

  return {
    reset: async () => {
      await new Promise((resolve) => {
        const req = indexedDB.deleteDatabase(dbName);
        req.onsuccess = resolve;
        req.onerror = resolve;
      });
    }
  };
}

/**
 * Mock localStorage
 */
export function mockLocalStorage() {
  const store = {};
  
  const mock = {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
    key: jest.fn((index) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }),
    get length() {
      return Object.keys(store).length;
    }
  };

  Object.defineProperty(window, 'localStorage', {
    value: mock,
    writable: true
  });

  return mock;
}

/**
 * Mock BroadcastChannel
 */
export function mockBroadcastChannel() {
  const channels = new Map();

  global.BroadcastChannel = class MockBroadcastChannel {
    constructor(name) {
      this.name = name;
      this.listeners = [];
      
      if (!channels.has(name)) {
        channels.set(name, []);
      }
      channels.get(name).push(this);
    }

    postMessage(data) {
      // Simulate async delivery
      setTimeout(() => {
        channels.get(this.name).forEach(channel => {
          if (channel !== this) {
            channel.listeners.forEach(listener => {
              listener({ data });
            });
          }
        });
      }, 0);
    }

    addEventListener(type, listener) {
      if (type === 'message') {
        this.listeners.push(listener);
      }
    }

    removeEventListener(type, listener) {
      if (type === 'message') {
        const index = this.listeners.indexOf(listener);
        if (index > -1) {
          this.listeners.splice(index, 1);
        }
      }
    }

    close() {
      const channelList = channels.get(this.name);
      const index = channelList.indexOf(this);
      if (index > -1) {
        channelList.splice(index, 1);
      }
    }
  };

  return {
    reset: () => {
      channels.clear();
    }
  };
}

/**
 * Mock Service Worker
 */
export function mockServiceWorker() {
  const registration = {
    active: {
      postMessage: jest.fn()
    },
    installing: null,
    waiting: null,
    addEventListener: jest.fn(),
    update: jest.fn()
  };

  const serviceWorker = {
    controller: {
      postMessage: jest.fn()
    },
    ready: Promise.resolve(registration),
    register: jest.fn(() => Promise.resolve(registration)),
    getRegistrations: jest.fn(() => Promise.resolve([registration])),
    addEventListener: jest.fn()
  };

  Object.defineProperty(navigator, 'serviceWorker', {
    value: serviceWorker,
    writable: true
  });

  return { registration, serviceWorker };
}

/**
 * Flush all pending promises
 */
export async function flushPromises() {
  return new Promise(resolve => setImmediate(resolve));
}

/**
 * Create a spy for console methods
 */
export function spyOnConsole() {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  const spies = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };

  console.log = spies.log;
  console.warn = spies.warn;
  console.error = spies.error;

  return {
    ...spies,
    restore: () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    }
  };
}

// __tests__/fixtures/mock-providers.js
/**
 * Mock provider data for testing
 */

export const mockOpenAIProvider = {
  id: 'openai-test',
  name: 'OpenAI (Test)',
  type: 'openai',
  apiUrl: 'https://api.openai.com/v1/chat/completions',
  apiKey: 'sk-test-key-123',
  defaultModel: 'gpt-4',
  models: [
    { id: 'gpt-4', name: 'GPT-4', description: 'Most capable' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and economical' }
  ],
  enabled: true
};

export const mockAnthropicProvider = {
  id: 'anthropic-test',
  name: 'Anthropic (Test)',
  type: 'anthropic',
  apiUrl: 'https://api.anthropic.com/v1/messages',
  apiKey: 'sk-ant-test-key-123',
  defaultModel: 'claude-3-opus-20240229',
  models: [
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Most capable' },
    { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: 'Balanced' }
  ],
  enabled: true
};

export const mockOpenRouterProvider = {
  id: 'openrouter-test',
  name: 'OpenRouter (Test)',
  type: 'openrouter',
  apiUrl: 'https://openrouter.ai/api/v1/chat/completions',
  apiKey: 'sk-or-test-key-123',
  defaultModel: 'meta-llama/llama-3-70b-instruct',
  models: [
    { 
      id: 'meta-llama/llama-3-70b-instruct', 
      name: 'Llama 3 70B', 
      description: 'Free - Meta flagship' 
    }
  ],
  enabled: true
};

// __tests__/fixtures/mock-chats.js
/**
 * Mock chat data for testing
 */

export const mockEmptyChat = {
  id: 'chat-empty',
  title: 'Empty Chat',
  messages: [],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  projectId: null,
  defaultProviderId: null,
  defaultModelId: null,
  archived: false,
  pinned: false,
  metadata: {}
};

export const mockChatWithMessages = {
  id: 'chat-with-messages',
  title: 'Chat with Messages',
  messages: [
    {
      id: 'msg-1',
      role: 'user',
      content: 'Hello, how are you?',
      timestamp: '2024-01-01T00:00:00.000Z'
    },
    {
      id: 'msg-2',
      role: 'assistant',
      content: 'I am doing well, thank you!',
      timestamp: '2024-01-01T00:01:00.000Z',
      providerId: 'openai',
      providerName: 'OpenAI',
      modelId: 'gpt-4',
      modelName: 'GPT-4'
    }
  ],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:01:00.000Z',
  projectId: null,
  defaultProviderId: 'openai',
  defaultModelId: 'gpt-4',
  archived: false,
  pinned: false,
  metadata: {}
};

// __tests__/fixtures/mock-responses.js
/**
 * Mock API responses for testing
 */

export const mockOpenAIResponse = {
  id: 'chatcmpl-123',
  object: 'chat.completion',
  created: 1677652288,
  model: 'gpt-4',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant',
        content: 'This is a test response from GPT-4'
      },
      finish_reason: 'stop'
    }
  ],
  usage: {
    prompt_tokens: 10,
    completion_tokens: 20,
    total_tokens: 30
  }
};

export const mockAnthropicResponse = {
  id: 'msg_123',
  type: 'message',
  role: 'assistant',
  content: [
    {
      type: 'text',
      text: 'This is a test response from Claude'
    }
  ],
  model: 'claude-3-opus-20240229',
  stop_reason: 'end_turn',
  usage: {
    input_tokens: 10,
    output_tokens: 20
  }
};

export const mockErrorResponse = {
  error: {
    message: 'Invalid API key',
    type: 'invalid_request_error',
    code: 'invalid_api_key'
  }
};
