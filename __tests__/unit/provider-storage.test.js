import { describe, it, expect, beforeEach } from 'vitest';
import { ProviderStorage } from '../../js/modules/provider-storage.js';
import { AIProvider } from '../../js/modules/ai-provider.js';

describe('ProviderStorage', () => {
    let storage;

    beforeEach(async () => {
        storage = new ProviderStorage();
        await storage.init();
    });

    describe('Initialization', () => {
        it('should initialize with correct database name and version', () => {
            expect(storage.dbName).toBe('AITeamManagerDB');
            expect(storage.version).toBe(2);
        });

        it('should initialize database successfully', async () => {
            expect(storage.db).toBeDefined();
            expect(storage.db.name).toBe('AITeamManagerDB');
        });

        it('should create providers object store', async () => {
            const storeNames = Array.from(storage.db.objectStoreNames);
            expect(storeNames).toContain('providers');
        });

        it('should create settings object store', async () => {
            const storeNames = Array.from(storage.db.objectStoreNames);
            expect(storeNames).toContain('settings');
        });

        it('should handle multiple init calls gracefully', async () => {
            const db1 = storage.db;
            await storage.init();
            const db2 = storage.db;
            expect(db1).toBe(db2);
        });
    });

    describe('Encryption', () => {
        it('should encrypt API keys before storage', async () => {
            const provider = new AIProvider({
                name: 'Test Provider',
                type: 'test',
                apiUrl: 'https://api.test.com',
                apiKey: 'secret-key-123',
                models: []
            });

            await storage.saveProvider(provider);

            const transaction = storage.db.transaction(['providers'], 'readonly');
            const store = transaction.objectStore('providers');
            const request = store.get(provider.id);

            const rawData = await new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });

            expect(rawData.apiKey).not.toBe('secret-key-123');
            expect(rawData.isEncrypted).toBe(true);
        });

        it('should decrypt API keys when retrieving', async () => {
            const provider = new AIProvider({
                name: 'Test Provider',
                type: 'test',
                apiUrl: 'https://api.test.com',
                apiKey: 'secret-key-123',
                models: []
            });

            await storage.saveProvider(provider);
            const retrieved = await storage.getProvider(provider.id);

            expect(retrieved.apiKey).toBe('secret-key-123');
        });

        it('should handle empty API keys', async () => {
            const provider = new AIProvider({
                name: 'Test Provider',
                type: 'test',
                apiUrl: 'https://api.test.com',
                apiKey: '',
                models: []
            });

            await storage.saveProvider(provider);
            const retrieved = await storage.getProvider(provider.id);

            expect(retrieved.apiKey).toBe('');
        });

        it('should handle decryption failures gracefully', async () => {
            const provider = new AIProvider({
                name: 'Test Provider',
                type: 'test',
                apiUrl: 'https://api.test.com',
                apiKey: 'test-key',
                models: []
            });

            await storage.saveProvider(provider);

            const transaction = storage.db.transaction(['providers'], 'readwrite');
            const store = transaction.objectStore('providers');
            const updateRequest = store.get(provider.id);

            await new Promise((resolve, reject) => {
                updateRequest.onsuccess = () => {
                    const data = updateRequest.result;
                    data.apiKey = 'corrupted!!!data';
                    const putRequest = store.put(data);
                    putRequest.onsuccess = () => resolve();
                    putRequest.onerror = () => reject(putRequest.error);
                };
                updateRequest.onerror = () => reject(updateRequest.error);
            });

            const retrieved = await storage.getProvider(provider.id);
            expect(retrieved.apiKey).toBe('');
        });
    });

    describe('saveProvider', () => {
        it('should save a new provider', async () => {
            const provider = new AIProvider({
                name: 'OpenAI',
                type: 'openai',
                apiUrl: 'https://api.openai.com/v1/chat/completions',
                apiKey: 'sk-test123',
                defaultModel: 'gpt-4',
                models: [
                    { id: 'gpt-4', name: 'GPT-4', description: 'Best model' }
                ]
            });

            const result = await storage.saveProvider(provider);
            expect(result).toBeDefined();

            const retrieved = await storage.getProvider(provider.id);
            expect(retrieved).toBeDefined();
            expect(retrieved.name).toBe('OpenAI');
            expect(retrieved.type).toBe('openai');
        });

        it('should update existing provider', async () => {
            const provider = new AIProvider({
                name: 'Test Provider',
                type: 'test',
                apiUrl: 'https://api.test.com',
                apiKey: 'key1',
                models: []
            });

            await storage.saveProvider(provider);

            provider.name = 'Updated Provider';
            provider.apiKey = 'key2';

            await storage.saveProvider(provider);

            const retrieved = await storage.getProvider(provider.id);
            expect(retrieved.name).toBe('Updated Provider');
            expect(retrieved.apiKey).toBe('key2');
        });

        it('should preserve enabled status', async () => {
            const provider = new AIProvider({
                name: 'Test Provider',
                type: 'test',
                apiUrl: 'https://api.test.com',
                enabled: false,
                models: []
            });

            await storage.saveProvider(provider);
            const retrieved = await storage.getProvider(provider.id);

            expect(retrieved.enabled).toBe(false);
        });

        it('should handle providers without models', async () => {
            const provider = new AIProvider({
                name: 'Test Provider',
                type: 'test',
                apiUrl: 'https://api.test.com',
                models: []
            });

            await storage.saveProvider(provider);
            const retrieved = await storage.getProvider(provider.id);

            expect(retrieved.models).toEqual([]);
        });

        it('should preserve all model properties', async () => {
            const provider = new AIProvider({
                name: 'Test Provider',
                type: 'test',
                apiUrl: 'https://api.test.com',
                models: [
                    {
                        id: 'model-1',
                        name: 'Model 1',
                        description: 'First model'
                    },
                    {
                        id: 'model-2',
                        name: 'Model 2',
                        description: 'Second model'
                    }
                ]
            });

            await storage.saveProvider(provider);
            const retrieved = await storage.getProvider(provider.id);

            expect(retrieved.models).toHaveLength(2);
            expect(retrieved.models[0].description).toBe('First model');
            expect(retrieved.models[1].description).toBe('Second model');
        });
    });

    describe('getProvider', () => {
        it('should return null for non-existent provider', async () => {
            const result = await storage.getProvider('non-existent-id');
            expect(result).toBeNull();
        });

        it('should return AIProvider instance', async () => {
            const provider = new AIProvider({
                name: 'Test',
                type: 'test',
                apiUrl: 'https://test.com',
                models: []
            });

            await storage.saveProvider(provider);
            const retrieved = await storage.getProvider(provider.id);

            expect(retrieved).toBeInstanceOf(AIProvider);
        });

        it('should decrypt API key on retrieval', async () => {
            const provider = new AIProvider({
                name: 'Test',
                type: 'test',
                apiUrl: 'https://test.com',
                apiKey: 'my-secret-key',
                models: []
            });

            await storage.saveProvider(provider);
            const retrieved = await storage.getProvider(provider.id);

            expect(retrieved.apiKey).toBe('my-secret-key');
        });
    });

    describe('getAllProviders', () => {
        it('should return empty array when no providers exist', async () => {
            const providers = await storage.getAllProviders();
            expect(providers).toEqual([]);
        });

        it('should return all providers', async () => {
            const provider1 = new AIProvider({
                name: 'Provider 1',
                type: 'test1',
                apiUrl: 'https://test1.com',
                models: []
            });

            const provider2 = new AIProvider({
                name: 'Provider 2',
                type: 'test2',
                apiUrl: 'https://test2.com',
                models: []
            });

            await storage.saveProvider(provider1);
            await storage.saveProvider(provider2);

            const providers = await storage.getAllProviders();

            expect(providers).toHaveLength(2);
            expect(providers.every(p => p instanceof AIProvider)).toBe(true);
        });

        it('should decrypt all API keys', async () => {
            const provider1 = new AIProvider({
                name: 'Provider 1',
                type: 'test1',
                apiUrl: 'https://test1.com',
                apiKey: 'key1',
                models: []
            });

            const provider2 = new AIProvider({
                name: 'Provider 2',
                type: 'test2',
                apiUrl: 'https://test2.com',
                apiKey: 'key2',
                models: []
            });

            await storage.saveProvider(provider1);
            await storage.saveProvider(provider2);

            const providers = await storage.getAllProviders();

            expect(providers[0].apiKey).toBe('key1');
            expect(providers[1].apiKey).toBe('key2');
        });

        it('should handle mixed encrypted and unencrypted providers', async () => {
            const provider1 = new AIProvider({
                name: 'Provider 1',
                type: 'test1',
                apiUrl: 'https://test1.com',
                apiKey: 'encrypted-key',
                models: []
            });

            await storage.saveProvider(provider1);

            const provider2Data = {
                id: 'manual-id',
                name: 'Provider 2',
                type: 'test2',
                apiUrl: 'https://test2.com',
                apiKey: 'plain-key',
                models: [],
                enabled: true
            };

            const transaction = storage.db.transaction(['providers'], 'readwrite');
            const store = transaction.objectStore('providers');
            await new Promise((resolve, reject) => {
                const request = store.put(provider2Data);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });

            const providers = await storage.getAllProviders();

            expect(providers).toHaveLength(2);
            expect(providers[0].apiKey).toBe('encrypted-key');
            expect(providers[1].apiKey).toBe('plain-key');
        });
    });

    describe('getEnabledProviders', () => {
        it('should return only enabled providers', async () => {
            const enabled1 = new AIProvider({
                name: 'Enabled 1',
                type: 'test',
                apiUrl: 'https://test.com',
                enabled: true,
                models: []
            });

            const disabled = new AIProvider({
                name: 'Disabled',
                type: 'test',
                apiUrl: 'https://test.com',
                enabled: false,
                models: []
            });

            const enabled2 = new AIProvider({
                name: 'Enabled 2',
                type: 'test',
                apiUrl: 'https://test.com',
                enabled: true,
                models: []
            });

            await storage.saveProvider(enabled1);
            await storage.saveProvider(disabled);
            await storage.saveProvider(enabled2);

            const enabledProviders = await storage.getEnabledProviders();

            expect(enabledProviders).toHaveLength(2);
            expect(enabledProviders.every(p => p.enabled)).toBe(true);
        });

        it('should return empty array if all providers disabled', async () => {
            const disabled1 = new AIProvider({
                name: 'Disabled 1',
                type: 'test',
                apiUrl: 'https://test.com',
                enabled: false,
                models: []
            });

            const disabled2 = new AIProvider({
                name: 'Disabled 2',
                type: 'test',
                apiUrl: 'https://test.com',
                enabled: false,
                models: []
            });

            await storage.saveProvider(disabled1);
            await storage.saveProvider(disabled2);

            const enabledProviders = await storage.getEnabledProviders();

            expect(enabledProviders).toEqual([]);
        });

        it('should return empty array if no providers exist', async () => {
            const enabledProviders = await storage.getEnabledProviders();
            expect(enabledProviders).toEqual([]);
        });
    });

    describe('deleteProvider', () => {
        it('should delete provider successfully', async () => {
            const provider = new AIProvider({
                name: 'Test Provider',
                type: 'test',
                apiUrl: 'https://test.com',
                models: []
            });

            await storage.saveProvider(provider);

            let retrieved = await storage.getProvider(provider.id);
            expect(retrieved).toBeDefined();

            await storage.deleteProvider(provider.id);

            retrieved = await storage.getProvider(provider.id);
            expect(retrieved).toBeNull();
        });

        it('should not throw error when deleting non-existent provider', async () => {
            await expect(storage.deleteProvider('non-existent-id')).resolves.toBeUndefined();
        });

        it('should only delete specified provider', async () => {
            const provider1 = new AIProvider({
                name: 'Provider 1',
                type: 'test',
                apiUrl: 'https://test.com',
                models: []
            });

            const provider2 = new AIProvider({
                name: 'Provider 2',
                type: 'test',
                apiUrl: 'https://test.com',
                models: []
            });

            await storage.saveProvider(provider1);
            await storage.saveProvider(provider2);

            await storage.deleteProvider(provider1.id);

            const remaining = await storage.getAllProviders();

            expect(remaining).toHaveLength(1);
            expect(remaining[0].id).toBe(provider2.id);
        });
    });

    describe('Active Provider Management', () => {
        it('should save active provider ID', async () => {
            const providerId = 'test-provider-id';
            await storage.saveActiveProvider(providerId);

            const activeId = await storage.getActiveProvider();
            expect(activeId).toBe(providerId);
        });

        it('should update active provider when changed', async () => {
            await storage.saveActiveProvider('provider-1');
            let activeId = await storage.getActiveProvider();
            expect(activeId).toBe('provider-1');

            await storage.saveActiveProvider('provider-2');
            activeId = await storage.getActiveProvider();
            expect(activeId).toBe('provider-2');
        });

        it('should return null when no active provider set', async () => {
            const activeId = await storage.getActiveProvider();
            expect(activeId).toBeNull();
        });

        it('should handle null as active provider', async () => {
            await storage.saveActiveProvider('provider-1');
            await storage.saveActiveProvider(null);

            const activeId = await storage.getActiveProvider();
            expect(activeId).toBeNull();
        });
    });

    describe('saveProviderDefaultModel', () => {
        it('should update provider default model', async () => {
            const provider = new AIProvider({
                name: 'Test Provider',
                type: 'test',
                apiUrl: 'https://test.com',
                defaultModel: 'model-1',
                models: [
                    { id: 'model-1', name: 'Model 1' },
                    { id: 'model-2', name: 'Model 2' }
                ]
            });

            await storage.saveProvider(provider);
            await storage.saveProviderDefaultModel(provider.id, 'model-2');

            const updated = await storage.getProvider(provider.id);
            expect(updated.defaultModel).toBe('model-2');
        });

        it('should do nothing if provider does not exist', async () => {
            await expect(
                storage.saveProviderDefaultModel('non-existent', 'model-1')
            ).resolves.toBeUndefined();
        });

        it('should preserve other provider properties', async () => {
            const provider = new AIProvider({
                name: 'Test Provider',
                type: 'test',
                apiUrl: 'https://test.com',
                apiKey: 'secret-key',
                defaultModel: 'model-1',
                enabled: true,
                models: [
                    { id: 'model-1', name: 'Model 1' },
                    { id: 'model-2', name: 'Model 2' }
                ]
            });

            await storage.saveProvider(provider);
            await storage.saveProviderDefaultModel(provider.id, 'model-2');

            const updated = await storage.getProvider(provider.id);
            expect(updated.name).toBe('Test Provider');
            expect(updated.apiKey).toBe('secret-key');
            expect(updated.enabled).toBe(true);
            expect(updated.models).toHaveLength(2);
        });
    });

    describe('initializeDefaultProviders', () => {
        it('should return empty array on fresh install', async () => {
            const providers = await storage.initializeDefaultProviders();
            expect(providers).toEqual([]);
        });

        it('should return existing providers if any exist', async () => {
            const provider = new AIProvider({
                name: 'Existing Provider',
                type: 'test',
                apiUrl: 'https://test.com',
                models: []
            });

            await storage.saveProvider(provider);

            const providers = await storage.initializeDefaultProviders();
            expect(providers).toHaveLength(1);
            expect(providers[0].name).toBe('Existing Provider');
        });

        it('should not create duplicate providers on multiple calls', async () => {
            await storage.initializeDefaultProviders();
            await storage.initializeDefaultProviders();
            await storage.initializeDefaultProviders();

            const providers = await storage.getAllProviders();
            expect(providers).toEqual([]);
        });
    });

    describe('Error Handling', () => {
        it('should handle database connection errors', async () => {
            const badStorage = new ProviderStorage();
            badStorage.dbName = '';

            await expect(badStorage.init()).rejects.toThrow();
        });

        it('should handle transaction errors gracefully', async () => {
            const provider = new AIProvider({
                name: 'Test',
                type: 'test',
                apiUrl: 'https://test.com',
                models: []
            });

            await storage.saveProvider(provider);
            storage.db.close();

            await expect(storage.getProvider(provider.id)).rejects.toThrow();
        });

        it('should handle corrupt data gracefully', async () => {
            const transaction = storage.db.transaction(['providers'], 'readwrite');
            const store = transaction.objectStore('providers');

            const corruptData = {
                id: 'corrupt-id',
                invalidField: 'this should not break things'
            };

            await new Promise((resolve, reject) => {
                const request = store.put(corruptData);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });

            const result = await storage.getProvider('corrupt-id');
            expect(result).toBeDefined();
        });
    });

    describe('ensureDB', () => {
        it('should return existing database if already initialized', async () => {
            const db1 = await storage.ensureDB();
            const db2 = await storage.ensureDB();

            expect(db1).toBe(db2);
            expect(db1).toBe(storage.db);
        });

        it('should initialize database if not already initialized', async () => {
            const newStorage = new ProviderStorage();
            expect(newStorage.db).toBeNull();

            const db = await newStorage.ensureDB();

            expect(db).toBeDefined();
            expect(newStorage.db).toBe(db);
        });
    });

    describe('Provider Data Sanitization', () => {
        it('should sanitize provider data on retrieval', async () => {
            const provider = new AIProvider({
                name: 'Test Provider',
                type: 'test',
                apiUrl: 'https://test.com',
                models: []
            });

            await storage.saveProvider(provider);
            const retrieved = await storage.getProvider(provider.id);

            expect(retrieved).toBeInstanceOf(AIProvider);
            expect(typeof retrieved.toJSON).toBe('function');
        });

        it('should handle null data gracefully', async () => {
            const result = storage._sanitizeData(null);
            expect(result).toBeNull();
        });

        it('should convert plain objects to AIProvider instances', async () => {
            const plainData = {
                id: 'test-id',
                name: 'Test',
                type: 'test',
                apiUrl: 'https://test.com',
                models: []
            };

            const sanitized = storage._sanitizeData(plainData);

            expect(sanitized).toBeInstanceOf(AIProvider);
            expect(sanitized.name).toBe('Test');
        });
    });

    describe('Concurrent Operations', () => {
        it('should handle multiple simultaneous saves', async () => {
            const providers = Array.from({ length: 10 }, (_, i) => new AIProvider({
                name: `Provider ${i}`,
                type: 'test',
                apiUrl: 'https://test.com',
                models: []
            }));

            await Promise.all(providers.map(p => storage.saveProvider(p)));

            const saved = await storage.getAllProviders();
            expect(saved).toHaveLength(10);
        });

        it('should handle simultaneous reads', async () => {
            const provider = new AIProvider({
                name: 'Test Provider',
                type: 'test',
                apiUrl: 'https://test.com',
                models: []
            });

            await storage.saveProvider(provider);

            const reads = await Promise.all(
                Array.from({ length: 10 }, () => storage.getProvider(provider.id))
            );

            expect(reads.every(p => p !== null)).toBe(true);
            expect(reads.every(p => p.name === 'Test Provider')).toBe(true);
        });

        it('should handle concurrent save and read operations', async () => {
            const provider = new AIProvider({
                name: 'Test Provider',
                type: 'test',
                apiUrl: 'https://test.com',
                models: []
            });

            const operations = [
                storage.saveProvider(provider),
                storage.getProvider(provider.id),
                storage.getAllProviders(),
                storage.getEnabledProviders()
            ];

            await expect(Promise.all(operations)).resolves.toBeDefined();
        });
    });

    describe('Edge Cases', () => {
        it('should handle providers with very long names', async () => {
            const longName = 'A'.repeat(1000);
            const provider = new AIProvider({
                name: longName,
                type: 'test',
                apiUrl: 'https://test.com',
                models: []
            });

            await storage.saveProvider(provider);
            const retrieved = await storage.getProvider(provider.id);

            expect(retrieved.name).toBe(longName);
        });

        it('should handle providers with special characters in name', async () => {
            const specialName = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`';
            const provider = new AIProvider({
                name: specialName,
                type: 'test',
                apiUrl: 'https://test.com',
                models: []
            });

            await storage.saveProvider(provider);
            const retrieved = await storage.getProvider(provider.id);

            expect(retrieved.name).toBe(specialName);
        });

        it('should handle providers with very long API keys', async () => {
            const longKey = 'k'.repeat(10000);
            const provider = new AIProvider({
                name: 'Test',
                type: 'test',
                apiUrl: 'https://test.com',
                apiKey: longKey,
                models: []
            });

            await storage.saveProvider(provider);
            const retrieved = await storage.getProvider(provider.id);

            expect(retrieved.apiKey).toBe(longKey);
        });

        it('should handle providers with large number of models', async () => {
            const models = Array.from({ length: 100 }, (_, i) => ({
                id: `model-${i}`,
                name: `Model ${i}`,
                description: `Description for model ${i}`
            }));

            const provider = new AIProvider({
                name: 'Test',
                type: 'test',
                apiUrl: 'https://test.com',
                models
            });

            await storage.saveProvider(provider);
            const retrieved = await storage.getProvider(provider.id);

            expect(retrieved.models).toHaveLength(100);
        });

        it('should handle Unicode characters in all fields', async () => {
            const provider = new AIProvider({
                name: '测试提供商 🚀',
                type: 'тест',
                apiUrl: 'https://test.com/🌐',
                apiKey: 'ключ-123-مفتاح',
                defaultModel: 'модель-1',
                models: [
                    {
                        id: 'モデル-1',
                        name: 'Modèle 1 🎯',
                        description: 'Описание модели'
                    }
                ]
            });

            await storage.saveProvider(provider);
            const retrieved = await storage.getProvider(provider.id);

            expect(retrieved.name).toBe('测试提供商 🚀');
            expect(retrieved.type).toBe('тест');
            expect(retrieved.apiKey).toBe('ключ-123-مفتاح');
            expect(retrieved.models[0].name).toBe('Modèle 1 🎯');
        });
    });
});
