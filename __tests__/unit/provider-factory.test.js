import { describe, it, expect } from 'vitest';
import { ProviderFactory } from '@modules/provider-factory.js';
import { AIProvider } from '@modules/ai-provider.js';

describe('ProviderFactory', () => {

    // --- createCustom Tests ---
    describe('createCustom', () => {
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

            expect(provider).toBeInstanceOf(AIProvider);
            expect(provider.name).toBe(customConfig.name);
            expect(provider.apiUrl).toBe(customConfig.apiUrl);
            expect(provider.apiKey).toBe(customConfig.apiKey);
            expect(provider.defaultModel).toBe(customConfig.defaultModel);
            expect(provider.type).toBe('custom');
            expect(provider.models.length).toBe(1);
            expect(provider.enabled).toBe(true);
        });

        it('should create provider with minimal config', () => {
            const provider = ProviderFactory.createCustom({ name: 'Minimal' });

            expect(provider).toBeInstanceOf(AIProvider);
            expect(provider.name).toBe('Minimal');
            expect(provider.type).toBe('custom');
        });

        it('should create provider with explicit type', () => {
            const provider = ProviderFactory.createCustom({
                name: 'Test',
                type: 'openai'
            });

            expect(provider.type).toBe('openai');
        });

        it('should create disabled provider', () => {
            const provider = ProviderFactory.createCustom({
                name: 'Disabled',
                enabled: false
            });

            expect(provider.enabled).toBe(false);
        });
    });

    // --- createFromTemplate Tests ---
    describe('createFromTemplate', () => {
        const templates = [
            {
                type: 'openai',
                name: 'OpenAI',
                apiUrlContains: 'openai.com',
                defaultModel: 'gpt-4o'
            },
            {
                type: 'anthropic',
                name: 'Anthropic',
                apiUrlContains: 'anthropic.com/v1/messages',
                defaultModel: 'claude-3-5-sonnet-20241022'
            },
            {
                type: 'openrouter',
                name: 'OpenRouter',
                apiUrlContains: 'openrouter.ai',
                defaultModel: 'meta-llama/llama-3.3-70b-instruct'
            },
            {
                type: 'groq',
                name: 'Groq',
                apiUrlContains: 'groq.com',
                defaultModel: 'llama-3.3-70b-versatile'
            },
            {
                type: 'deepseek',
                name: 'DeepSeek',
                apiUrlContains: 'deepseek.com',
                defaultModel: 'deepseek-chat'
            }
        ];

        templates.forEach(({ type, name, apiUrlContains, defaultModel }) => {
            it(`should create an AIProvider instance from the '${type}' template`, () => {
                const testKey = `test-api-key-for-${type}`;
                const provider = ProviderFactory.createFromTemplate(type, testKey);

                expect(provider).toBeInstanceOf(AIProvider);
                expect(provider.name).toBe(name);
                expect(provider.type).toBe(type);
                expect(provider.apiUrl).toContain(apiUrlContains);
                expect(provider.defaultModel).toBe(defaultModel);
                expect(provider.apiKey).toBe(testKey);
                expect(provider.models).toBeInstanceOf(Array);
                expect(provider.models.length).toBeGreaterThan(0);
            });
        });

        it('should create a default custom provider for an unknown template type', () => {
            const provider = ProviderFactory.createFromTemplate('unknown-template-123', 'some-key');

            expect(provider).toBeInstanceOf(AIProvider);
            expect(provider.type).toBe('custom');
            expect(provider.name).toBeUndefined();
            expect(provider.apiUrl).toBeUndefined();
            expect(provider.apiKey).toBe('some-key');
            expect(provider.models).toBeInstanceOf(Array);
            expect(provider.models.length).toBe(0);
        });

        it('should handle empty API key', () => {
            const provider = ProviderFactory.createFromTemplate('openai', '');

            expect(provider.apiKey).toBe('');
        });

        it('should handle null API key', () => {
            const provider = ProviderFactory.createFromTemplate('openai', null);

            expect(provider.apiKey).toBe('');
        });

        it('should handle undefined API key', () => {
            const provider = ProviderFactory.createFromTemplate('openai', undefined);

            expect(provider.apiKey).toBe('');
        });

        it('should handle case-sensitive template type', () => {
            const provider = ProviderFactory.createFromTemplate('OpenAI', 'key');

            // Should not match since template names are lowercase
            expect(provider.type).toBe('custom');
        });
    });

    // --- getTemplate Tests ---
    describe('getTemplate', () => {
        it('should return a provider object without an API key for getTemplate method', () => {
            const provider = ProviderFactory.getTemplate('openai');

            expect(provider).toBeInstanceOf(AIProvider);
            expect(provider.name).toBe('OpenAI');
            expect(provider.apiKey).toBe('');
        });

        it('should return a default custom provider for an unknown template using getTemplate', () => {
            const provider = ProviderFactory.getTemplate('nonexistent-template');

            expect(provider).toBeInstanceOf(AIProvider);
            expect(provider.type).toBe('custom');
            expect(provider.models.length).toBe(0);
            expect(provider.apiKey).toBe('');
        });

        it('should return anthropic template', () => {
            const provider = ProviderFactory.getTemplate('anthropic');

            expect(provider.name).toBe('Anthropic');
            expect(provider.type).toBe('anthropic');
            expect(provider.apiUrl).toContain('anthropic.com');
        });

        it('should return openrouter template', () => {
            const provider = ProviderFactory.getTemplate('openrouter');

            expect(provider.name).toBe('OpenRouter');
            expect(provider.type).toBe('openrouter');
            expect(provider.apiUrl).toContain('openrouter.ai');
        });

        it('should return groq template', () => {
            const provider = ProviderFactory.getTemplate('groq');

            expect(provider.name).toBe('Groq');
            expect(provider.type).toBe('groq');
            expect(provider.apiUrl).toContain('groq.com');
        });

        it('should return deepseek template', () => {
            const provider = ProviderFactory.getTemplate('deepseek');

            expect(provider.name).toBe('DeepSeek');
            expect(provider.type).toBe('deepseek');
            expect(provider.apiUrl).toContain('deepseek.com');
        });
    });

    // --- Template Model Lists ---
    describe('Template Model Lists', () => {
        it('should include multiple models for OpenAI template', () => {
            const provider = ProviderFactory.getTemplate('openai');

            expect(provider.models.length).toBeGreaterThanOrEqual(3);
            expect(provider.models.some(m => m.id === 'gpt-4o')).toBe(true);
            expect(provider.models.some(m => m.id === 'gpt-4o-mini')).toBe(true);
        });

        it('should include multiple models for Anthropic template', () => {
            const provider = ProviderFactory.getTemplate('anthropic');

            expect(provider.models.length).toBeGreaterThanOrEqual(2);
            expect(provider.models.some(m => m.id.includes('claude'))).toBe(true);
        });

        it('should include free models for OpenRouter template', () => {
            const provider = ProviderFactory.getTemplate('openrouter');

            expect(provider.models.length).toBeGreaterThanOrEqual(5);
            expect(provider.models.some(m => m.id.includes('llama'))).toBe(true);
        });

        it('should include models with descriptions', () => {
            const provider = ProviderFactory.getTemplate('openai');

            expect(provider.models[0]).toHaveProperty('description');
        });

        it('should include models for Groq template', () => {
            const provider = ProviderFactory.getTemplate('groq');

            expect(provider.models.length).toBeGreaterThanOrEqual(2);
        });

        it('should include models for DeepSeek template', () => {
            const provider = ProviderFactory.getTemplate('deepseek');

            expect(provider.models.length).toBeGreaterThanOrEqual(2);
            expect(provider.models.some(m => m.id === 'deepseek-chat')).toBe(true);
        });
    });

    // --- Edge Cases ---
    describe('Edge Cases', () => {
        it('should handle special characters in API key', () => {
            const specialKey = 'sk-key_with.special/chars+123=';
            const provider = ProviderFactory.createFromTemplate('openai', specialKey);

            expect(provider.apiKey).toBe(specialKey);
        });

        it('should create independent instances', () => {
            const provider1 = ProviderFactory.createFromTemplate('openai', 'key1');
            const provider2 = ProviderFactory.createFromTemplate('openai', 'key2');

            expect(provider1.id).not.toBe(provider2.id);
            expect(provider1.apiKey).not.toBe(provider2.apiKey);
        });

        it('should not share models array between instances', () => {
            const provider1 = ProviderFactory.createFromTemplate('openai', 'key1');
            const provider2 = ProviderFactory.createFromTemplate('openai', 'key2');

            // Modify one array
            provider1.models.push({ id: 'new-model', name: 'New' });

            // Other should not be affected
            expect(provider2.models.length).not.toBe(provider1.models.length);
        });

        it('should create provider with enabled true by default', () => {
            const provider = ProviderFactory.createFromTemplate('openai', 'key');

            expect(provider.enabled).toBe(true);
        });
    });

    // --- API URL Formats ---
    describe('API URL Formats', () => {
        it('should use chat/completions for OpenAI', () => {
            const provider = ProviderFactory.getTemplate('openai');
            expect(provider.apiUrl).toContain('/chat/completions');
        });

        it('should use /messages for Anthropic', () => {
            const provider = ProviderFactory.getTemplate('anthropic');
            expect(provider.apiUrl).toContain('/messages');
        });

        it('should use chat/completions for OpenRouter', () => {
            const provider = ProviderFactory.getTemplate('openrouter');
            expect(provider.apiUrl).toContain('/chat/completions');
        });

        it('should use chat/completions for Groq', () => {
            const provider = ProviderFactory.getTemplate('groq');
            expect(provider.apiUrl).toContain('/chat/completions');
        });

        it('should use chat/completions for DeepSeek', () => {
            const provider = ProviderFactory.getTemplate('deepseek');
            expect(provider.apiUrl).toContain('/chat/completions');
        });
    });
});
