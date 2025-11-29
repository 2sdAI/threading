// __tests__/unit/chat-card-actions.test.js
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ChatManager } from '@/modules/chat-manager.js';
import { Chat } from '@/modules/chat.js';
import { Message } from '@/modules/message.js';

// Mock ChatStorage
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

// Mock ProviderStorage
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

describe('Chat Card Actions', () => {
    let chatManager;
    let mockStorage;
    let mockProviderStorage;

    beforeEach(() => {
        mockStorage = createMockStorage();
        mockProviderStorage = createMockProviderStorage();
        chatManager = new ChatManager(mockStorage, mockProviderStorage);
    });

    // ============================================
    // DELETE CHAT TESTS
    // ============================================
    describe('deleteChat', () => {
        it('should delete a chat by ID', async () => {
            const chat = new Chat({ id: 'chat-1', title: 'Test Chat' });
            chatManager.chats = [chat];

            await chatManager.deleteChat('chat-1');

            expect(chatManager.chats).toHaveLength(0);
            expect(mockStorage.deleteChat).toHaveBeenCalledWith('chat-1');
        });

        it('should clear currentChatId if deleted chat was active', async () => {
            const chat = new Chat({ id: 'chat-1', title: 'Test Chat' });
            chatManager.chats = [chat];
            chatManager.currentChatId = 'chat-1';

            await chatManager.deleteChat('chat-1');

            expect(chatManager.currentChatId).toBeNull();
            expect(mockStorage.saveCurrentChatId).toHaveBeenCalledWith(null);
        });

        it('should not affect currentChatId if different chat was deleted', async () => {
            const chat1 = new Chat({ id: 'chat-1', title: 'Chat 1' });
            const chat2 = new Chat({ id: 'chat-2', title: 'Chat 2' });
            chatManager.chats = [chat1, chat2];
            chatManager.currentChatId = 'chat-1';

            await chatManager.deleteChat('chat-2');

            expect(chatManager.currentChatId).toBe('chat-1');
        });

        it('should handle deleting non-existent chat gracefully', async () => {
            chatManager.chats = [];

            await chatManager.deleteChat('non-existent');

            expect(mockStorage.deleteChat).not.toHaveBeenCalled();
        });
    });

    // ============================================
    // CLONE CHAT TESTS
    // ============================================
    describe('cloneChat', () => {
        it('should clone a chat with all messages', async () => {
            const originalChat = new Chat({
                id: 'chat-1',
                title: 'Original Chat',
                projectId: 'project-1',
                defaultProviderId: 'provider-1',
                defaultModelId: 'model-1'
            });
            originalChat.addMessage({ role: 'user', content: 'Hello' });
            originalChat.addMessage({ role: 'assistant', content: 'Hi there!' });
            chatManager.chats = [originalChat];

            const clonedChat = await chatManager.cloneChat('chat-1');

            expect(clonedChat).toBeDefined();
            expect(clonedChat.id).not.toBe('chat-1'); // New ID
            expect(clonedChat.title).toBe('Original Chat (Copy)');
            expect(clonedChat.projectId).toBe('project-1');
            expect(clonedChat.defaultProviderId).toBe('provider-1');
            expect(clonedChat.defaultModelId).toBe('model-1');
            expect(clonedChat.messages).toHaveLength(2);
        });

        it('should create new IDs for cloned messages', async () => {
            const originalChat = new Chat({ id: 'chat-1', title: 'Test' });
            const originalMessage = new Message({ role: 'user', content: 'Test message' });
            originalChat.addMessage(originalMessage);
            chatManager.chats = [originalChat];

            const clonedChat = await chatManager.cloneChat('chat-1');

            expect(clonedChat.messages[0].id).not.toBe(originalMessage.id);
            expect(clonedChat.messages[0].content).toBe('Test message');
        });

        it('should preserve message content and metadata', async () => {
            const originalChat = new Chat({ id: 'chat-1', title: 'Test' });
            originalChat.addMessage({
                role: 'assistant',
                content: 'AI response',
                providerId: 'provider-1',
                providerName: 'Test Provider',
                modelId: 'model-1',
                modelName: 'Test Model'
            });
            chatManager.chats = [originalChat];

            const clonedChat = await chatManager.cloneChat('chat-1');

            expect(clonedChat.messages[0].role).toBe('assistant');
            expect(clonedChat.messages[0].content).toBe('AI response');
            expect(clonedChat.messages[0].providerName).toBe('Test Provider');
            expect(clonedChat.messages[0].modelName).toBe('Test Model');
        });

        it('should add clonedFrom metadata', async () => {
            const originalChat = new Chat({ id: 'chat-1', title: 'Test' });
            chatManager.chats = [originalChat];

            const clonedChat = await chatManager.cloneChat('chat-1');

            expect(clonedChat.metadata.clonedFrom).toBe('chat-1');
        });

        it('should add cloned chat to beginning of chats list', async () => {
            const chat1 = new Chat({ id: 'chat-1', title: 'First' });
            const chat2 = new Chat({ id: 'chat-2', title: 'Second' });
            chatManager.chats = [chat1, chat2];

            const clonedChat = await chatManager.cloneChat('chat-2');

            expect(chatManager.chats[0]).toBe(clonedChat);
            expect(chatManager.chats).toHaveLength(3);
        });

        it('should save cloned chat to storage', async () => {
            const originalChat = new Chat({ id: 'chat-1', title: 'Test' });
            chatManager.chats = [originalChat];

            const clonedChat = await chatManager.cloneChat('chat-1');

            expect(mockStorage.saveChat).toHaveBeenCalledWith(clonedChat);
        });

        it('should throw error for non-existent chat', async () => {
            chatManager.chats = [];

            await expect(chatManager.cloneChat('non-existent'))
                .rejects.toThrow('Chat not found: non-existent');
        });

        it('should clone empty chat (no messages)', async () => {
            const emptyChat = new Chat({ id: 'chat-1', title: 'Empty' });
            chatManager.chats = [emptyChat];

            const clonedChat = await chatManager.cloneChat('chat-1');

            expect(clonedChat.messages).toHaveLength(0);
            expect(clonedChat.title).toBe('Empty (Copy)');
        });
    });

    // ============================================
    // PIN/UNPIN CHAT TESTS
    // ============================================
    describe('toggleChatPin', () => {
        it('should pin an unpinned chat', async () => {
            const chat = new Chat({ id: 'chat-1', title: 'Test', pinned: false });
            chatManager.chats = [chat];

            const result = await chatManager.toggleChatPin('chat-1');

            expect(result.pinned).toBe(true);
            expect(mockStorage.saveChat).toHaveBeenCalled();
        });

        it('should unpin a pinned chat', async () => {
            const chat = new Chat({ id: 'chat-1', title: 'Test' });
            chat.pinned = true;
            chatManager.chats = [chat];

            const result = await chatManager.toggleChatPin('chat-1');

            expect(result.pinned).toBe(false);
        });

        it('should update timestamp when toggling pin', async () => {
            const chat = new Chat({ id: 'chat-1', title: 'Test' });
            const originalTimestamp = chat.updatedAt;
            chatManager.chats = [chat];

            // Wait a tiny bit to ensure timestamp changes
            await new Promise(resolve => setTimeout(resolve, 10));
            await chatManager.toggleChatPin('chat-1');

            expect(chat.updatedAt).not.toBe(originalTimestamp);
        });

        it('should return null for non-existent chat', async () => {
            chatManager.chats = [];

            const result = await chatManager.toggleChatPin('non-existent');

            expect(result).toBeNull();
        });

        it('should sort chats with pinned first', async () => {
            const chat1 = new Chat({ id: 'chat-1', title: 'Unpinned' });
            const chat2 = new Chat({ id: 'chat-2', title: 'To Pin' });
            chat1.pinned = false;
            chat2.pinned = false;
            chatManager.chats = [chat1, chat2];

            await chatManager.toggleChatPin('chat-2');

            expect(chatManager.chats[0].id).toBe('chat-2');
        });
    });

    // ============================================
    // ARCHIVE/UNARCHIVE CHAT TESTS
    // ============================================
    describe('toggleChatArchive', () => {
        it('should archive an unarchived chat', async () => {
            const chat = new Chat({ id: 'chat-1', title: 'Test', archived: false });
            chatManager.chats = [chat];

            const result = await chatManager.toggleChatArchive('chat-1');

            expect(result.archived).toBe(true);
            expect(mockStorage.saveChat).toHaveBeenCalled();
        });

        it('should unarchive an archived chat', async () => {
            const chat = new Chat({ id: 'chat-1', title: 'Test' });
            chat.archived = true;
            chatManager.chats = [chat];

            const result = await chatManager.toggleChatArchive('chat-1');

            expect(result.archived).toBe(false);
        });

        it('should update timestamp when toggling archive', async () => {
            const chat = new Chat({ id: 'chat-1', title: 'Test' });
            const originalTimestamp = chat.updatedAt;
            chatManager.chats = [chat];

            await new Promise(resolve => setTimeout(resolve, 10));
            await chatManager.toggleChatArchive('chat-1');

            expect(chat.updatedAt).not.toBe(originalTimestamp);
        });

        it('should return null for non-existent chat', async () => {
            chatManager.chats = [];

            const result = await chatManager.toggleChatArchive('non-existent');

            expect(result).toBeNull();
        });
    });

    // ============================================
    // GET ACTIVE/ARCHIVED CHATS TESTS
    // ============================================
    describe('getActiveChats', () => {
        it('should return only non-archived chats', () => {
            const chat1 = new Chat({ id: 'chat-1', title: 'Active 1' });
            const chat2 = new Chat({ id: 'chat-2', title: 'Archived' });
            const chat3 = new Chat({ id: 'chat-3', title: 'Active 2' });
            chat2.archived = true;
            chatManager.chats = [chat1, chat2, chat3];

            const activeChats = chatManager.getActiveChats();

            expect(activeChats).toHaveLength(2);
            expect(activeChats.find(c => c.id === 'chat-2')).toBeUndefined();
        });

        it('should return empty array when all chats are archived', () => {
            const chat1 = new Chat({ id: 'chat-1', title: 'Archived 1' });
            const chat2 = new Chat({ id: 'chat-2', title: 'Archived 2' });
            chat1.archived = true;
            chat2.archived = true;
            chatManager.chats = [chat1, chat2];

            const activeChats = chatManager.getActiveChats();

            expect(activeChats).toHaveLength(0);
        });
    });

    describe('getArchivedChats', () => {
        it('should return only archived chats', () => {
            const chat1 = new Chat({ id: 'chat-1', title: 'Active' });
            const chat2 = new Chat({ id: 'chat-2', title: 'Archived 1' });
            const chat3 = new Chat({ id: 'chat-3', title: 'Archived 2' });
            chat2.archived = true;
            chat3.archived = true;
            chatManager.chats = [chat1, chat2, chat3];

            const archivedChats = chatManager.getArchivedChats();

            expect(archivedChats).toHaveLength(2);
            expect(archivedChats.find(c => c.id === 'chat-1')).toBeUndefined();
        });
    });

    // ============================================
    // SORT CHATS TESTS
    // ============================================
    describe('sortChats', () => {
        it('should sort pinned chats before unpinned', () => {
            const chat1 = new Chat({ id: 'chat-1', title: 'Unpinned' });
            const chat2 = new Chat({ id: 'chat-2', title: 'Pinned' });
            chat2.pinned = true;
            chatManager.chats = [chat1, chat2];

            chatManager.sortChats();

            expect(chatManager.chats[0].id).toBe('chat-2');
            expect(chatManager.chats[1].id).toBe('chat-1');
        });

        it('should sort by updatedAt within same pin status', () => {
            const chat1 = new Chat({ id: 'chat-1', title: 'Older' });
            const chat2 = new Chat({ id: 'chat-2', title: 'Newer' });
            chat1.updatedAt = '2024-01-01T00:00:00Z';
            chat2.updatedAt = '2024-01-02T00:00:00Z';
            chatManager.chats = [chat1, chat2];

            chatManager.sortChats();

            expect(chatManager.chats[0].id).toBe('chat-2'); // Newer first
            expect(chatManager.chats[1].id).toBe('chat-1');
        });

        it('should maintain pinned before unpinned even with older dates', () => {
            const pinnedOld = new Chat({ id: 'pinned-old', title: 'Pinned Old' });
            const unpinnedNew = new Chat({ id: 'unpinned-new', title: 'Unpinned New' });
            pinnedOld.pinned = true;
            pinnedOld.updatedAt = '2024-01-01T00:00:00Z';
            unpinnedNew.updatedAt = '2024-12-31T00:00:00Z';
            chatManager.chats = [unpinnedNew, pinnedOld];

            chatManager.sortChats();

            expect(chatManager.chats[0].id).toBe('pinned-old');
            expect(chatManager.chats[1].id).toBe('unpinned-new');
        });
    });
});
