import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIProvider } from '@/modules/ai-provider';

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
        vi.clearAllMocks();
    });

    // --- Constructor Initialization Tests ---
    describe('Constructor Initialization', () => {
        it('should initialize correctly with full configuration', () => {
            const provider = new AIProvider(mockConfigOpenAI);
            expect(provider.name).toBe('Test OpenAI');
            expect(provider.type).toBe('openai');
            expect(provider.apiKey).toBe('test-openai-key');
            expect(provider.enabled).toBe(true);
            expect(provider.models.length).toBe(1);
            expect(provider.id).toMatch(/^provider-\d+-/);
        });

        it('should initialize correctly with minimal configuration and apply defaults', () => {
            const minimalConfig = { name: 'Minimal', apiUrl: 'http://test.com' };
            const provider = new AIProvider(minimalConfig);

            expect(provider.name).toBe('Minimal');
            expect(provider.type).toBe('custom');
            expect(provider.apiUrl).toBe('http://test.com');
            expect(provider.apiKey).toBe('');
            expect(provider.defaultModel).toBe('');
            expect(provider.models).toEqual([]);
            expect(provider.enabled).toBe(true);
        });

        it('should respect explicit enabled: false setting', () => {
            const config = { ...mockConfigOpenAI, enabled: false };
            const provider = new AIProvider(config);
            expect(provider.enabled).toBe(false);
        });

        it('should use provided ID if given', () => {
            const config = { ...mockConfigOpenAI, id: 'custom-id-123' };
            const provider = new AIProvider(config);
            expect(provider.id).toBe('custom-id-123');
        });

        it('should generate unique IDs for different instances', () => {
            const provider1 = new AIProvider({ name: 'P1' });
            const provider2 = new AIProvider({ name: 'P2' });
            expect(provider1.id).not.toBe(provider2.id);
        });
    });

    // --- _getHeaders Method Tests ---
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

        it('should not include auth headers if apiKey is null', () => {
            const config = { ...mockConfigOpenAI, apiKey: null };
            const provider = new AIProvider(config);
            provider.apiKey = null;
            const headers = provider._getHeaders();
            expect(headers['Authorization']).toBeUndefined();
        });

        it('should handle custom provider type with Bearer token', () => {
            const config = {
                name: 'Custom',
                type: 'custom',
                apiKey: 'custom-key'
            };
            const provider = new AIProvider(config);
            const headers = provider._getHeaders();
            expect(headers['Authorization']).toBe('Bearer custom-key');
        });

        it('should handle openrouter type with Bearer token', () => {
            const config = {
                name: 'OpenRouter',
                type: 'openrouter',
                apiKey: 'openrouter-key'
            };
            const provider = new AIProvider(config);
            const headers = provider._getHeaders();
            expect(headers['Authorization']).toBe('Bearer openrouter-key');
        });

        it('should handle groq type with Bearer token', () => {
            const config = {
                name: 'Groq',
                type: 'groq',
                apiKey: 'groq-key'
            };
            const provider = new AIProvider(config);
            const headers = provider._getHeaders();
            expect(headers['Authorization']).toBe('Bearer groq-key');
        });
    });

    // --- testConnection Method Tests ---
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

        it('should succeed for a non-chat endpoint (GET test on /models)', async () => {
            const config = { ...mockConfigAnthropic, apiUrl: 'https://api.anthropic.com/v1' };
            mockFetch.mockResolvedValueOnce(mockSuccessResponse({ models: ['claude'] }));
            const provider = new AIProvider(config);
            const result = await provider.testConnection();

            expect(result.success).toBe(true);
            expect(result.message).toBe('Connection successful');
            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.anthropic.com/v1/models',
                expect.objectContaining({ method: 'GET' })
            );
        });

        it('should append /models correctly when URL ends with slash', async () => {
            const config = { ...mockConfigOpenAI, apiUrl: 'https://api.test.com/v1/' };
            mockFetch.mockResolvedValueOnce(mockSuccessResponse({ models: [] }));
            const provider = new AIProvider(config);
            await provider.testConnection();

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.test.com/v1/models',
                expect.anything()
            );
        });

        it('should append /models correctly when URL does not end with slash', async () => {
            const config = { ...mockConfigOpenAI, apiUrl: 'https://api.test.com/v1' };
            mockFetch.mockResolvedValueOnce(mockSuccessResponse({ models: [] }));
            const provider = new AIProvider(config);
            await provider.testConnection();

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.test.com/v1/models',
                expect.anything()
            );
        });

        it('should fail on a non-200 response', async () => {
            mockFetch.mockResolvedValueOnce(mockFailureResponse(404, 'Not Found Error'));
            const provider = new AIProvider(mockConfigOpenAI);
            const result = await provider.testConnection();

            expect(result.success).toBe(false);
            expect(result.message).toContain('API request failed (404): Not Found Error');
        });

        it('should fail on network error', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));
            const provider = new AIProvider(mockConfigOpenAI);
            const result = await provider.testConnection();

            expect(result.success).toBe(false);
            expect(result.message).toBe('Network error');
        });

        it('should return data on success', async () => {
            const responseData = { models: ['gpt-4', 'gpt-3.5-turbo'] };
            mockFetch.mockResolvedValueOnce(mockSuccessResponse(responseData));
            const provider = new AIProvider(mockConfigOpenAI);
            const result = await provider.testConnection();

            expect(result.success).toBe(true);
            expect(result.data).toEqual(responseData);
        });

        it('should use default model in test payload when no defaultModel set', async () => {
            const config = { ...mockConfigOpenAI, defaultModel: '' };
            mockFetch.mockResolvedValueOnce(mockSuccessResponse({ success: true }));
            const provider = new AIProvider(config);
            await provider.testConnection();

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: expect.stringContaining('"model":"gpt-3.5-turbo"')
                })
            );
        });

        it('should use provided defaultModel in test payload', async () => {
            mockFetch.mockResolvedValueOnce(mockSuccessResponse({ success: true }));
            const provider = new AIProvider(mockConfigOpenAI);
            await provider.testConnection();

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: expect.stringContaining(`"model":"${mockConfigOpenAI.defaultModel}"`)
                })
            );
        });
    });

    // --- sendRequest Method Tests ---
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
                        max_tokens: 4096
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

        it('should use defaultModel when modelId not provided', async () => {
            const mockResponse = {
                choices: [{ message: { content: 'Response' } }]
            };
            mockFetch.mockResolvedValueOnce(mockSuccessResponse(mockResponse));
            const provider = new AIProvider(mockConfigOpenAI);
            await provider.sendRequest(testMessages);

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: expect.stringContaining(`"model":"${mockConfigOpenAI.defaultModel}"`)
                })
            );
        });

        it('should append /chat/completions if URL does not have it', async () => {
            const config = { ...mockConfigOpenAI, apiUrl: 'https://api.test.com/v1' };
            const mockResponse = {
                choices: [{ message: { content: 'Response' } }]
            };
            mockFetch.mockResolvedValueOnce(mockSuccessResponse(mockResponse));
            const provider = new AIProvider(config);
            await provider.sendRequest(testMessages, testModel);

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.test.com/v1/chat/completions',
                expect.anything()
            );
        });

        it('should not append /chat/completions if URL already has it', async () => {
            const mockResponse = {
                choices: [{ message: { content: 'Response' } }]
            };
            mockFetch.mockResolvedValueOnce(mockSuccessResponse(mockResponse));
            const provider = new AIProvider(mockConfigOpenAI);
            await provider.sendRequest(testMessages, testModel);

            expect(mockFetch).toHaveBeenCalledWith(
                mockConfigOpenAI.apiUrl,
                expect.anything()
            );
        });

        it('should not append /chat/completions if URL contains /messages (Anthropic)', async () => {
            const mockResponse = {
                content: [{ type: 'text', text: 'Response' }]
            };
            mockFetch.mockResolvedValueOnce(mockSuccessResponse(mockResponse));
            const provider = new AIProvider(mockConfigAnthropic);
            await provider.sendRequest(testMessages, testModel);

            expect(mockFetch).toHaveBeenCalledWith(
                mockConfigAnthropic.apiUrl,
                expect.anything()
            );
        });

        it('should handle URL with trailing slash', async () => {
            const config = { ...mockConfigOpenAI, apiUrl: 'https://api.test.com/v1/' };
            const mockResponse = {
                choices: [{ message: { content: 'Response' } }]
            };
            mockFetch.mockResolvedValueOnce(mockSuccessResponse(mockResponse));
            const provider = new AIProvider(config);
            await provider.sendRequest(testMessages, testModel);

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.test.com/v1/chat/completions',
                expect.anything()
            );
        });
    });

    // --- toJSON Method Test ---
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
            expect(json.id).toBe(provider.id);
        });

        it('should include all properties even if empty', () => {
            const minimalProvider = new AIProvider({ name: 'Minimal' });
            const json = minimalProvider.toJSON();

            expect(json).toHaveProperty('id');
            expect(json).toHaveProperty('name');
            expect(json).toHaveProperty('type');
            expect(json).toHaveProperty('apiUrl');
            expect(json).toHaveProperty('apiKey');
            expect(json).toHaveProperty('defaultModel');
            expect(json).toHaveProperty('models');
            expect(json).toHaveProperty('enabled');
        });

        it('should return a new object (not reference)', () => {
            const provider = new AIProvider(mockConfigOpenAI);
            const json1 = provider.toJSON();
            const json2 = provider.toJSON();

            expect(json1).not.toBe(json2);
            expect(json1).toEqual(json2);
        });
    });

    // --- Edge Cases ---
    describe('Edge Cases', () => {
        it('should handle very long API key', () => {
            const longKey = 'k'.repeat(1000);
            const provider = new AIProvider({ ...mockConfigOpenAI, apiKey: longKey });
            expect(provider.apiKey).toBe(longKey);
            expect(provider._getHeaders()['Authorization']).toBe(`Bearer ${longKey}`);
        });

        it('should handle special characters in API key', () => {
            const specialKey = 'sk-test_key.with-special/chars+123=';
            const provider = new AIProvider({ ...mockConfigOpenAI, apiKey: specialKey });
            expect(provider.apiKey).toBe(specialKey);
        });

        it('should handle empty models array', () => {
            const provider = new AIProvider({ ...mockConfigOpenAI, models: [] });
            expect(provider.models).toEqual([]);
        });

        it('should handle models with full metadata', () => {
            const models = [
                { id: 'model-1', name: 'Model 1', description: 'Description 1', context: 4096 },
                { id: 'model-2', name: 'Model 2', description: 'Description 2', context: 8192 }
            ];
            const provider = new AIProvider({ ...mockConfigOpenAI, models });
            expect(provider.models).toEqual(models);
        });

        it('should preserve original config in toJSON', () => {
            const provider = new AIProvider(mockConfigOpenAI);
            const json = provider.toJSON();

            // Modify the json object
            json.name = 'Modified';

            // Original should be unchanged
            expect(provider.name).toBe('Test OpenAI');
        });
    });
});
