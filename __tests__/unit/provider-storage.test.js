// __tests__/unit/provider-storage.test.js

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProviderStorage } from '@modules/provider-storage.js';
import { AIProvider } from '@modules/ai-provider.js';

// --- Setup/Teardown Helpers ---

const getStorageInstance = () => {
    // Use a unique database name to ensure isolation between test files
    const storage = new ProviderStorage();
    storage.dbName = `TestDB-ProviderStorage-${Math.random().toString(36).substring(2, 9)}`;
    return storage;
};

// Define a sample provider configuration
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

    // Setup: Initialize a new storage instance and sample provider before each test
    beforeEach(async () => {
        storage = getStorageInstance();
        // Create an AIProvider instance for saving/comparison
        sampleProvider = new AIProvider(sampleProviderConfig);
    });

    // Teardown: Clean up the DB after each test
    afterEach(async () => {
        if (storage.db) {
            storage.db.close();
        }
        // Force delete the database
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
    });

    // -------------------------------------------------------------------------

    // --- Provider CRUD Operations ---

    describe('Provider CRUD Operations', () => {
        it('should save and retrieve a provider, correctly decrypting the API key', async () => {
            // Save the provider (pass the data object, not the instance)
            await storage.saveProvider(sampleProvider.toJSON());

            // Retrieve and verify
            const retrievedProvider = await storage.getProvider(sampleProvider.id);

            expect(retrievedProvider).toBeInstanceOf(AIProvider);
            // CRITICAL CHECK: Ensure the stored (encrypted) API key is decrypted and correct upon retrieval.
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
            // Check that the retrieval process instantiated AIProvider and decrypted the key
            expect(allProviders.find(p => p.id === 'a').apiKey).toBe('keyA');
            expect(allProviders.find(p => p.id === 'b').apiKey).toBe('keyB');
        });

        it('should update an existing provider', async () => {
            const id = 'update-test';
            const initialConfig = { ...sampleProviderConfig, id: id, name: 'Old Name' };
            const provider = new AIProvider(initialConfig);
            await storage.saveProvider(provider.toJSON());

            // Update data (change name and key)
            provider.name = 'New Name';
            provider.apiKey = 'new-key-456';
            await storage.saveProvider(provider.toJSON());

            // Verify update
            const updatedProvider = await storage.getProvider(id);
            expect(updatedProvider.name).toBe('New Name');
            expect(updatedProvider.apiKey).toBe('new-key-456');
        });

        it('should delete a provider', async () => {
            const idToDelete = 'to-be-deleted';
            const provider = new AIProvider({ id: idToDelete, name: 'To Delete', apiKey: 'temp' });
            await storage.saveProvider(provider.toJSON());

            // Pre-check
            expect(await storage.getProvider(idToDelete)).not.toBeNull();

            // Delete
            await storage.deleteProvider(idToDelete);

            // Post-check
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
            // saveProviderDefaultModel internally calls getProvider, modifies the AIProvider instance,
            // and then calls saveProvider(provider_instance), which is why the source code fix is crucial here.
            await storage.saveProviderDefaultModel(id, newModelId);

            const updatedProvider = await storage.getProvider(id);
            expect(updatedProvider.defaultModel).toBe(newModelId);
            expect(updatedProvider.apiKey).toBe('k');
        });
    });

    // -------------------------------------------------------------------------

    // --- App Settings Tests (Active Provider) ---

    describe('App Settings (Active Provider)', () => {
        it('should save and retrieve the active provider ID using saveActiveProvider', async () => {
            const activeId = 'provider-active-1';
            await storage.saveActiveProvider(activeId);

            expect(await storage.getActiveProvider()).toBe(activeId);
        });

        it('should save the active provider ID using the setActiveProvider alias', async () => {
            const newId = 'provider-active-2';
            await storage.setActiveProvider(newId); // Test alias

            expect(await storage.getActiveProvider()).toBe(newId);
        });

        it('should return null if no active provider ID is set', async () => {
            expect(await storage.getActiveProvider()).toBeNull();
        });
    });

    // -------------------------------------------------------------------------

    // --- Default Initialization ---

    describe('Default Initialization', () => {
        it('should return all existing providers on initializeDefaultProviders', async () => {
            const provider = new AIProvider({ id: 'existing-default', name: 'Existing', apiKey: 'key' });
            // Save existing provider
            await storage.saveProvider(provider.toJSON());

            // initializeDefaultProviders should now return the saved provider
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
    });
});
