import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChatManager } from '../../js/modules/chat-manager.js';
import { Chat } from '../../js/modules/chat.js';
import { Message } from '../../js/modules/message.js';

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
    getProvider: vi.fn().mockResolvedValue(null),
    getAllProviders: vi.fn().mockResolvedValue([]),
    getEnabledProviders: vi.fn().mockResolvedValue([]),
    saveProvider: vi.fn().mockResolvedValue(undefined),
    deleteProvider: vi.fn().mockResolvedValue(undefined),
    saveActiveProvider: vi.fn().mockResolvedValue(undefined),
    initializeDefaultProviders: vi.fn().mockResolvedValue([])
});

describe('ChatManager', () => {
    let chatManager;
    let mockStorage;
    let mockProviderStorage;

    beforeEach(() => {
        mockStorage = createMockStorage();
        mockProviderStorage = createMockProviderStorage();
        chatManager = new ChatManager(mockStorage, mockProviderStorage);
    });

    describe('constructor', () => {
        it('should initialize with default values', () => {
            expect(chatManager.storage).toBe(mockStorage);
            expect(chatManager.providerStorage).toBe(mockProviderStorage);
            expect(chatManager.chats).toEqual([]);
            expect(chatManager.currentChatId).toBeNull();
            expect(chatManager.currentProjectId).toBeNull();
            expect(chatManager.selectedAgent).toBeNull();
        });
    });

    describe('init', () => {
        it('should initialize storage and load chats', async () => {
            const existingChats = [
                new Chat({ id: 'chat-1', title: 'Chat 1' }),
                new Chat({ id: 'chat-2', title: 'Chat 2' })
            ];
            mockStorage.getAllChats.mockResolvedValue(existingChats);
            mockStorage.getCurrentChatId.mockResolvedValue('chat-1');
            mockStorage.getCurrentProjectId.mockResolvedValue('project-1');

            await chatManager.init();

            expect(mockStorage.init).toHaveBeenCalled();
            expect(mockProviderStorage.init).toHaveBeenCalled();
            expect(chatManager.chats).toEqual(existingChats);
            expect(chatManager.currentChatId).toBe('chat-1');
            expect(chatManager.currentProjectId).toBe('project-1');
        });

        it('should return the chat manager instance', async () => {
            const result = await chatManager.init();

            expect(result).toBe(chatManager);
        });
    });

    describe('loadChats', () => {
        it('should load all chats from storage', async () => {
            const chats = [
                new Chat({ id: 'chat-1', title: 'Chat 1' }),
                new Chat({ id: 'chat-2', title: 'Chat 2' })
            ];
            mockStorage.getAllChats.mockResolvedValue(chats);

            const result = await chatManager.loadChats();

            expect(result).toEqual(chats);
            expect(chatManager.chats).toEqual(chats);
        });
    });

    describe('getChat', () => {
        beforeEach(async () => {
            chatManager.chats = [
                new Chat({ id: 'chat-1', title: 'Chat 1' }),
                new Chat({ id: 'chat-2', title: 'Chat 2' })
            ];
        });

        it('should return chat by ID', () => {
            const chat = chatManager.getChat('chat-1');

            expect(chat).toBeDefined();
            expect(chat.id).toBe('chat-1');
        });

        it('should return undefined for non-existent ID', () => {
            const chat = chatManager.getChat('non-existent');

            expect(chat).toBeUndefined();
        });

        it('should return null for null ID', () => {
            const chat = chatManager.getChat(null);

            expect(chat).toBeNull();
        });
    });

    describe('getCurrentChat', () => {
        beforeEach(() => {
            chatManager.chats = [
                new Chat({ id: 'chat-1', title: 'Chat 1' }),
                new Chat({ id: 'chat-2', title: 'Chat 2' })
            ];
        });

        it('should return current chat when ID is set', () => {
            chatManager.currentChatId = 'chat-2';

            const chat = chatManager.getCurrentChat();

            expect(chat.id).toBe('chat-2');
        });

        it('should return null when no current chat is set', () => {
            chatManager.currentChatId = null;

            const chat = chatManager.getCurrentChat();

            expect(chat).toBeNull();
        });
    });

    describe('getChats', () => {
        it('should return all chats', () => {
            const chats = [
                new Chat({ id: 'chat-1' }),
                new Chat({ id: 'chat-2' })
            ];
            chatManager.chats = chats;

            expect(chatManager.getChats()).toBe(chats);
        });
    });

    describe('getChatsByProject', () => {
        beforeEach(() => {
            chatManager.chats = [
                new Chat({ id: 'chat-1', projectId: 'project-1' }),
                new Chat({ id: 'chat-2', projectId: 'project-1' }),
                new Chat({ id: 'chat-3', projectId: 'project-2' }),
                new Chat({ id: 'chat-4', projectId: null })
            ];
        });

        it('should return chats for specific project', () => {
            const chats = chatManager.getChatsByProject('project-1');

            expect(chats).toHaveLength(2);
            expect(chats.every(c => c.projectId === 'project-1')).toBe(true);
        });

        it('should return chats without project when projectId is null', () => {
            const chats = chatManager.getChatsByProject(null);

            expect(chats).toHaveLength(1);
            expect(chats[0].id).toBe('chat-4');
        });

        it('should return empty array for non-existent project', () => {
            const chats = chatManager.getChatsByProject('non-existent');

            expect(chats).toEqual([]);
        });
    });

    describe('createChat', () => {
        it('should create a new chat with defaults', async () => {
            const chat = await chatManager.createChat();

            expect(chat).toBeInstanceOf(Chat);
            expect(chat.title).toBe('New Chat');
            expect(mockStorage.saveChat).toHaveBeenCalledWith(chat);
            expect(mockStorage.saveCurrentChatId).toHaveBeenCalledWith(chat.id);
        });

        it('should create chat with custom config', async () => {
            const chat = await chatManager.createChat({ title: 'Custom Chat' });

            expect(chat.title).toBe('Custom Chat');
        });

        it('should add chat to beginning of chats array', async () => {
            chatManager.chats = [new Chat({ id: 'existing' })];

            const newChat = await chatManager.createChat();

            expect(chatManager.chats[0]).toBe(newChat);
            expect(chatManager.chats).toHaveLength(2);
        });

        it('should use active provider as default if not specified', async () => {
            mockProviderStorage.getActiveProvider.mockResolvedValue('provider-1');
            mockProviderStorage.getProvider.mockResolvedValue({
                id: 'provider-1',
                defaultModel: 'model-1'
            });

            const chat = await chatManager.createChat();

            expect(chat.defaultProviderId).toBe('provider-1');
            expect(chat.defaultModelId).toBe('model-1');
        });

        it('should apply current project ID to new chat', async () => {
            chatManager.currentProjectId = 'project-123';

            const chat = await chatManager.createChat();

            expect(chat.projectId).toBe('project-123');
        });

        it('should set created chat as current', async () => {
            const chat = await chatManager.createChat();

            expect(chatManager.currentChatId).toBe(chat.id);
        });
    });

    describe('deleteChat', () => {
        beforeEach(() => {
            chatManager.chats = [
                new Chat({ id: 'chat-1' }),
                new Chat({ id: 'chat-2' }),
                new Chat({ id: 'chat-3' })
            ];
        });

        it('should delete chat and return true', async () => {
            const result = await chatManager.deleteChat('chat-2');

            expect(result).toBe(true);
            expect(chatManager.chats).toHaveLength(2);
            expect(chatManager.chats.find(c => c.id === 'chat-2')).toBeUndefined();
            expect(mockStorage.deleteChat).toHaveBeenCalledWith('chat-2');
        });

        it('should return false for non-existent chat', async () => {
            const result = await chatManager.deleteChat('non-existent');

            expect(result).toBe(false);
        });

        it('should switch to another chat when deleting current', async () => {
            chatManager.currentChatId = 'chat-1';

            await chatManager.deleteChat('chat-1');

            expect(chatManager.currentChatId).toBe('chat-2');
            expect(mockStorage.saveCurrentChatId).toHaveBeenCalledWith('chat-2');
        });

        it('should set currentChatId to null when deleting last chat', async () => {
            chatManager.chats = [new Chat({ id: 'only-chat' })];
            chatManager.currentChatId = 'only-chat';

            await chatManager.deleteChat('only-chat');

            expect(chatManager.currentChatId).toBeNull();
            expect(mockStorage.saveCurrentChatId).toHaveBeenCalledWith(null);
        });
    });

    describe('deleteChats', () => {
        beforeEach(() => {
            chatManager.chats = [
                new Chat({ id: 'chat-1' }),
                new Chat({ id: 'chat-2' }),
                new Chat({ id: 'chat-3' })
            ];
        });

        it('should delete multiple chats', async () => {
            await chatManager.deleteChats(['chat-1', 'chat-3']);

            expect(chatManager.chats).toHaveLength(1);
            expect(chatManager.chats[0].id).toBe('chat-2');
            expect(mockStorage.deleteChats).toHaveBeenCalledWith(['chat-1', 'chat-3']);
        });

        it('should handle deleting current chat', async () => {
            chatManager.currentChatId = 'chat-2';

            await chatManager.deleteChats(['chat-2']);

            expect(chatManager.currentChatId).toBe('chat-1');
        });
    });

    describe('clearAllChats', () => {
        it('should clear all chats', async () => {
            chatManager.chats = [new Chat({ id: 'chat-1' })];
            chatManager.currentChatId = 'chat-1';

            await chatManager.clearAllChats();

            expect(chatManager.chats).toEqual([]);
            expect(chatManager.currentChatId).toBeNull();
            expect(mockStorage.clearAllChats).toHaveBeenCalled();
            expect(mockStorage.saveCurrentChatId).toHaveBeenCalledWith(null);
        });
    });

    describe('saveChats', () => {
        it('should save all chats to storage', async () => {
            chatManager.chats = [
                new Chat({ id: 'chat-1' }),
                new Chat({ id: 'chat-2' })
            ];

            await chatManager.saveChats();

            expect(mockStorage.saveChats).toHaveBeenCalledWith(chatManager.chats);
        });
    });

    describe('saveChat', () => {
        it('should save a single chat to storage', async () => {
            const chat = new Chat({ id: 'chat-1' });

            await chatManager.saveChat(chat);

            expect(mockStorage.saveChat).toHaveBeenCalledWith(chat);
        });
    });

    describe('loadChat', () => {
        beforeEach(() => {
            chatManager.chats = [
                new Chat({ id: 'chat-1', title: 'Chat 1' }),
                new Chat({ id: 'chat-2', title: 'Chat 2' })
            ];
        });

        it('should load and set chat as current', async () => {
            const chat = await chatManager.loadChat('chat-2');

            expect(chat.id).toBe('chat-2');
            expect(chatManager.currentChatId).toBe('chat-2');
            expect(mockStorage.saveCurrentChatId).toHaveBeenCalledWith('chat-2');
        });

        it('should throw error for non-existent chat', async () => {
            await expect(chatManager.loadChat('non-existent'))
                .rejects.toThrow('Chat not found: non-existent');
        });
    });

    describe('setCurrentChat', () => {
        it('should set current chat ID and persist', async () => {
            await chatManager.setCurrentChat('chat-123');

            expect(chatManager.currentChatId).toBe('chat-123');
            expect(mockStorage.saveCurrentChatId).toHaveBeenCalledWith('chat-123');
        });
    });

    describe('setCurrentProject', () => {
        it('should set current project ID and persist', async () => {
            await chatManager.setCurrentProject('project-123');

            expect(chatManager.currentProjectId).toBe('project-123');
            expect(mockStorage.saveCurrentProjectId).toHaveBeenCalledWith('project-123');
        });
    });

    describe('exitProject', () => {
        it('should clear current project ID', async () => {
            chatManager.currentProjectId = 'project-123';

            await chatManager.exitProject();

            expect(chatManager.currentProjectId).toBeNull();
            expect(mockStorage.saveCurrentProjectId).toHaveBeenCalledWith(null);
        });
    });

    describe('generateAutoTitle', () => {
        beforeEach(() => {
            const chat = new Chat({ id: 'chat-1', title: 'New Chat' });
            chat.addMessage({ role: 'user', content: 'Hello, how are you?' });
            chatManager.chats = [chat];
        });

        it('should generate title from first user message', async () => {
            await chatManager.generateAutoTitle('chat-1');

            expect(chatManager.chats[0].title).toBe('Hello, how are you?');
            expect(mockStorage.saveChat).toHaveBeenCalled();
        });

        it('should do nothing for non-existent chat', async () => {
            await chatManager.generateAutoTitle('non-existent');

            expect(mockStorage.saveChat).not.toHaveBeenCalled();
        });
    });

    describe('updateChatTitle', () => {
        beforeEach(() => {
            chatManager.chats = [new Chat({ id: 'chat-1', title: 'Old Title' })];
        });

        it('should update chat title', async () => {
            await chatManager.updateChatTitle('chat-1', 'New Title');

            expect(chatManager.chats[0].title).toBe('New Title');
            expect(mockStorage.saveChat).toHaveBeenCalled();
        });

        it('should do nothing for non-existent chat', async () => {
            await chatManager.updateChatTitle('non-existent', 'Title');

            expect(mockStorage.saveChat).not.toHaveBeenCalled();
        });
    });

    describe('updateChatProvider', () => {
        beforeEach(() => {
            chatManager.chats = [new Chat({ id: 'chat-1' })];
        });

        it('should update chat provider and model', async () => {
            await chatManager.updateChatProvider('chat-1', 'provider-1', 'model-1');

            expect(chatManager.chats[0].defaultProviderId).toBe('provider-1');
            expect(chatManager.chats[0].defaultModelId).toBe('model-1');
            expect(mockStorage.saveChat).toHaveBeenCalled();
        });
    });

    describe('toggleArchive', () => {
        beforeEach(() => {
            chatManager.chats = [new Chat({ id: 'chat-1', archived: false })];
        });

        it('should toggle archived state', async () => {
            await chatManager.toggleArchive('chat-1');
            expect(chatManager.chats[0].archived).toBe(true);

            await chatManager.toggleArchive('chat-1');
            expect(chatManager.chats[0].archived).toBe(false);
        });
    });

    describe('togglePin', () => {
        beforeEach(() => {
            chatManager.chats = [new Chat({ id: 'chat-1', pinned: false })];
        });

        it('should toggle pinned state', async () => {
            await chatManager.togglePin('chat-1');
            expect(chatManager.chats[0].pinned).toBe(true);

            await chatManager.togglePin('chat-1');
            expect(chatManager.chats[0].pinned).toBe(false);
        });
    });

    describe('clearChatMessages', () => {
        beforeEach(() => {
            const chat = new Chat({ id: 'chat-1' });
            chat.addMessage({ role: 'user', content: 'Hello' });
            chatManager.chats = [chat];
        });

        it('should clear all messages from chat', async () => {
            await chatManager.clearChatMessages('chat-1');

            expect(chatManager.chats[0].messages).toEqual([]);
            expect(mockStorage.saveChat).toHaveBeenCalled();
        });
    });

    describe('addMessage', () => {
        beforeEach(() => {
            chatManager.chats = [new Chat({ id: 'chat-1' })];
        });

        it('should add message to chat', async () => {
            const message = { role: 'user', content: 'Hello' };

            const result = await chatManager.addMessage('chat-1', message);

            expect(result).toBeInstanceOf(Message);
            expect(chatManager.chats[0].messages).toHaveLength(1);
            expect(mockStorage.saveChat).toHaveBeenCalled();
        });

        it('should auto-generate title on first message', async () => {
            const message = { role: 'user', content: 'My first message' };

            await chatManager.addMessage('chat-1', message);

            expect(chatManager.chats[0].title).toBe('My first message');
        });

        it('should return null for non-existent chat', async () => {
            const result = await chatManager.addMessage('non-existent', { role: 'user', content: 'Hello' });

            expect(result).toBeNull();
        });
    });

    describe('deleteMessage', () => {
        let chat;

        beforeEach(() => {
            chat = new Chat({ id: 'chat-1' });
            chat.addMessage({ role: 'user', content: 'Message 1' });
            chat.addMessage({ role: 'assistant', content: 'Message 2' });
            chatManager.chats = [chat];
        });

        it('should delete message from chat', async () => {
            const messageId = chat.messages[0].id;

            const result = await chatManager.deleteMessage('chat-1', messageId);

            expect(result).toBe(true);
            expect(chat.messages).toHaveLength(1);
            expect(mockStorage.saveChat).toHaveBeenCalled();
        });

        it('should return false for non-existent message', async () => {
            const result = await chatManager.deleteMessage('chat-1', 'non-existent');

            expect(result).toBe(false);
        });

        it('should return false for non-existent chat', async () => {
            const result = await chatManager.deleteMessage('non-existent', 'msg-id');

            expect(result).toBe(false);
        });
    });

    describe('sendToAI', () => {
        let chat;
        let mockProvider;

        beforeEach(() => {
            chat = new Chat({ id: 'chat-1' });
            chat.addMessage({ role: 'user', content: 'Hello' });
            chatManager.chats = [chat];
            chatManager.currentChatId = 'chat-1';

            mockProvider = {
                id: 'provider-1',
                name: 'Test Provider',
                enabled: true,
                defaultModel: 'model-1',
                models: [{ id: 'model-1', name: 'Model 1' }],
                sendRequest: vi.fn().mockResolvedValue('AI Response')
            };

            mockProviderStorage.getActiveProvider.mockResolvedValue('provider-1');
            mockProviderStorage.getProvider.mockResolvedValue(mockProvider);
        });

        it('should send message to AI and return response', async () => {
            const result = await chatManager.sendToAI('Hello');

            expect(result.content).toBe('AI Response');
            expect(result.providerId).toBe('provider-1');
            expect(result.providerName).toBe('Test Provider');
            expect(result.modelId).toBe('model-1');
            expect(result.modelName).toBe('Model 1');
        });

        it('should throw error when no active chat', async () => {
            chatManager.currentChatId = null;

            await expect(chatManager.sendToAI('Hello'))
                .rejects.toThrow('No active chat');
        });

        it('should throw error when no provider configured', async () => {
            mockProviderStorage.getActiveProvider.mockResolvedValue(null);

            await expect(chatManager.sendToAI('Hello'))
                .rejects.toThrow('No AI provider configured');
        });

        it('should throw error when provider not found', async () => {
            mockProviderStorage.getProvider.mockResolvedValue(null);

            await expect(chatManager.sendToAI('Hello'))
                .rejects.toThrow('Provider not found');
        });

        it('should throw error when provider is disabled', async () => {
            mockProvider.enabled = false;

            await expect(chatManager.sendToAI('Hello'))
                .rejects.toThrow('Provider Test Provider is disabled');
        });

        it('should use chat default provider if set', async () => {
            chat.defaultProviderId = 'provider-2';
            chat.defaultModelId = 'model-2';
            const provider2 = {
                ...mockProvider,
                id: 'provider-2',
                defaultModel: 'model-2',
                models: [{ id: 'model-2', name: 'Model 2' }]
            };
            mockProviderStorage.getProvider.mockResolvedValue(provider2);

            await chatManager.sendToAI('Hello');

            expect(mockProviderStorage.getProvider).toHaveBeenCalledWith('provider-2');
        });

        it('should use provided provider and model over defaults', async () => {
            await chatManager.sendToAI('Hello', 'override-provider', 'override-model');

            expect(mockProviderStorage.getProvider).toHaveBeenCalledWith('override-provider');
        });
    });

    describe('exportChat', () => {
        it('should export chat data', async () => {
            const chat = new Chat({ id: 'chat-1', title: 'Test Chat' });
            chat.addMessage({ role: 'user', content: 'Hello' });
            chatManager.chats = [chat];

            const result = await chatManager.exportChat('chat-1');

            expect(result.title).toBe('Test Chat');
            expect(result.messages).toHaveLength(1);
        });

        it('should return null for non-existent chat', async () => {
            const result = await chatManager.exportChat('non-existent');

            expect(result).toBeNull();
        });
    });

    describe('exportAllChats', () => {
        it('should call storage exportChats', async () => {
            const exported = [{ id: 'chat-1' }];
            mockStorage.exportChats.mockResolvedValue(exported);

            const result = await chatManager.exportAllChats();

            expect(result).toEqual(exported);
            expect(mockStorage.exportChats).toHaveBeenCalled();
        });
    });

    describe('importChats', () => {
        it('should import chats and reload', async () => {
            const chatsData = [{ id: 'imported-1' }];
            const importedChats = [new Chat({ id: 'imported-1' })];
            mockStorage.importChats.mockResolvedValue(importedChats);
            mockStorage.getAllChats.mockResolvedValue(importedChats);

            const result = await chatManager.importChats(chatsData);

            expect(result).toEqual(importedChats);
            expect(mockStorage.importChats).toHaveBeenCalledWith(chatsData);
            expect(mockStorage.getAllChats).toHaveBeenCalled();
        });
    });

    describe('getStats', () => {
        it('should return chat statistics', async () => {
            const stats = { total: 5, archived: 2 };
            mockStorage.getChatStats.mockResolvedValue(stats);

            const result = await chatManager.getStats();

            expect(result).toEqual(stats);
        });
    });

    describe('searchChats', () => {
        beforeEach(() => {
            const chat1 = new Chat({ id: 'chat-1', title: 'JavaScript Tutorial' });
            chat1.addMessage({ role: 'user', content: 'How to use promises?' });

            const chat2 = new Chat({ id: 'chat-2', title: 'Python Basics' });
            chat2.addMessage({ role: 'user', content: 'What is a list?' });

            const chat3 = new Chat({ id: 'chat-3', title: 'Random Chat' });
            chat3.addMessage({ role: 'user', content: 'Hello javascript' });

            chatManager.chats = [chat1, chat2, chat3];
        });

        it('should find chats by title', () => {
            const results = chatManager.searchChats('javascript');

            expect(results).toHaveLength(2);
            expect(results.some(c => c.id === 'chat-1')).toBe(true);
            expect(results.some(c => c.id === 'chat-3')).toBe(true);
        });

        it('should find chats by message content', () => {
            const results = chatManager.searchChats('promises');

            expect(results).toHaveLength(1);
            expect(results[0].id).toBe('chat-1');
        });

        it('should be case insensitive', () => {
            const results = chatManager.searchChats('PYTHON');

            expect(results).toHaveLength(1);
            expect(results[0].id).toBe('chat-2');
        });

        it('should return empty array for no matches', () => {
            const results = chatManager.searchChats('nonexistent');

            expect(results).toEqual([]);
        });
    });

    describe('getPinnedChats', () => {
        beforeEach(() => {
            chatManager.chats = [
                new Chat({ id: 'chat-1', pinned: true }),
                new Chat({ id: 'chat-2', pinned: false }),
                new Chat({ id: 'chat-3', pinned: true })
            ];
        });

        it('should return only pinned chats', () => {
            const pinned = chatManager.getPinnedChats();

            expect(pinned).toHaveLength(2);
            expect(pinned.every(c => c.pinned)).toBe(true);
        });
    });

    describe('getArchivedChats', () => {
        beforeEach(() => {
            chatManager.chats = [
                new Chat({ id: 'chat-1', archived: true }),
                new Chat({ id: 'chat-2', archived: false }),
                new Chat({ id: 'chat-3', archived: true })
            ];
        });

        it('should return only archived chats', () => {
            const archived = chatManager.getArchivedChats();

            expect(archived).toHaveLength(2);
            expect(archived.every(c => c.archived)).toBe(true);
        });
    });

    describe('getActiveChats', () => {
        beforeEach(() => {
            chatManager.chats = [
                new Chat({ id: 'chat-1', archived: false }),
                new Chat({ id: 'chat-2', archived: true }),
                new Chat({ id: 'chat-3', archived: false })
            ];
        });

        it('should return only non-archived chats', () => {
            const active = chatManager.getActiveChats();

            expect(active).toHaveLength(2);
            expect(active.every(c => !c.archived)).toBe(true);
        });
    });

    describe('edge cases', () => {
        it('should handle empty chats array gracefully', () => {
            chatManager.chats = [];

            expect(chatManager.getChats()).toEqual([]);
            expect(chatManager.getPinnedChats()).toEqual([]);
            expect(chatManager.getArchivedChats()).toEqual([]);
            expect(chatManager.getActiveChats()).toEqual([]);
            expect(chatManager.searchChats('test')).toEqual([]);
        });

        it('should handle concurrent operations', async () => {
            const promises = [
                chatManager.createChat({ title: 'Chat 1' }),
                chatManager.createChat({ title: 'Chat 2' }),
                chatManager.createChat({ title: 'Chat 3' })
            ];

            const chats = await Promise.all(promises);

            expect(chats).toHaveLength(3);
            expect(chatManager.chats.length).toBeGreaterThanOrEqual(3);
        });
    });
});
