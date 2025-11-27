/**
 * ============================================
 * INTEGRATION: STORAGE CONSISTENCY TESTS
 * ============================================
 * Tests for IndexedDB storage reliability and consistency
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { ChatStorage } from '@/modules/chat-storage.js';
import { Chat } from '@/modules/chat.js';

// Helper to manually clear all object stores
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

describe('Integration: Storage Consistency', () => {
    let storage;

    beforeEach(async () => {
        // IMPORTANT: Only mock 'Date'.
        // Mocking setTimeout causes IDB Promises to timeout/hang.
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date(2025, 0, 1));

        storage = new ChatStorage();
        await storage.init();

        await clearDatabase(storage.db);
    });

    afterEach(() => {
        if (storage?.db) storage.db.close();
        vi.useRealTimers();
    });

    it('should handle concurrent writes correctly', async () => {
        const chat = Chat.create({ title: 'Concurrent Test' });
        await storage.saveChat(chat);

        const updates = Array.from({ length: 10 }, (_, i) => {
            const updatedChat = new Chat({
                ...chat,
                title: `Update ${i}`,
                updatedAt: new Date().toISOString()
            });
            return storage.saveChat(updatedChat);
        });

        await Promise.all(updates);

        const saved = await storage.getChat(chat.id);
        expect(saved).toBeDefined();
        expect(saved.title).toMatch(/Update \d/);
    });

    it('should maintain referential integrity with bulk operations', async () => {
        const chats = [];
        for (let i = 0; i < 5; i++) {
            vi.setSystemTime(new Date(Date.now() + 50));
            chats.push(Chat.create({ title: `Chat ${i}` }));
        }

        await storage.saveChats(chats);

        const allChats = await storage.getAllChats();
        expect(allChats).toHaveLength(5);

        const idsToDelete = [chats[0].id, chats[2].id, chats[4].id];
        await storage.deleteChats(idsToDelete);

        const remaining = await storage.getAllChats();
        expect(remaining).toHaveLength(2);

        const remainingTitles = remaining.map(c => c.title).sort();
        expect(remainingTitles).toEqual(['Chat 1', 'Chat 3']);
    });

    it('should preserve data integrity across save/load cycles', async () => {
        const originalChat = Chat.create({
            title: 'Integrity Test',
            projectId: 'project-123'
        });
        originalChat.addMessage({ role: 'user', content: 'Hello' });
        originalChat.addMessage({ role: 'assistant', content: 'Hi there!' });
        originalChat.archived = true;
        originalChat.pinned = true;
        originalChat.metadata = { key: 'value', nested: { a: 1 } };

        await storage.saveChat(originalChat);

        const loaded = await storage.getChat(originalChat.id);

        expect(loaded.id).toBe(originalChat.id);
        expect(loaded.title).toBe('Integrity Test');
        expect(loaded.projectId).toBe('project-123');
        expect(loaded.messages).toHaveLength(2);
        expect(loaded.archived).toBe(true);
        expect(loaded.pinned).toBe(true);
        expect(loaded.metadata).toEqual({ key: 'value', nested: { a: 1 } });
    });

    it('should handle rapid successive operations', async () => {
        const operations = [];

        for (let i = 0; i < 20; i++) {
            vi.setSystemTime(new Date(Date.now() + 50)); // Ensure unique ID
            const chat = Chat.create({ title: `Rapid ${i}` });

            operations.push(
                storage.saveChat(chat)
                    .then(() => {
                        chat.title = `Rapid ${i} Updated`;
                        return storage.saveChat(chat);
                    })
                    .then(() => storage.getChat(chat.id))
            );
        }

        const results = await Promise.all(operations);

        expect(results).toHaveLength(20);
        results.forEach((chat, i) => {
            expect(chat).toBeDefined();
            expect(chat.title).toBe(`Rapid ${i} Updated`);
        });
    });

    it('should correctly sort by updatedAt', async () => {
        vi.setSystemTime(new Date('2023-01-01'));
        const chat1 = Chat.create({ title: 'Old Chat' });
        chat1.updatedAt = new Date().toISOString();

        vi.setSystemTime(new Date('2023-06-01'));
        const chat2 = Chat.create({ title: 'Newer Chat' });
        chat2.updatedAt = new Date().toISOString();

        vi.setSystemTime(new Date('2023-12-01'));
        const chat3 = Chat.create({ title: 'Newest Chat' });
        chat3.updatedAt = new Date().toISOString();

        await storage.saveChat(chat2);
        await storage.saveChat(chat1);
        await storage.saveChat(chat3);

        const allChats = await storage.getAllChats();

        expect(allChats).toHaveLength(3);
        expect(allChats[0].title).toBe('Newest Chat');
        expect(allChats[1].title).toBe('Newer Chat');
        expect(allChats[2].title).toBe('Old Chat');
    });

    it('should handle empty database operations gracefully', async () => {
        await clearDatabase(storage.db);

        const allChats = await storage.getAllChats();
        expect(allChats).toEqual([]);

        const nonExistent = await storage.getChat('does-not-exist');
        expect(nonExistent).toBeNull();

        await expect(storage.deleteChat('does-not-exist')).resolves.not.toThrow();
        await expect(storage.saveChats([])).resolves.not.toThrow();
        await expect(storage.deleteChats([])).resolves.not.toThrow();
    });
});
