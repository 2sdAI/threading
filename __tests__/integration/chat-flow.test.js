/**
 * ============================================
 * INTEGRATION: CHAT FLOW TESTS
 * ============================================
 * Tests complete chat lifecycle with real storage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { ChatManager } from '@/modules/chat-manager.js';
import { ChatStorage } from '@/modules/chat-storage.js';
import { ProviderStorage } from '@/modules/provider-storage.js';
import { Message } from '@/modules/message.js';

// Helper to manually clear all object stores
// This is more reliable than deleteDatabase in test environments
async function clearDatabase(db) {
    if (!db) return;
    const objectStoreNames = Array.from(db.objectStoreNames);
    if (objectStoreNames.length === 0) return;

    const transaction = db.transaction(objectStoreNames, 'readwrite');
    const promises = objectStoreNames.map(storeName => {
        return new Promise((resolve, reject) => {
            const request = transaction.objectStore(storeName).clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    });
    await Promise.all(promises);
}

describe('Integration: Chat Flow', () => {
    let chatManager;
    let chatStorage;
    let providerStorage;

    beforeEach(async () => {
        // IMPORTANT: We only mock 'Date' to control ID generation.
        // We MUST leave setTimeout/setInterval native, otherwise IndexedDB operations
        // (which rely on async scheduling) will hang forever.
        vi.useFakeTimers({ toFake: ['Date'] });

        // Set a fixed start time
        vi.setSystemTime(new Date(2024, 0, 1, 0, 0, 0));

        chatStorage = new ChatStorage();
        providerStorage = new ProviderStorage();

        await chatStorage.init();
        await providerStorage.init();

        // Clear existing data to prevent state leakage between tests
        await clearDatabase(chatStorage.db);
        await clearDatabase(providerStorage.db);

        chatManager = new ChatManager(chatStorage, providerStorage);
        await chatManager.init();
    });

    afterEach(async () => {
        if (chatStorage?.db) chatStorage.db.close();
        if (providerStorage?.db) providerStorage.db.close();
        vi.useRealTimers();
    });

    it('should persist chat through full lifecycle', async () => {
        const chat = await chatManager.createChat({ title: 'Integration Test' });

        // Manually advance time to ensure unique IDs
        vi.setSystemTime(new Date(Date.now() + 10));

        await chatManager.addMessage(chat.id, new Message({
            role: 'user',
            content: 'Hello world'
        }));

        const loadedChat = await chatStorage.getChat(chat.id);
        expect(loadedChat.messages).toHaveLength(1);
        expect(loadedChat.messages[0].content).toBe('Hello world');

        await chatManager.updateChatTitle(chat.id, 'Updated Title');

        const updatedChat = await chatStorage.getChat(chat.id);
        expect(updatedChat.title).toBe('Updated Title');

        await chatManager.deleteChat(chat.id);

        const deletedChat = await chatStorage.getChat(chat.id);
        expect(deletedChat).toBeNull();
    });

    it('should maintain chat order by updatedAt', async () => {
        const chat1 = await chatManager.createChat({ title: 'First' });
        vi.setSystemTime(new Date(Date.now() + 1000)); // Advance 1s

        const chat2 = await chatManager.createChat({ title: 'Second' });
        vi.setSystemTime(new Date(Date.now() + 1000));

        await chatManager.addMessage(chat1.id, new Message({
            role: 'user',
            content: 'Update to move to top'
        }));

        await chatManager.loadChats();

        expect(chatManager.chats[0].id).toBe(chat1.id);
        expect(chatManager.chats[1].id).toBe(chat2.id);
    });

    it('should handle provider configuration and persistence', async () => {
        const providerConfig = {
            id: 'test-provider',
            name: 'Test Provider',
            type: 'openai',
            apiUrl: 'https://api.test.com/v1/chat/completions',
            apiKey: 'test-key',
            enabled: true,
            models: [],
            defaultModel: 'gpt-4'
        };

        await providerStorage.saveProvider(providerConfig);

        const saved = await providerStorage.getProvider('test-provider');
        expect(saved).toBeDefined();

        await providerStorage.saveActiveProvider('test-provider');

        const provider = await providerStorage.getActiveProvider();
        expect(provider).toBeDefined();
        expect(provider.name).toBe('Test Provider');
    });

    it('should handle multiple messages in a chat', async () => {
        const chat = await chatManager.createChat({ title: 'Multi-message Test' });

        const messages = [
            new Message({ role: 'user', content: 'First message' }),
            new Message({ role: 'assistant', content: 'First response' }),
            new Message({ role: 'user', content: 'Second message' }),
            new Message({ role: 'assistant', content: 'Second response' })
        ];

        for (const msg of messages) {
            vi.setSystemTime(new Date(Date.now() + 10));
            await chatManager.addMessage(chat.id, msg);
        }

        const loadedChat = await chatStorage.getChat(chat.id);
        expect(loadedChat.messages).toHaveLength(4);
        expect(loadedChat.messages[0].content).toBe('First message');
        expect(loadedChat.messages[3].content).toBe('Second response');
    });

    it('should handle chat with project association', async () => {
        const projectId = 'project-123';
        const chatWithProject = await chatManager.createChat({ title: 'Project Chat', projectId });

        vi.setSystemTime(new Date(Date.now() + 10));

        const projectChats = chatManager.getChatsByProject(projectId);
        expect(projectChats).toHaveLength(1);
        expect(projectChats[0].id).toBe(chatWithProject.id);
    });

    it('should handle archive and pin operations', async () => {
        const chat = await chatManager.createChat({ title: 'Archive Test' });

        await chatManager.toggleArchive(chat.id);
        let loaded = await chatStorage.getChat(chat.id);
        expect(loaded.archived).toBe(true);

        await chatManager.toggleArchive(chat.id);
        loaded = await chatStorage.getChat(chat.id);
        expect(loaded.archived).toBe(false);

        await chatManager.togglePin(chat.id);
        loaded = await chatStorage.getChat(chat.id);
        expect(loaded.pinned).toBe(true);
    });

    it('should handle clear chat messages', async () => {
        const chat = await chatManager.createChat({ title: 'Clear Test' });

        vi.setSystemTime(new Date(Date.now() + 10));
        await chatManager.addMessage(chat.id, new Message({ role: 'user', content: 'Test 1' }));
        vi.setSystemTime(new Date(Date.now() + 10));
        await chatManager.addMessage(chat.id, new Message({ role: 'assistant', content: 'Response 1' }));

        let loaded = await chatStorage.getChat(chat.id);
        expect(loaded.messages).toHaveLength(2);

        await chatManager.clearChatMessages(chat.id);

        loaded = await chatStorage.getChat(chat.id);
        expect(loaded.messages).toHaveLength(0);
        expect(loaded.id).toBe(chat.id);
    });

    it('should handle export and import', async () => {
        // Start fresh - clear database and reload chatManager state
        await clearDatabase(chatStorage.db);
        chatManager.chats = [];

        // Create first chat
        const chat1 = await chatManager.createChat({ title: 'Export Test 1' });
        vi.setSystemTime(new Date(Date.now() + 10));
        await chatManager.addMessage(chat1.id, new Message({ role: 'user', content: 'Hello' }));

        // FIX: Revert title because addMessage triggered auto-titling (renaming it to "Hello")
        await chatManager.updateChatTitle(chat1.id, 'Export Test 1');

        // Advance time for unique ID
        vi.setSystemTime(new Date(Date.now() + 100));

        // Create second chat
        const chat2 = await chatManager.createChat({ title: 'Export Test 2' });
        vi.setSystemTime(new Date(Date.now() + 10));
        await chatManager.addMessage(chat2.id, new Message({ role: 'user', content: 'World' }));

        // FIX: Revert title because addMessage triggered auto-titling
        await chatManager.updateChatTitle(chat2.id, 'Export Test 2');

        // Export all chats
        const exported = await chatManager.exportAllChats();
        expect(exported).toHaveLength(2);

        // Clear database and reset chatManager state
        await clearDatabase(chatStorage.db);
        chatManager.chats = [];

        // Verify database is empty
        let remaining = await chatStorage.getAllChats();
        expect(remaining).toHaveLength(0);

        // Import the exported chats
        await chatManager.importChats(exported);

        // Verify import succeeded
        remaining = await chatStorage.getAllChats();
        expect(remaining).toHaveLength(2);

        const importedChat1 = remaining.find(c => c.title === 'Export Test 1');
        expect(importedChat1).toBeDefined();
        expect(importedChat1.messages).toHaveLength(1);

        const importedChat2 = remaining.find(c => c.title === 'Export Test 2');
        expect(importedChat2).toBeDefined();
        expect(importedChat2.messages).toHaveLength(1);
    });
});
