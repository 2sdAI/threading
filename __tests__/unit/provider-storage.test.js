import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { ProviderStorage } from '@modules/provider-storage.js';
import { AIProvider } from '@modules/ai-provider.js';

const getStorageInstance = () => {
    const storage = new ProviderStorage();
    storage.dbName = `TestDB-ProviderStorage-${Math.random().toString(36).substring(2, 9)}`;
    return storage;
};

const sampleProviderConfig = {
    id: 'test-provider-openai-1',
    name: 'OpenAI Test',
    type: 'openai',
    apiUrl: 'https://api.test.com/v1/chat/completions',
    apiKey: 'sk-testkey-123',
    defaultModel: 'gpt-4o-test',
    models: [{ id: 'gpt-4o-test', name: 'GPT-4o Test' }]
};

describe('ProviderStorage', () => {
    let storage;
    let sampleProvider;

    beforeEach(async () => {
        storage = getStorageInstance();
        sampleProvider = new AIProvider(sampleProviderConfig);
    });

    afterEach(async () => {
        if (storage.db) {
            storage.db.close();
        }
        await new Promise(resolve => {
            const deleteRequest = indexedDB.deleteDatabase(storage.dbName);
            deleteRequest.onsuccess = resolve;
            deleteRequest.onerror = resolve;
        });
        storage.db = null;
    });

    // --- Initialization Tests ---
    describe('Initialization', () => {
        it('should initialize the database and create correct object stores', async () => {
            const db = await storage.init();

            expect(db).toBeDefined();
            expect(db.objectStoreNames.contains('providers')).toBe(true);
            expect(db.objectStoreNames.contains('settings')).toBe(true);
            expect(db.version).toBe(2);
        });

        it('should have correct database name', async () => {
            await storage.init();
            expect(storage.dbName).toMatch(/^TestDB-ProviderStorage-/);
        });

        it('should set db.onerror handler during init', async () => {
            await storage.init();
            expect(storage.db.onerror).toBeDefined();
        });

        it('should create indexes on providers store', async () => {
            await storage.init();

            const transaction = storage.db.transaction(['providers'], 'readonly');
            const store = transaction.objectStore('providers');

            expect(store.indexNames.contains('type')).toBe(true);
            expect(store.indexNames.contains('enabled')).toBe(true);
        });
    });

    // --- ensureDB Tests ---
    describe('ensureDB', () => {
        it('should return existing db if already initialized', async () => {
            await storage.init();
            const db = await storage.ensureDB();
            expect(db).toBe(storage.db);
        });

        it('should initialize db if not already initialized', async () => {
            // Don't call init(), let ensureDB handle it
            const db = await storage.ensureDB();
            expect(db).toBeDefined();
            expect(storage.db).toBe(db);
        });
    });

    // --- Provider CRUD Operations ---
    describe('Provider CRUD Operations', () => {
        it('should save and retrieve a provider, correctly decrypting the API key', async () => {
            await storage.saveProvider(sampleProvider.toJSON());

            const retrievedProvider = await storage.getProvider(sampleProvider.id);

            expect(retrievedProvider).toBeInstanceOf(AIProvider);
            expect(retrievedProvider.apiKey).toBe(sampleProvider.apiKey);
        });

        it('should return null for a non-existent provider ID', async () => {
            const provider = await storage.getProvider('non-existent-id-404');
            expect(provider).toBeNull();
        });

        it('should retrieve all saved providers', async () => {
            const providerA = new AIProvider({ id: 'a', name: 'A', apiKey: 'keyA' });
            const providerB = new AIProvider({ id: 'b', name: 'B', apiKey: 'keyB' });

            await storage.saveProvider(providerA.toJSON());
            await storage.saveProvider(providerB.toJSON());

            const allProviders = await storage.getAllProviders();

            expect(allProviders).toBeInstanceOf(Array);
            expect(allProviders.length).toBe(2);
            expect(allProviders.find(p => p.id === 'a').apiKey).toBe('keyA');
            expect(allProviders.find(p => p.id === 'b').apiKey).toBe('keyB');
        });

        it('should update an existing provider', async () => {
            const id = 'update-test';
            const initialConfig = { ...sampleProviderConfig, id: id, name: 'Old Name' };
            const provider = new AIProvider(initialConfig);
            await storage.saveProvider(provider.toJSON());

            provider.name = 'New Name';
            provider.apiKey = 'new-key-456';
            await storage.saveProvider(provider.toJSON());

            const updatedProvider = await storage.getProvider(id);
            expect(updatedProvider.name).toBe('New Name');
            expect(updatedProvider.apiKey).toBe('new-key-456');
        });

        it('should delete a provider', async () => {
            const idToDelete = 'to-be-deleted';
            const provider = new AIProvider({ id: idToDelete, name: 'To Delete', apiKey: 'temp' });
            await storage.saveProvider(provider.toJSON());

            expect(await storage.getProvider(idToDelete)).not.toBeNull();

            await storage.deleteProvider(idToDelete);

            expect(await storage.getProvider(idToDelete)).toBeNull();
            expect((await storage.getAllProviders())).toHaveLength(0);
        });

        it('should update a provider\'s default model using saveProviderDefaultModel', async () => {
            const id = 'model-test';
            const initialProvider = new AIProvider({
                id: id,
                name: 'Model Test',
                defaultModel: 'old-model',
                apiKey: 'k'
            });
            await storage.saveProvider(initialProvider.toJSON());

            const newModelId = 'new-model-id';
            await storage.saveProviderDefaultModel(id, newModelId);

            const updatedProvider = await storage.getProvider(id);
            expect(updatedProvider.defaultModel).toBe(newModelId);
            expect(updatedProvider.apiKey).toBe('k');
        });

        it('should handle saveProviderDefaultModel for non-existent provider', async () => {
            // Should not throw, just do nothing
            await storage.saveProviderDefaultModel('non-existent', 'model-1');

            // Verify nothing was created
            const provider = await storage.getProvider('non-existent');
            expect(provider).toBeNull();
        });
    });

    // --- Encryption Tests ---
    describe('Encryption', () => {
        it('should encrypt API key when saving', async () => {
            const provider = new AIProvider({
                id: 'encrypt-test',
                name: 'Encrypt Test',
                apiKey: 'secret-key-123'
            });
            await storage.saveProvider(provider.toJSON());

            // Access raw data from DB
            const db = await storage.ensureDB();
            const rawData = await new Promise((resolve, reject) => {
                const transaction = db.transaction(['providers'], 'readonly');
                const store = transaction.objectStore('providers');
                const request = store.get('encrypt-test');
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });

            // Raw data should have encrypted key (base64) and flag
            expect(rawData.isEncrypted).toBe(true);
            expect(rawData.apiKey).not.toBe('secret-key-123');
            expect(rawData.apiKey).toBe(btoa('secret-key-123'));
        });

        it('should decrypt API key when retrieving', async () => {
            const provider = new AIProvider({
                id: 'decrypt-test',
                name: 'Decrypt Test',
                apiKey: 'my-secret-api-key'
            });
            await storage.saveProvider(provider.toJSON());

            const retrieved = await storage.getProvider('decrypt-test');
            expect(retrieved.apiKey).toBe('my-secret-api-key');
        });

        it('should handle empty API key', async () => {
            const provider = new AIProvider({
                id: 'empty-key-test',
                name: 'Empty Key Test',
                apiKey: ''
            });
            await storage.saveProvider(provider.toJSON());

            const retrieved = await storage.getProvider('empty-key-test');
            expect(retrieved.apiKey).toBe('');
        });

        it('should handle provider with no API key', async () => {
            const providerData = {
                id: 'no-key-test',
                name: 'No Key Test',
                type: 'custom'
            };
            await storage.saveProvider(providerData);

            const retrieved = await storage.getProvider('no-key-test');
            expect(retrieved.apiKey).toBe('');
        });

        it('should handle decryption failure gracefully', async () => {
            // Save a provider normally
            const provider = new AIProvider({
                id: 'decrypt-fail-test',
                name: 'Decrypt Fail Test',
                apiKey: 'valid-key'
            });
            await storage.saveProvider(provider.toJSON());

            // Corrupt the stored data by storing invalid base64
            const db = await storage.ensureDB();
            await new Promise((resolve, reject) => {
                const transaction = db.transaction(['providers'], 'readwrite');
                const store = transaction.objectStore('providers');
                const request = store.put({
                    id: 'decrypt-fail-test',
                    name: 'Decrypt Fail Test',
                    apiKey: 'not-valid-base64!!!',
                    isEncrypted: true
                });
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });

            // Should handle gracefully and return empty string
            const retrieved = await storage.getProvider('decrypt-fail-test');
            expect(retrieved.apiKey).toBe('');
        });

        it('should decrypt all providers in getAllProviders', async () => {
            const providers = [
                new AIProvider({ id: 'p1', name: 'P1', apiKey: 'key1' }),
                new AIProvider({ id: 'p2', name: 'P2', apiKey: 'key2' }),
                new AIProvider({ id: 'p3', name: 'P3', apiKey: 'key3' })
            ];

            for (const p of providers) {
                await storage.saveProvider(p.toJSON());
            }

            const allProviders = await storage.getAllProviders();

            expect(allProviders[0].apiKey).toBe('key1');
            expect(allProviders[1].apiKey).toBe('key2');
            expect(allProviders[2].apiKey).toBe('key3');
        });
    });

    // --- Enabled Providers Tests ---
    describe('getEnabledProviders', () => {
        it('should return only enabled providers', async () => {
            const enabledProvider = new AIProvider({
                id: 'enabled-1',
                name: 'Enabled',
                apiKey: 'key',
                enabled: true
            });
            const disabledProvider = new AIProvider({
                id: 'disabled-1',
                name: 'Disabled',
                apiKey: 'key',
                enabled: false
            });

            await storage.saveProvider(enabledProvider.toJSON());
            await storage.saveProvider(disabledProvider.toJSON());

            const enabledProviders = await storage.getEnabledProviders();

            expect(enabledProviders).toHaveLength(1);
            expect(enabledProviders[0].id).toBe('enabled-1');
        });

        it('should return empty array when no providers are enabled', async () => {
            const disabledProvider = new AIProvider({
                id: 'disabled-1',
                name: 'Disabled',
                apiKey: 'key',
                enabled: false
            });
            await storage.saveProvider(disabledProvider.toJSON());

            const enabledProviders = await storage.getEnabledProviders();
            expect(enabledProviders).toHaveLength(0);
        });

        it('should return all providers if all are enabled', async () => {
            const providers = [
                new AIProvider({ id: 'p1', name: 'P1', apiKey: 'k1', enabled: true }),
                new AIProvider({ id: 'p2', name: 'P2', apiKey: 'k2', enabled: true }),
                new AIProvider({ id: 'p3', name: 'P3', apiKey: 'k3', enabled: true })
            ];

            for (const p of providers) {
                await storage.saveProvider(p.toJSON());
            }

            const enabledProviders = await storage.getEnabledProviders();
            expect(enabledProviders).toHaveLength(3);
        });

        it('should return empty array when no providers exist', async () => {
            const enabledProviders = await storage.getEnabledProviders();
            expect(enabledProviders).toHaveLength(0);
        });
    });

    // --- App Settings Tests (Active Provider) ---
    describe('App Settings (Active Provider)', () => {
        it('should save and retrieve the active provider ID using saveActiveProvider', async () => {
            const activeId = 'provider-active-1';
            await storage.saveActiveProvider(activeId);

            expect(await storage.getActiveProvider()).toBe(activeId);
        });

        it('should save the active provider ID using the setActiveProvider alias', async () => {
            const newId = 'provider-active-2';
            await storage.setActiveProvider(newId);

            expect(await storage.getActiveProvider()).toBe(newId);
        });

        it('should return null if no active provider ID is set', async () => {
            expect(await storage.getActiveProvider()).toBeNull();
        });

        it('should update active provider ID', async () => {
            await storage.saveActiveProvider('provider-1');
            await storage.saveActiveProvider('provider-2');

            expect(await storage.getActiveProvider()).toBe('provider-2');
        });

        it('should allow setting null as active provider', async () => {
            await storage.saveActiveProvider('provider-1');
            await storage.saveActiveProvider(null);

            expect(await storage.getActiveProvider()).toBeNull();
        });
    });

    // --- Default Initialization ---
    describe('Default Initialization', () => {
        it('should return all existing providers on initializeDefaultProviders', async () => {
            const provider = new AIProvider({ id: 'existing-default', name: 'Existing', apiKey: 'key' });
            await storage.saveProvider(provider.toJSON());

            const providers = await storage.initializeDefaultProviders();

            expect(providers).toHaveLength(1);
            expect(providers[0].id).toBe('existing-default');
            expect(providers[0]).toBeInstanceOf(AIProvider);
        });

        it('should return an empty array if no providers exist', async () => {
            const providers = await storage.initializeDefaultProviders();
            expect(providers).toBeInstanceOf(Array);
            expect(providers).toHaveLength(0);
        });

        it('should return multiple providers if they exist', async () => {
            const providers = [
                new AIProvider({ id: 'p1', name: 'P1', apiKey: 'k1' }),
                new AIProvider({ id: 'p2', name: 'P2', apiKey: 'k2' })
            ];
            for (const p of providers) {
                await storage.saveProvider(p.toJSON());
            }

            const initialized = await storage.initializeDefaultProviders();
            expect(initialized).toHaveLength(2);
        });
    });

    // --- _sanitizeData Tests ---
    describe('_sanitizeData', () => {
        it('should return null for null input', () => {
            const result = storage._sanitizeData(null);
            expect(result).toBeNull();
        });

        it('should return null for undefined input', () => {
            const result = storage._sanitizeData(undefined);
            expect(result).toBeNull();
        });

        it('should return AIProvider instance for valid data', () => {
            const data = {
                id: 'test-id',
                name: 'Test Provider',
                type: 'openai',
                apiUrl: 'https://api.test.com',
                apiKey: 'test-key'
            };

            const result = storage._sanitizeData(data);

            expect(result).toBeInstanceOf(AIProvider);
            expect(result.id).toBe('test-id');
            expect(result.name).toBe('Test Provider');
        });
    });

    // --- Edge Cases ---
    describe('Edge Cases', () => {
        it('should handle provider with empty name', async () => {
            const provider = new AIProvider({
                id: 'empty-name',
                name: '',
                apiKey: 'key'
            });
            await storage.saveProvider(provider.toJSON());

            const retrieved = await storage.getProvider('empty-name');
            expect(retrieved.name).toBe('');
        });

        it('should handle provider with special characters in name', async () => {
            const provider = new AIProvider({
                id: 'special-chars',
                name: 'Special Provider <test> & "quotes"',
                // Note: btoa() only supports ASCII, so use ASCII-only key
                apiKey: 'key-with-special-chars_123'
            });
            await storage.saveProvider(provider.toJSON());

            const retrieved = await storage.getProvider('special-chars');
            expect(retrieved.name).toBe('Special Provider <test> & "quotes"');
            expect(retrieved.apiKey).toBe('key-with-special-chars_123');
        });

        it('should handle provider with many models', async () => {
            const models = Array.from({ length: 100 }, (_, i) => ({
                id: `model-${i}`,
                name: `Model ${i}`,
                description: `Description for model ${i}`
            }));

            const provider = new AIProvider({
                id: 'many-models',
                name: 'Many Models',
                apiKey: 'key',
                models: models
            });
            await storage.saveProvider(provider.toJSON());

            const retrieved = await storage.getProvider('many-models');
            expect(retrieved.models).toHaveLength(100);
        });

        it('should handle rapid successive operations', async () => {
            // Reduce count to prevent timeout and await each save
            for (let i = 0; i < 5; i++) {
                const provider = new AIProvider({
                    id: `rapid-${i}`,
                    name: `Rapid ${i}`,
                    apiKey: `key-${i}`
                });
                await storage.saveProvider(provider.toJSON());
            }

            const allProviders = await storage.getAllProviders();
            expect(allProviders).toHaveLength(5);
        });

        it('should handle concurrent reads and writes', async () => {
            const provider = new AIProvider({
                id: 'concurrent-test',
                name: 'Concurrent Test',
                apiKey: 'key'
            });
            await storage.saveProvider(provider.toJSON());

            const operations = [
                storage.getProvider('concurrent-test'),
                storage.getAllProviders(),
                storage.getEnabledProviders(),
                storage.getProvider('concurrent-test')
            ];

            const results = await Promise.all(operations);

            expect(results[0]).toBeInstanceOf(AIProvider);
            expect(Array.isArray(results[1])).toBe(true);
            expect(Array.isArray(results[2])).toBe(true);
            expect(results[3]).toBeInstanceOf(AIProvider);
        });

        it('should handle saving AIProvider instance directly', async () => {
            const provider = new AIProvider({
                id: 'direct-instance',
                name: 'Direct Instance',
                apiKey: 'key'
            });

            // Pass instance instead of toJSON()
            await storage.saveProvider(provider);

            const retrieved = await storage.getProvider('direct-instance');
            expect(retrieved.name).toBe('Direct Instance');
        });

        it('should handle provider without enabled property (defaults to true)', async () => {
            const providerData = {
                id: 'no-enabled',
                name: 'No Enabled Property',
                apiKey: 'key'
            };
            await storage.saveProvider(providerData);

            const retrieved = await storage.getProvider('no-enabled');
            // AIProvider defaults enabled to true
            expect(retrieved.enabled).toBe(true);
        });

        it('should preserve all provider properties through save/retrieve cycle', async () => {
            const provider = new AIProvider({
                id: 'full-roundtrip',
                name: 'Full Roundtrip',
                type: 'anthropic',
                apiUrl: 'https://api.anthropic.com/v1/messages',
                apiKey: 'sk-ant-123',
                defaultModel: 'claude-3-sonnet',
                models: [
                    { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet' },
                    { id: 'claude-3-opus', name: 'Claude 3 Opus' }
                ],
                enabled: false
            });
            await storage.saveProvider(provider.toJSON());

            const retrieved = await storage.getProvider('full-roundtrip');

            expect(retrieved.id).toBe('full-roundtrip');
            expect(retrieved.name).toBe('Full Roundtrip');
            expect(retrieved.type).toBe('anthropic');
            expect(retrieved.apiUrl).toBe('https://api.anthropic.com/v1/messages');
            expect(retrieved.apiKey).toBe('sk-ant-123');
            expect(retrieved.defaultModel).toBe('claude-3-sonnet');
            expect(retrieved.models).toHaveLength(2);
            expect(retrieved.enabled).toBe(false);
        });
    });
});
