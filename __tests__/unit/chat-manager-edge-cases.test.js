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
    getActiveProviderID: vi.fn().mockResolvedValue(null),
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
            mockProviderStorage.getActiveProviderID.mockResolvedValue(null);
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

            const results = await Promise.all(promises);
            expect(results).toHaveLength(10);
            expect(results.every(r => r instanceof Chat)).toBe(true);
        });
    });

    describe('Project Context', () => {
        it('should create chat with project context', async () => {
            chatManager.currentProjectId = 'project-abc';

            const chat = await chatManager.createChat({ title: 'Project Chat' });

            expect(chat.projectId).toBe('project-abc');
        });

        it('should exit project correctly', async () => {
            chatManager.currentProjectId = 'project-xyz';

            await chatManager.exitProject();

            expect(chatManager.currentProjectId).toBeNull();
            expect(mockStorage.saveCurrentProjectId).toHaveBeenCalledWith(null);
        });

        it('should set current project', async () => {
            await chatManager.setCurrentProject('new-project');

            expect(chatManager.currentProjectId).toBe('new-project');
            expect(mockStorage.saveCurrentProjectId).toHaveBeenCalledWith('new-project');
        });
    });

    describe('Chat Title Generation', () => {
        it('should auto-generate title from first message', async () => {
            mockStorage.saveChat.mockResolvedValue(undefined);

            const chat = new Chat({ id: 'chat-1', title: 'New Chat' });
            chatManager.chats = [chat];

            // Add a message that should trigger auto-title
            await chatManager.addMessage('chat-1', {
                role: 'user',
                content: 'This is a test message for auto title generation'
            });

            // The title should be updated
            expect(chat.title).toBe('This is a test message for auto title generation');
        });

        it('should truncate long titles', async () => {
            mockStorage.saveChat.mockResolvedValue(undefined);

            const chat = new Chat({ id: 'chat-1', title: 'New Chat' });
            chatManager.chats = [chat];

            const longContent = 'A'.repeat(100);
            await chatManager.addMessage('chat-1', {
                role: 'user',
                content: longContent
            });

            // Title should be truncated to 50 chars + '...'
            expect(chat.title.length).toBeLessThanOrEqual(53);
            expect(chat.title.endsWith('...')).toBe(true);
        });
    });

    describe('Message Deletion', () => {
        it('should delete a specific message', async () => {
            const chat = new Chat({ id: 'chat-1' });
            const msg = chat.addMessage({ role: 'user', content: 'To be deleted' });
            chat.addMessage({ role: 'assistant', content: 'Response' });
            chatManager.chats = [chat];

            const result = await chatManager.deleteMessage('chat-1', msg.id);

            expect(result).toBe(true);
            expect(chat.getMessageCount()).toBe(1);
        });

        it('should return false for non-existent message', async () => {
            const chat = new Chat({ id: 'chat-1' });
            chatManager.chats = [chat];

            const result = await chatManager.deleteMessage('chat-1', 'non-existent');

            expect(result).toBe(false);
        });

        it('should return false for non-existent chat', async () => {
            const result = await chatManager.deleteMessage('non-existent', 'msg-id');

            expect(result).toBe(false);
        });
    });

    describe('Chat Statistics', () => {
        it('should get stats from storage', async () => {
            const mockStats = {
                total: 10,
                archived: 2,
                pinned: 3,
                byProject: { 'project-1': 5, 'no-project': 5 },
                totalMessages: 100
            };
            mockStorage.getChatStats.mockResolvedValue(mockStats);

            const stats = await chatManager.getStats();

            expect(stats).toEqual(mockStats);
        });
    });

    describe('Import/Export', () => {
        it('should export all chats', async () => {
            const mockExported = [
                { id: 'chat-1', title: 'Chat 1', messages: [] },
                { id: 'chat-2', title: 'Chat 2', messages: [] }
            ];
            mockStorage.exportChats.mockResolvedValue(mockExported);

            const result = await chatManager.exportAllChats();

            expect(result).toEqual(mockExported);
        });

        it('should import chats and reload', async () => {
            const chatsData = [
                { id: 'chat-1', title: 'Imported 1' },
                { id: 'chat-2', title: 'Imported 2' }
            ];
            mockStorage.importChats.mockResolvedValue(chatsData.map(d => Chat.fromJSON(d)));
            mockStorage.getAllChats.mockResolvedValue(chatsData.map(d => Chat.fromJSON(d)));

            await chatManager.importChats(chatsData);

            expect(mockStorage.importChats).toHaveBeenCalledWith(chatsData);
            expect(mockStorage.getAllChats).toHaveBeenCalled();
        });
    });

    describe('Multiple Chat Deletion', () => {
        it('should delete multiple chats', async () => {
            chatManager.chats = [
                new Chat({ id: 'chat-1' }),
                new Chat({ id: 'chat-2' }),
                new Chat({ id: 'chat-3' })
            ];

            await chatManager.deleteChats(['chat-1', 'chat-3']);

            expect(chatManager.chats).toHaveLength(1);
            expect(chatManager.chats[0].id).toBe('chat-2');
        });
    });

    describe('Provider Selection for sendToAI', () => {
        it('should use explicit providerId over chat default', async () => {
            const chat = new Chat({ id: 'chat-1', defaultProviderId: 'provider-default' });
            chat.addMessage({ role: 'user', content: 'Hello' });
            chatManager.chats = [chat];
            chatManager.currentChatId = 'chat-1';

            const mockProvider = {
                id: 'provider-explicit',
                name: 'Explicit Provider',
                enabled: true,
                defaultModel: 'model-1',
                models: [{ id: 'model-1', name: 'Model 1' }],
                sendRequest: vi.fn().mockResolvedValue('Response')
            };
            mockProviderStorage.getProvider.mockResolvedValue(mockProvider);

            await chatManager.sendToAI('Hello', 'provider-explicit');

            expect(mockProviderStorage.getProvider).toHaveBeenCalledWith('provider-explicit');
        });

        it('should use chat default provider over global active', async () => {
            const chat = new Chat({ id: 'chat-1', defaultProviderId: 'provider-chat' });
            chat.addMessage({ role: 'user', content: 'Hello' });
            chatManager.chats = [chat];
            chatManager.currentChatId = 'chat-1';

            mockProviderStorage.getActiveProviderID.mockResolvedValue('provider-global');

            const mockProvider = {
                id: 'provider-chat',
                name: 'Chat Provider',
                enabled: true,
                defaultModel: 'model-1',
                models: [{ id: 'model-1', name: 'Model 1' }],
                sendRequest: vi.fn().mockResolvedValue('Response')
            };
            mockProviderStorage.getProvider.mockResolvedValue(mockProvider);

            await chatManager.sendToAI('Hello');

            // Should use chat default, not global active
            expect(mockProviderStorage.getProvider).toHaveBeenCalledWith('provider-chat');
        });
    });

    describe('Chat Update Operations', () => {
        it('should update chat title', async () => {
            const chat = new Chat({ id: 'chat-1', title: 'Old Title' });
            chatManager.chats = [chat];

            await chatManager.updateChatTitle('chat-1', 'New Title');

            expect(chat.title).toBe('New Title');
            expect(mockStorage.saveChat).toHaveBeenCalled();
        });

        it('should update chat provider settings', async () => {
            const chat = new Chat({ id: 'chat-1' });
            chatManager.chats = [chat];

            await chatManager.updateChatProvider('chat-1', 'new-provider', 'new-model');

            expect(chat.defaultProviderId).toBe('new-provider');
            expect(chat.defaultModelId).toBe('new-model');
        });

        it('should do nothing when updating non-existent chat', async () => {
            await chatManager.updateChatTitle('non-existent', 'New Title');
            await chatManager.updateChatProvider('non-existent', 'provider', 'model');

            // Should not throw, just silently fail
            expect(mockStorage.saveChat).not.toHaveBeenCalled();
        });
    });

    describe('Getters', () => {
        it('should return all chats', () => {
            const chats = [
                new Chat({ id: 'chat-1' }),
                new Chat({ id: 'chat-2' })
            ];
            chatManager.chats = chats;

            expect(chatManager.getChats()).toBe(chats);
        });
    });

    describe('Save Operations', () => {
        it('should save all chats', async () => {
            const chats = [
                new Chat({ id: 'chat-1' }),
                new Chat({ id: 'chat-2' })
            ];
            chatManager.chats = chats;

            await chatManager.saveChats();

            expect(mockStorage.saveChats).toHaveBeenCalledWith(chats);
        });

        it('should save a single chat', async () => {
            const chat = new Chat({ id: 'chat-1' });

            await chatManager.saveChat(chat);

            expect(mockStorage.saveChat).toHaveBeenCalledWith(chat);
        });
    });
});
