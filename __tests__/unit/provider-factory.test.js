// __tests__/provider-factory.test.js

import { describe, it, expect } from 'vitest';
import { ProviderFactory } from '@modules/provider-factory.js';
import { AIProvider } from '@modules/ai-provider.js';

describe('ProviderFactory', () => {

    // Test case for creating a custom provider
    it('should create a custom AIProvider instance', () => {
        const customConfig = {
            name: 'My Custom Provider',
            apiUrl: 'https://myapi.com/v1',
            apiKey: 'custom-key',
            defaultModel: 'custom-model',
            models: [{ id: 'custom-model', name: 'Custom Model' }],
            enabled: true
        };

        const provider = ProviderFactory.createCustom(customConfig);

        // 1. Check if the returned object is an instance of AIProvider
        expect(provider).toBeInstanceOf(AIProvider);

        // 2. Check if the configuration properties are correctly applied
        expect(provider.name).toBe(customConfig.name);
        expect(provider.apiUrl).toBe(customConfig.apiUrl);
        expect(provider.apiKey).toBe(customConfig.apiKey);
        expect(provider.defaultModel).toBe(customConfig.defaultModel);
        expect(provider.type).toBe('custom'); // Default type for createCustom
        expect(provider.models.length).toBe(1);
        expect(provider.enabled).toBe(true);
    });

    // --- Template Creation Tests ---
    const templates = [
        { type: 'openai', name: 'OpenAI', apiUrlContains: 'openai.com', defaultModel: 'gpt-4o' },
        { type: 'anthropic', name: 'Anthropic', apiUrlContains: 'anthropic.com/v1/messages', defaultModel: 'claude-3-5-sonnet-20241022' },
        { type: 'openrouter', name: 'OpenRouter', apiUrlContains: 'openrouter.ai', defaultModel: 'meta-llama/llama-3.3-70b-instruct' },
        { type: 'groq', name: 'Groq', apiUrlContains: 'groq.com', defaultModel: 'llama-3.3-70b-versatile' },
        { type: 'deepseek', name: 'DeepSeek', apiUrlContains: 'deepseek.com', defaultModel: 'deepseek-chat' }
    ];

    templates.forEach(({ type, name, apiUrlContains, defaultModel }) => {
        it(`should create an AIProvider instance from the '${type}' template`, () => {
            const testKey = `test-api-key-for-${type}`;
            const provider = ProviderFactory.createFromTemplate(type, testKey);

            // 1. Check instance type
            expect(provider).toBeInstanceOf(AIProvider);

            // 2. Check key properties derived from the template
            expect(provider.name).toBe(name);
            expect(provider.type).toBe(type);
            expect(provider.apiUrl).toContain(apiUrlContains);
            expect(provider.defaultModel).toBe(defaultModel);
            expect(provider.apiKey).toBe(testKey);

            // 3. Ensure a list of models is populated
            expect(provider.models).toBeInstanceOf(Array);
            expect(provider.models.length).toBeGreaterThan(0);
        });
    });

    // Test case for an unknown template
    it('should create a default custom provider for an unknown template type', () => {
        const provider = ProviderFactory.createFromTemplate('unknown-template-123', 'some-key');

        // 1. Check instance type and default properties
        expect(provider).toBeInstanceOf(AIProvider);
        expect(provider.type).toBe('custom');
        expect(provider.name).toBeUndefined(); // Should be undefined as it's not set
        expect(provider.apiUrl).toBeUndefined();
        expect(provider.apiKey).toBe('some-key'); // The provided API key should still be passed
        expect(provider.models).toBeInstanceOf(Array);
        expect(provider.models.length).toBe(0);
    });

    // --- getTemplate Tests ---
    it('should return a provider object without an API key for getTemplate method', () => {
        const provider = ProviderFactory.getTemplate('openai');

        expect(provider).toBeInstanceOf(AIProvider);
        expect(provider.name).toBe('OpenAI');
        expect(provider.apiKey).toBe(''); // API key should be an empty string
    });

    it('should return a default custom provider for an unknown template using getTemplate', () => {
        const provider = ProviderFactory.getTemplate('nonexistent-template');

        expect(provider).toBeInstanceOf(AIProvider);
        expect(provider.type).toBe('custom');
        expect(provider.models.length).toBe(0);
        expect(provider.apiKey).toBe('');
    });
});
