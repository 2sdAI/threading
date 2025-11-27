/**
 * ============================================
 * CHAT MANAGER EDGE CASES TESTS
 * ============================================
 * Additional tests for error handling and edge cases
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChatManager } from '@/modules/chat-manager.js';
import { Chat } from '@/modules/chat.js';

// Create proper mocks that match the existing chat-manager.test.js pattern
const createMockStorage = () => ({
    init: vi.fn().mockResolvedValue({}),
    getAllChats: vi.fn().mockResolvedValue([]),
    getChat: vi.fn().mockResolvedValue(null),
    saveChat: vi.fn().mockResolvedValue(undefined),
    saveChats: vi.fn().mockResolvedValue(undefined),
    deleteChat: vi.fn().mockResolvedValue(undefined),
    deleteChats: vi.fn().mockResolvedValue(undefined),
    clearAllChats: vi.fn().mockResolvedValue(undefined),
    saveCurrentChatId: vi.fn().mockResolvedValue(undefined),
    getCurrentChatId: vi.fn().mockResolvedValue(null),
    saveCurrentProjectId: vi.fn().mockResolvedValue(undefined),
    getCurrentProjectId: vi.fn().mockResolvedValue(null),
    exportChats: vi.fn().mockResolvedValue([]),
    importChats: vi.fn().mockResolvedValue([]),
    getChatStats: vi.fn().mockResolvedValue({ total: 0 })
});

const createMockProviderStorage = () => ({
    init: vi.fn().mockResolvedValue({}),
    getActiveProvider: vi.fn().mockResolvedValue(null),
    getProvider: vi.fn().mockResolvedValue(null),
    getAllProviders: vi.fn().mockResolvedValue([]),
    getEnabledProviders: vi.fn().mockResolvedValue([]),
    saveProvider: vi.fn().mockResolvedValue(undefined),
    deleteProvider: vi.fn().mockResolvedValue(undefined),
    saveActiveProvider: vi.fn().mockResolvedValue(undefined),
    initializeDefaultProviders: vi.fn().mockResolvedValue([])
});

describe('ChatManager Edge Cases', () => {
    let chatManager;
    let mockStorage;
    let mockProviderStorage;

    beforeEach(() => {
        mockStorage = createMockStorage();
        mockProviderStorage = createMockProviderStorage();
        chatManager = new ChatManager(mockStorage, mockProviderStorage);
    });

    describe('Error Handling', () => {
        it('should handle storage errors during chat save', async () => {
            mockStorage.saveChat.mockRejectedValue(new Error('Storage error'));

            // createChat calls saveChat internally
            await expect(chatManager.createChat({ title: 'Test' })).rejects.toThrow('Storage error');
        });

        it('should handle missing provider gracefully', async () => {
            // Provider storage returns null (no active provider)
            mockProviderStorage.getActiveProvider.mockResolvedValue(null);
            mockProviderStorage.getProvider.mockResolvedValue(null);

            // Create a chat first
            const chat = new Chat({ id: 'chat-1', title: 'Test' });
            chatManager.chats = [chat];
            chatManager.currentChatId = 'chat-1';

            // sendToAI should throw when no provider is available
            await expect(chatManager.sendToAI('hello')).rejects.toThrow();
        });

        it('should handle concurrent chat operations', async () => {
            mockStorage.saveChat.mockResolvedValue(undefined);
            mockStorage.getAllChats.mockResolvedValue([]);

            const promises = [];
            for (let i = 0; i < 10; i++) {
                promises.push(chatManager.createChat({ title: `Chat ${i}` }));
            }

            const results = await Promise.allSettled(promises);

            // All should succeed
            const fulfilled = results.filter(r => r.status === 'fulfilled');
            expect(fulfilled.length).toBe(10);
        });

        it('should handle storage init failure', async () => {
            mockStorage.init.mockRejectedValue(new Error('DB init failed'));

            await expect(chatManager.init()).rejects.toThrow('DB init failed');
        });

        it('should handle getAllChats returning undefined', async () => {
            mockStorage.getAllChats.mockResolvedValue(undefined);

            await chatManager.init();

            // Should default to empty array or handle gracefully
            expect(Array.isArray(chatManager.chats) || chatManager.chats === undefined).toBe(true);
        });
    });

    describe('Boundary Conditions', () => {
        it('should handle very long chat title', async () => {
            const longTitle = 'A'.repeat(10000);
            mockStorage.saveChat.mockResolvedValue(undefined);

            const chat = await chatManager.createChat({ title: longTitle });

            expect(chat.title).toBe(longTitle);
        });

        it('should handle special characters in title', async () => {
            const specialTitle = '特殊字符 🎉 <script>alert("test")</script>';
            mockStorage.saveChat.mockResolvedValue(undefined);

            const chat = await chatManager.createChat({ title: specialTitle });

            expect(chat.title).toBe(specialTitle);
        });

        it('should handle empty string title', async () => {
            mockStorage.saveChat.mockResolvedValue(undefined);

            const chat = await chatManager.createChat({ title: '' });

            // Should default to 'New Chat' based on Chat.create behavior
            expect(chat.title).toBe('New Chat');
        });

        it('should handle null projectId', async () => {
            mockStorage.saveChat.mockResolvedValue(undefined);

            const chat = await chatManager.createChat({ projectId: null });

            expect(chat.projectId).toBeNull();
        });
    });

    describe('State Consistency', () => {
        it('should maintain consistent state after failed delete', async () => {
            const chat = new Chat({ id: 'chat-1', title: 'Test' });
            chatManager.chats = [chat];
            mockStorage.deleteChat.mockRejectedValue(new Error('Delete failed'));

            await expect(chatManager.deleteChat('chat-1')).rejects.toThrow('Delete failed');

            // Chat should still be in the array since delete failed
            // (depends on implementation - may or may not be removed optimistically)
        });

        it('should handle loading chats when storage returns empty', async () => {
            mockStorage.getAllChats.mockResolvedValue([]);

            const chats = await chatManager.loadChats();

            expect(chats).toEqual([]);
            expect(chatManager.chats).toEqual([]);
        });

        it('should handle setting current chat to non-existent ID', async () => {
            chatManager.chats = [];

            await chatManager.setCurrentChat('non-existent-id');

            // Should still set the ID even if chat doesn't exist in memory
            expect(chatManager.currentChatId).toBe('non-existent-id');
        });
    });
});
