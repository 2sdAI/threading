import { describe, it, expect, beforeEach } from 'vitest';
import { ProviderStorage } from '../../js/modules/provider-storage.js';
import { AIProvider } from '../../js/modules/ai-provider.js';
import { ProviderFactory } from '../../js/modules/provider-factory.js';

describe('ProviderStorage Integration Tests', () => {
    let storage;

    beforeEach(async () => {
        storage = new ProviderStorage();
        await storage.init();
    });

    describe('Integration with AIProvider', () => {
        it('should work seamlessly with AIProvider class', async () => {
            const provider = new AIProvider({
                name: 'OpenAI',
                type: 'openai',
                apiUrl: 'https://api.openai.com/v1/chat/completions',
                apiKey: 'sk-test123',
                defaultModel: 'gpt-4',
                models: [
                    { id: 'gpt-4', name: 'GPT-4', description: 'Most capable' },
                    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and cheap' }
                ],
                enabled: true
            });

            await storage.saveProvider(provider);
            const retrieved = await storage.getProvider(provider.id);

            expect(retrieved).toBeInstanceOf(AIProvider);
            expect(retrieved.id).toBe(provider.id);
            expect(retrieved.name).toBe(provider.name);
            expect(retrieved.type).toBe(provider.type);
            expect(retrieved.apiUrl).toBe(provider.apiUrl);
            expect(retrieved.apiKey).toBe(provider.apiKey);
            expect(retrieved.defaultModel).toBe(provider.defaultModel);
            expect(retrieved.models).toEqual(provider.models);
            expect(retrieved.enabled).toBe(provider.enabled);
        });

        it('should preserve AIProvider methods after retrieval', async () => {
            const provider = new AIProvider({
                name: 'Test Provider',
                type: 'test',
                apiUrl: 'https://test.com',
                models: []
            });

            await storage.saveProvider(provider);
            const retrieved = await storage.getProvider(provider.id);

            expect(typeof retrieved.toJSON).toBe('function');
            expect(typeof retrieved._getHeaders).toBe('function');

            const json = retrieved.toJSON();
            expect(json).toHaveProperty('id');
            expect(json).toHaveProperty('name');
            expect(json).toHaveProperty('type');
        });

        it('should handle all AIProvider properties correctly', async () => {
            const provider = new AIProvider({
                name: 'Complete Provider',
                type: 'custom',
                apiUrl: 'https://api.example.com/v1/chat',
                apiKey: 'test-key-12345',
                defaultModel: 'model-v2',
                models: [
                    {
                        id: 'model-v1',
                        name: 'Model Version 1',
                        description: 'First version'
                    },
                    {
                        id: 'model-v2',
                        name: 'Model Version 2',
                        description: 'Second version'
                    }
                ],
                enabled: true
            });

            await storage.saveProvider(provider);
            const retrieved = await storage.getProvider(provider.id);

            const originalJson = provider.toJSON();
            const retrievedJson = retrieved.toJSON();

            expect(retrievedJson.name).toBe(originalJson.name);
            expect(retrievedJson.type).toBe(originalJson.type);
            expect(retrievedJson.apiUrl).toBe(originalJson.apiUrl);
            expect(retrievedJson.apiKey).toBe(originalJson.apiKey);
            expect(retrievedJson.defaultModel).toBe(originalJson.defaultModel);
            expect(retrievedJson.enabled).toBe(originalJson.enabled);
            expect(retrievedJson.models).toEqual(originalJson.models);
        });
    });

    describe('Integration with ProviderFactory', () => {
        it('should save and retrieve factory-created OpenAI provider', async () => {
            const provider = ProviderFactory.createFromTemplate('openai', 'sk-test-key');

            await storage.saveProvider(provider);
            const retrieved = await storage.getProvider(provider.id);

            expect(retrieved.name).toBe('OpenAI');
            expect(retrieved.type).toBe('openai');
            expect(retrieved.apiKey).toBe('sk-test-key');
            expect(retrieved.models.length).toBeGreaterThan(0);
        });

        it('should save and retrieve factory-created Anthropic provider', async () => {
            const provider = ProviderFactory.createFromTemplate('anthropic', 'test-api-key');

            await storage.saveProvider(provider);
            const retrieved = await storage.getProvider(provider.id);

            expect(retrieved.name).toBe('Anthropic');
            expect(retrieved.type).toBe('anthropic');
            expect(retrieved.apiKey).toBe('test-api-key');
        });

        it('should save and retrieve factory-created OpenRouter provider', async () => {
            const provider = ProviderFactory.createFromTemplate('openrouter', 'or-key-123');

            await storage.saveProvider(provider);
            const retrieved = await storage.getProvider(provider.id);

            expect(retrieved.name).toBe('OpenRouter');
            expect(retrieved.type).toBe('openrouter');
            expect(retrieved.apiKey).toBe('or-key-123');
            expect(retrieved.models.length).toBeGreaterThan(10);
        });

        it('should save and retrieve factory-created Groq provider', async () => {
            const provider = ProviderFactory.createFromTemplate('groq', 'groq-key');

            await storage.saveProvider(provider);
            const retrieved = await storage.getProvider(provider.id);

            expect(retrieved.name).toBe('Groq');
            expect(retrieved.type).toBe('groq');
        });

        it('should save and retrieve factory-created DeepSeek provider', async () => {
            const provider = ProviderFactory.createFromTemplate('deepseek', 'ds-key');

            await storage.saveProvider(provider);
            const retrieved = await storage.getProvider(provider.id);

            expect(retrieved.name).toBe('DeepSeek');
            expect(retrieved.type).toBe('deepseek');
        });

        it('should save and retrieve custom factory-created provider', async () => {
            const customConfig = {
                name: 'My Custom Provider',
                type: 'custom',
                apiUrl: 'https://custom.ai/v1/chat',
                apiKey: 'custom-key',
                defaultModel: 'custom-model',
                models: [
                    { id: 'custom-model', name: 'Custom Model' }
                ]
            };

            const provider = ProviderFactory.createCustom(customConfig);

            await storage.saveProvider(provider);
            const retrieved = await storage.getProvider(provider.id);

            expect(retrieved.name).toBe('My Custom Provider');
            expect(retrieved.apiKey).toBe('custom-key');
        });

        it('should preserve all OpenRouter models', async () => {
            const provider = ProviderFactory.createFromTemplate('openrouter', 'key');

            await storage.saveProvider(provider);
            const retrieved = await storage.getProvider(provider.id);

            const freeModels = retrieved.models.filter(m =>
                m.description && m.description.includes('Free')
            );

            expect(freeModels.length).toBeGreaterThan(0);
            expect(retrieved.models.some(m => m.id.includes('llama'))).toBe(true);
            expect(retrieved.models.some(m => m.id.includes('gemini'))).toBe(true);
        });

        it('should handle factory templates without API keys', async () => {
            const provider = ProviderFactory.createFromTemplate('openai', '');

            await storage.saveProvider(provider);
            const retrieved = await storage.getProvider(provider.id);

            expect(retrieved.apiKey).toBe('');
            expect(retrieved.name).toBe('OpenAI');
        });

        it('should get template and save it', async () => {
            const template = ProviderFactory.getTemplate('anthropic');
            template.apiKey = 'my-anthropic-key';

            await storage.saveProvider(template);
            const retrieved = await storage.getProvider(template.id);

            expect(retrieved.name).toBe('Anthropic');
            expect(retrieved.apiKey).toBe('my-anthropic-key');
            expect(retrieved.models.length).toBeGreaterThan(0);
        });
    });

    describe('Multi-Provider Workflow', () => {
        it('should handle complete provider lifecycle', async () => {
            const openai = ProviderFactory.createFromTemplate('openai', 'sk-openai');
            const claude = ProviderFactory.createFromTemplate('anthropic', 'sk-claude');
            const groq = ProviderFactory.createFromTemplate('groq', 'gsk-groq');

            await storage.saveProvider(openai);
            await storage.saveProvider(claude);
            await storage.saveProvider(groq);

            let allProviders = await storage.getAllProviders();
            expect(allProviders).toHaveLength(3);

            await storage.setActiveProvider(claude.id);
            const activeId = await storage.getActiveProvider();
            expect(activeId).toBe(claude.id);

            groq.enabled = false;
            await storage.saveProvider(groq);

            const enabledProviders = await storage.getEnabledProviders();
            expect(enabledProviders).toHaveLength(2);

            await storage.deleteProvider(openai.id);

            allProviders = await storage.getAllProviders();
            expect(allProviders).toHaveLength(2);
        });

        it('should handle provider switching scenario', async () => {
            const providers = [
                ProviderFactory.createFromTemplate('openai', 'key1'),
                ProviderFactory.createFromTemplate('anthropic', 'key2'),
                ProviderFactory.createFromTemplate('groq', 'key3')
            ];

            for (const provider of providers) {
                await storage.saveProvider(provider);
            }

            await storage.setActiveProvider(providers[0].id);
            expect(await storage.getActiveProvider()).toBe(providers[0].id);

            await storage.setActiveProvider(providers[1].id);
            expect(await storage.getActiveProvider()).toBe(providers[1].id);

            await storage.setActiveProvider(providers[2].id);
            expect(await storage.getActiveProvider()).toBe(providers[2].id);

            const retrieved = await storage.getProvider(providers[2].id);
            expect(retrieved.name).toBe('Groq');
        });

        it('should handle provider model update scenario', async () => {
            const provider = ProviderFactory.createFromTemplate('openai', 'key');

            await storage.saveProvider(provider);

            const originalDefaultModel = provider.defaultModel;
            expect(originalDefaultModel).toBe('gpt-4o');

            await storage.saveProviderDefaultModel(provider.id, 'gpt-3.5-turbo');

            const updated = await storage.getProvider(provider.id);
            expect(updated.defaultModel).toBe('gpt-3.5-turbo');

            await storage.saveProviderDefaultModel(provider.id, 'gpt-4o-mini');

            const updated2 = await storage.getProvider(provider.id);
            expect(updated2.defaultModel).toBe('gpt-4o-mini');
        });
    });

    describe('Provider Configuration Scenarios', () => {
        it('should handle provider with all features enabled', async () => {
            const provider = new AIProvider({
                name: 'Full Feature Provider',
                type: 'custom',
                apiUrl: 'https://api.full.com/v1/chat',
                apiKey: 'full-key-123',
                defaultModel: 'full-model',
                models: [
                    { id: 'full-model', name: 'Full Model', description: 'Complete' },
                    { id: 'lite-model', name: 'Lite Model', description: 'Lightweight' }
                ],
                enabled: true
            });

            await storage.saveProvider(provider);
            await storage.setActiveProvider(provider.id);

            const retrieved = await storage.getProvider(provider.id);
            const activeId = await storage.getActiveProvider();

            expect(retrieved.enabled).toBe(true);
            expect(activeId).toBe(provider.id);
            expect(retrieved.models).toHaveLength(2);
        });

        it('should handle provider migration from one type to another', async () => {
            const provider = new AIProvider({
                name: 'Migrating Provider',
                type: 'old-type',
                apiUrl: 'https://old.api.com',
                apiKey: 'old-key',
                models: []
            });

            await storage.saveProvider(provider);

            provider.type = 'new-type';
            provider.apiUrl = 'https://new.api.com';
            provider.apiKey = 'new-key';

            await storage.saveProvider(provider);

            const updated = await storage.getProvider(provider.id);
            expect(updated.type).toBe('new-type');
            expect(updated.apiUrl).toBe('https://new.api.com');
            expect(updated.apiKey).toBe('new-key');
        });

        it('should handle provider with dynamic model list updates', async () => {
            const provider = new AIProvider({
                name: 'Dynamic Provider',
                type: 'dynamic',
                apiUrl: 'https://dynamic.api.com',
                models: [
                    { id: 'model-1', name: 'Model 1' }
                ]
            });

            await storage.saveProvider(provider);

            provider.models.push({ id: 'model-2', name: 'Model 2' });
            await storage.saveProvider(provider);

            let retrieved = await storage.getProvider(provider.id);
            expect(retrieved.models).toHaveLength(2);

            provider.models = provider.models.concat([
                { id: 'model-3', name: 'Model 3' },
                { id: 'model-4', name: 'Model 4' }
            ]);
            await storage.saveProvider(provider);

            retrieved = await storage.getProvider(provider.id);
            expect(retrieved.models).toHaveLength(4);
        });
    });

    describe('Error Recovery Scenarios', () => {
        it('should recover from partial save failures', async () => {
            const provider1 = new AIProvider({
                name: 'Provider 1',
                type: 'test',
                apiUrl: 'https://test1.com',
                models: []
            });

            const provider2 = new AIProvider({
                name: 'Provider 2',
                type: 'test',
                apiUrl: 'https://test2.com',
                models: []
            });

            await storage.saveProvider(provider1);

            try {
                const badProvider = new AIProvider({
                    name: 'Bad Provider',
                    type: 'test',
                    apiUrl: 'https://bad.com',
                    models: []
                });
                await storage.saveProvider(badProvider);
            } catch (_error) {
                // Ignore potential errors
                console.warn(_error);
            }

            await storage.saveProvider(provider2);

            const allProviders = await storage.getAllProviders();
            expect(allProviders.length).toBeGreaterThanOrEqual(2);
        });

        it('should handle active provider deletion gracefully', async () => {
            const provider1 = new AIProvider({
                name: 'Provider 1',
                type: 'test',
                apiUrl: 'https://test1.com',
                models: []
            });

            const provider2 = new AIProvider({
                name: 'Provider 2',
                type: 'test',
                apiUrl: 'https://test2.com',
                models: []
            });

            await storage.saveProvider(provider1);
            await storage.saveProvider(provider2);

            await storage.setActiveProvider(provider1.id);

            const activeId = await storage.getActiveProvider();
            expect(activeId).toBe(provider1.id);

            await storage.deleteProvider(provider1.id);

            const retrieved = await storage.getProvider(provider1.id);
            expect(retrieved).toBeNull();

            const stillActive = await storage.getActiveProvider();
            expect(stillActive).toBe(provider1.id);
        });
    });

    describe('Real-World Provider Setup Scenarios', () => {
        it('should setup multiple providers for production use', async () => {
            const openai = ProviderFactory.createFromTemplate('openai', process.env.OPENAI_KEY || 'sk-test');
            const anthropic = ProviderFactory.createFromTemplate('anthropic', process.env.ANTHROPIC_KEY || 'sk-ant-test');
            const openrouter = ProviderFactory.createFromTemplate('openrouter', process.env.OPENROUTER_KEY || 'sk-or-test');

            await storage.saveProvider(openai);
            await storage.saveProvider(anthropic);
            await storage.saveProvider(openrouter);

            await storage.setActiveProvider(openai.id);

            const allProviders = await storage.getAllProviders();
            expect(allProviders).toHaveLength(3);

            const enabledProviders = await storage.getEnabledProviders();
            expect(enabledProviders).toHaveLength(3);

            const activeId = await storage.getActiveProvider();
            expect(activeId).toBe(openai.id);

            const activeProvider = await storage.getProvider(activeId);
            expect(activeProvider.name).toBe('OpenAI');
            expect(activeProvider.apiKey).toBeTruthy();
        });

        it('should handle provider configuration updates', async () => {
            const provider = ProviderFactory.createFromTemplate('groq', 'initial-key');

            await storage.saveProvider(provider);

            provider.apiKey = 'updated-key';
            provider.enabled = false;

            await storage.saveProvider(provider);

            const retrieved = await storage.getProvider(provider.id);
            expect(retrieved.apiKey).toBe('updated-key');
            expect(retrieved.enabled).toBe(false);

            const enabledProviders = await storage.getEnabledProviders();
            expect(enabledProviders.some(p => p.id === provider.id)).toBe(false);
        });
    });
});
