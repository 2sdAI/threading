// __tests__/ai-provider.test.js (or similar location)

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIProvider } from '@/modules/ai-provider';

// Mock the global fetch function before each test
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('AIProvider', () => {
    const mockConfigOpenAI = {
        name: 'Test OpenAI',
        type: 'openai',
        apiUrl: 'https://api.openai.com/v1/chat/completions',
        apiKey: 'test-openai-key',
        defaultModel: 'gpt-3.5-turbo',
        models: [{ id: 'gpt-3.5-turbo', name: 'Turbo' }],
        enabled: true
    };

    const mockConfigAnthropic = {
        name: 'Test Anthropic',
        type: 'anthropic',
        apiUrl: 'https://api.anthropic.com/v1/messages',
        apiKey: 'test-anthropic-key',
        defaultModel: 'claude-3-haiku',
        enabled: true
    };

    beforeEach(() => {
        // Clear all mocks before each test
        vi.clearAllMocks();
    });

    // --- 1. Constructor Initialization Tests ---
    describe('Constructor Initialization', () => {
        it('should initialize correctly with full configuration', () => {
            const provider = new AIProvider(mockConfigOpenAI);
            expect(provider.name).toBe('Test OpenAI');
            expect(provider.type).toBe('openai');
            expect(provider.apiKey).toBe('test-openai-key');
            expect(provider.enabled).toBe(true);
            expect(provider.models.length).toBe(1);
            expect(provider.id).toMatch(/^provider-\d+-/); // Should generate a unique ID
        });

        it('should initialize correctly with minimal configuration and apply defaults', () => {
            const minimalConfig = { name: 'Minimal', apiUrl: 'http://test.com' };
            const provider = new AIProvider(minimalConfig);

            expect(provider.name).toBe('Minimal');
            expect(provider.type).toBe('custom'); // Default type
            expect(provider.apiUrl).toBe('http://test.com');
            expect(provider.apiKey).toBe(''); // Default API key
            expect(provider.defaultModel).toBe(''); // Default model
            expect(provider.models).toEqual([]); // Default models
            expect(provider.enabled).toBe(true); // Default enabled
        });

        it('should respect explicit enabled: false setting', () => {
            const config = { ...mockConfigOpenAI, enabled: false };
            const provider = new AIProvider(config);
            expect(provider.enabled).toBe(false);
        });
    });

    // --- 2. _getHeaders Method Tests ---
    describe('_getHeaders', () => {
        it('should return correct headers for OpenAI (Bearer token)', () => {
            const provider = new AIProvider(mockConfigOpenAI);
            const headers = provider._getHeaders();
            expect(headers['Content-Type']).toBe('application/json');
            expect(headers['Authorization']).toBe('Bearer test-openai-key');
            expect(headers['x-api-key']).toBeUndefined();
        });

        it('should return correct headers for Anthropic (x-api-key)', () => {
            const provider = new AIProvider(mockConfigAnthropic);
            const headers = provider._getHeaders();
            expect(headers['Content-Type']).toBe('application/json');
            expect(headers['x-api-key']).toBe('test-anthropic-key');
            expect(headers['anthropic-version']).toBe('2023-06-01');
            expect(headers['Authorization']).toBeUndefined();
        });

        it('should not include auth headers if apiKey is empty', () => {
            const config = { ...mockConfigOpenAI, apiKey: '' };
            const provider = new AIProvider(config);
            const headers = provider._getHeaders();
            expect(headers['Authorization']).toBeUndefined();
            expect(headers['x-api-key']).toBeUndefined();
        });
    });

    // --- 3 & 4. testConnection Method Tests ---
    describe('testConnection', () => {
        const mockSuccessResponse = (data, status = 200, type = 'basic') =>
            Promise.resolve({
                ok: true,
                status: status,
                type: type,
                json: () => Promise.resolve(data),
                text: () => Promise.resolve(JSON.stringify(data)),
                clone: () => mockSuccessResponse(data, status, type)
            });

        const mockFailureResponse = (status = 400, errorText = 'Bad Request') =>
            Promise.resolve({
                ok: false,
                status: status,
                text: () => Promise.resolve(errorText),
                json: () => Promise.resolve({ error: errorText })
            });

        it('should succeed for a chat/completions endpoint (POST test)', async () => {
            mockFetch.mockResolvedValueOnce(mockSuccessResponse({ success: true }));
            const provider = new AIProvider(mockConfigOpenAI);
            const result = await provider.testConnection();

            expect(result.success).toBe(true);
            expect(result.message).toBe('Connection successful');
            expect(mockFetch).toHaveBeenCalledWith(
                mockConfigOpenAI.apiUrl,
                expect.objectContaining({ method: 'POST' })
            );
        });

        it('should succeed for a non-chat endpoint like Anthropic (GET test on mock /models)', async () => {
            const config = { ...mockConfigAnthropic, apiUrl: 'https://api.anthropic.com/v1' };
            mockFetch.mockResolvedValueOnce(mockSuccessResponse({ models: ['claude'] }));
            const provider = new AIProvider(config);
            const result = await provider.testConnection();

            expect(result.success).toBe(true);
            expect(result.message).toBe('Connection successful');
            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.anthropic.com/v1/models', // Appends /models
                expect.objectContaining({ method: 'GET' })
            );
        });

        it('should fail on a non-200 response', async () => {
            mockFetch.mockResolvedValueOnce(mockFailureResponse(404, 'Not Found Error'));
            const provider = new AIProvider(mockConfigOpenAI);
            const result = await provider.testConnection();

            expect(result.success).toBe(false);
            expect(result.message).toContain('API request failed (404): Not Found Error');
        });
    });

    // --- 5, 6 & 7. sendRequest Method Tests ---
    describe('sendRequest', () => {
        const testMessages = [{ role: 'user', content: 'Hello' }];
        const testModel = 'test-model';

        const mockSuccessResponse = (data, status = 200) =>
            Promise.resolve({
                ok: true,
                status: status,
                json: () => Promise.resolve(data),
                text: () => Promise.resolve(JSON.stringify(data))
            });

        const mockFailureResponse = (status = 400, errorText = 'Unauthorized') =>
            Promise.resolve({
                ok: false,
                status: status,
                text: () => Promise.resolve(errorText)
            });

        it('should send request and extract content for OpenAI type', async () => {
            const mockResponse = {
                choices: [{ message: { content: 'OpenAI Response' } }],
                usage: {}
            };
            mockFetch.mockResolvedValueOnce(mockSuccessResponse(mockResponse));
            const provider = new AIProvider(mockConfigOpenAI);
            const result = await provider.sendRequest(testMessages, testModel);

            expect(result).toBe('OpenAI Response');
            expect(mockFetch).toHaveBeenCalledWith(
                mockConfigOpenAI.apiUrl,
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({
                        model: testModel,
                        messages: testMessages,
                        temperature: 0.7,
                        stream: false
                    })
                })
            );
        });

        it('should send request and extract content for Anthropic type', async () => {
            const mockResponse = {
                content: [{ type: 'text', text: 'Anthropic Response' }],
                id: 'msg_0123'
            };
            mockFetch.mockResolvedValueOnce(mockSuccessResponse(mockResponse));
            const provider = new AIProvider(mockConfigAnthropic);
            const result = await provider.sendRequest(testMessages, testModel);

            expect(result).toBe('Anthropic Response');
            expect(mockFetch).toHaveBeenCalledWith(
                mockConfigAnthropic.apiUrl,
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({
                        model: testModel,
                        messages: testMessages,
                        temperature: 0.7,
                        stream: false,
                        max_tokens: 4096 // Specific to Anthropic
                    })
                })
            );
        });

        it('should throw an error on unsuccessful response', async () => {
            mockFetch.mockResolvedValueOnce(mockFailureResponse(401, 'Unauthorized Error'));
            const provider = new AIProvider(mockConfigOpenAI);

            await expect(provider.sendRequest(testMessages)).rejects.toThrow(
                'AI Provider Error (401): Unauthorized Error'
            );
        });
    });

    // --- 8. toJSON Method Test ---
    describe('toJSON', () => {
        it('should return a plain object with all instance properties', () => {
            const provider = new AIProvider(mockConfigOpenAI);
            const json = provider.toJSON();

            expect(json).toBeInstanceOf(Object);
            expect(json.name).toBe(mockConfigOpenAI.name);
            expect(json.type).toBe(mockConfigOpenAI.type);
            expect(json.apiUrl).toBe(mockConfigOpenAI.apiUrl);
            expect(json.apiKey).toBe(mockConfigOpenAI.apiKey);
            expect(json.defaultModel).toBe(mockConfigOpenAI.defaultModel);
            expect(json.models).toEqual(mockConfigOpenAI.models);
            expect(json.enabled).toBe(mockConfigOpenAI.enabled);
            expect(json.id).toBe(provider.id); // Check the generated ID is included
        });
    });
});
