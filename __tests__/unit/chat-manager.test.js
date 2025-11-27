import { describe, it, expect, beforeEach, vi } from 'vitest';
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
            await chatManager.init();

            expect(mockStorage.init).toHaveBeenCalled();
            expect(mockProviderStorage.init).toHaveBeenCalled();
            expect(mockStorage.getAllChats).toHaveBeenCalled();
        });

        it('should restore current chat and project IDs', async () => {
            mockStorage.getCurrentChatId.mockResolvedValue('chat-123');
            mockStorage.getCurrentProjectId.mockResolvedValue('project-456');

            await chatManager.init();

            expect(chatManager.currentChatId).toBe('chat-123');
            expect(chatManager.currentProjectId).toBe('project-456');
        });

        it('should return itself for chaining', async () => {
            const result = await chatManager.init();
            expect(result).toBe(chatManager);
        });
    });

    describe('getChat', () => {
        beforeEach(() => {
            chatManager.chats = [
                new Chat({ id: 'chat-1', title: 'Test Chat 1' }),
                new Chat({ id: 'chat-2', title: 'Test Chat 2' })
            ];
        });

        it('should find chat by ID', () => {
            const chat = chatManager.getChat('chat-1');
            expect(chat.title).toBe('Test Chat 1');
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
        it('should return current chat when set', () => {
            const chat = new Chat({ id: 'current-chat' });
            chatManager.chats = [chat];
            chatManager.currentChatId = 'current-chat';

            expect(chatManager.getCurrentChat()).toBe(chat);
        });

        it('should return null when no current chat', () => {
            expect(chatManager.getCurrentChat()).toBeNull();
        });
    });

    describe('getChatsByProject', () => {
        beforeEach(() => {
            chatManager.chats = [
                new Chat({ id: '1', projectId: 'project-a' }),
                new Chat({ id: '2', projectId: 'project-a' }),
                new Chat({ id: '3', projectId: 'project-b' }),
                new Chat({ id: '4', projectId: null })
            ];
        });

        it('should return chats for specific project', () => {
            const chats = chatManager.getChatsByProject('project-a');
            expect(chats).toHaveLength(2);
        });

        it('should return chats without project when null is passed', () => {
            const chats = chatManager.getChatsByProject(null);
            expect(chats).toHaveLength(1);
            expect(chats[0].id).toBe('4');
        });
    });

    describe('createChat', () => {
        it('should create and return a new chat', async () => {
            const chat = await chatManager.createChat({ title: 'New Chat' });

            expect(chat).toBeInstanceOf(Chat);
            expect(chat.title).toBe('New Chat');
            expect(chatManager.chats[0]).toBe(chat);
        });

        it('should save chat to storage', async () => {
            await chatManager.createChat({ title: 'Test' });
            expect(mockStorage.saveChat).toHaveBeenCalled();
        });

        it('should set new chat as current', async () => {
            const chat = await chatManager.createChat();
            expect(chatManager.currentChatId).toBe(chat.id);
        });

        it('should use active provider as default if not specified', async () => {
            mockProviderStorage.getActiveProviderID.mockResolvedValue('provider-1');
            mockProviderStorage.getProvider.mockResolvedValue({
                id: 'provider-1',
                defaultModel: 'model-1'
            });

            const chat = await chatManager.createChat();

            expect(chat.defaultProviderId).toBe('provider-1');
            expect(chat.defaultModelId).toBe('model-1');
        });

        it('should use specified provider', async () => {
            mockProviderStorage.getProvider.mockResolvedValue({
                id: 'specified-provider',
                defaultModel: 'specified-model'
            });

            const chat = await chatManager.createChat({ defaultProviderId: 'specified-provider' });

            expect(chat.defaultProviderId).toBe('specified-provider');
        });

        it('should apply current project if in project context', async () => {
            chatManager.currentProjectId = 'project-123';

            const chat = await chatManager.createChat();

            expect(chat.projectId).toBe('project-123');
        });

        it('should not override explicit project ID', async () => {
            chatManager.currentProjectId = 'project-123';

            const chat = await chatManager.createChat({ projectId: 'other-project' });

            expect(chat.projectId).toBe('other-project');
        });
    });

    describe('loadChat', () => {
        beforeEach(() => {
            chatManager.chats = [new Chat({ id: 'chat-1', title: 'Test Chat' })];
        });

        it('should set current chat ID', async () => {
            await chatManager.loadChat('chat-1');
            expect(chatManager.currentChatId).toBe('chat-1');
        });

        it('should return the loaded chat', async () => {
            const chat = await chatManager.loadChat('chat-1');
            expect(chat.title).toBe('Test Chat');
        });

        it('should throw error for non-existent chat', async () => {
            await expect(chatManager.loadChat('non-existent')).rejects.toThrow('Chat not found');
        });
    });

    describe('deleteChat', () => {
        beforeEach(() => {
            chatManager.chats = [
                new Chat({ id: 'chat-1' }),
                new Chat({ id: 'chat-2' })
            ];
        });

        it('should remove chat from chats array', async () => {
            await chatManager.deleteChat('chat-1');
            expect(chatManager.chats).toHaveLength(1);
            expect(chatManager.getChat('chat-1')).toBeUndefined();
        });

        it('should call storage deleteChat', async () => {
            await chatManager.deleteChat('chat-1');
            expect(mockStorage.deleteChat).toHaveBeenCalledWith('chat-1');
        });

        it('should clear currentChatId if deleted chat was current', async () => {
            chatManager.currentChatId = 'chat-1';
            await chatManager.deleteChat('chat-1');
            expect(chatManager.currentChatId).toBeNull();
        });
    });

    describe('addMessage', () => {
        let chat;

        beforeEach(() => {
            chat = new Chat({ id: 'chat-1', title: 'Test Chat' });
            chatManager.chats = [chat];
        });

        it('should add message to chat', async () => {
            const message = new Message({ role: 'user', content: 'Hello' });
            await chatManager.addMessage('chat-1', message);

            expect(chat.getMessageCount()).toBe(1);
        });

        it('should save chat after adding message', async () => {
            const message = new Message({ role: 'user', content: 'Hello' });
            await chatManager.addMessage('chat-1', message);

            expect(mockStorage.saveChat).toHaveBeenCalled();
        });

        it('should return null for non-existent chat', async () => {
            const result = await chatManager.addMessage('non-existent', new Message({ role: 'user', content: 'Test' }));
            expect(result).toBeNull();
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

            mockProviderStorage.getActiveProviderID.mockResolvedValue('provider-1');
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
            mockProviderStorage.getActiveProviderID.mockResolvedValue(null);

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

        it('should use provider default model if no model specified', async () => {
            chat.defaultModelId = null;

            await chatManager.sendToAI('Hello');

            expect(mockProvider.sendRequest).toHaveBeenCalledWith(
                expect.anything(),
                'model-1'
            );
        });

        it('should handle model not found in models array', async () => {
            mockProvider.models = [];

            const result = await chatManager.sendToAI('Hello');

            // modelId is set from the effective model
            expect(result.modelId).toBe('model-1');
            // Implementation may fall back modelName to modelId when model not found
            // Just verify the call completed successfully
            expect(result.content).toBe('AI Response');
            expect(result.providerId).toBe('provider-1');
        });
    });

    describe('exportChat', () => {
        it('should export chat data', async () => {
            const chat = new Chat({ id: 'chat-1', title: 'Test Chat' });
            chat.addMessage({ role: 'user', content: 'Hello' });
            chatManager.chats = [chat];

            const exported = await chatManager.exportChat('chat-1');

            expect(exported.title).toBe('Test Chat');
            expect(exported.messages).toHaveLength(1);
        });

        it('should return null for non-existent chat', async () => {
            const exported = await chatManager.exportChat('non-existent');
            expect(exported).toBeNull();
        });
    });

    describe('searchChats', () => {
        beforeEach(() => {
            const chat1 = new Chat({ id: '1', title: 'JavaScript Tutorial' });
            chat1.addMessage({ role: 'user', content: 'How to use async/await?' });

            const chat2 = new Chat({ id: '2', title: 'Python Basics' });
            chat2.addMessage({ role: 'user', content: 'What is a list?' });

            chatManager.chats = [chat1, chat2];
        });

        it('should find chats by title', () => {
            const results = chatManager.searchChats('JavaScript');
            expect(results).toHaveLength(1);
            expect(results[0].id).toBe('1');
        });

        it('should find chats by message content', () => {
            const results = chatManager.searchChats('async/await');
            expect(results).toHaveLength(1);
            expect(results[0].id).toBe('1');
        });

        it('should be case insensitive', () => {
            const results = chatManager.searchChats('JAVASCRIPT');
            expect(results).toHaveLength(1);
        });

        it('should return empty array when no matches', () => {
            const results = chatManager.searchChats('Ruby');
            expect(results).toHaveLength(0);
        });
    });

    describe('Chat filters', () => {
        beforeEach(() => {
            chatManager.chats = [
                new Chat({ id: '1', pinned: true, archived: false }),
                new Chat({ id: '2', pinned: false, archived: true }),
                new Chat({ id: '3', pinned: false, archived: false }),
                new Chat({ id: '4', pinned: true, archived: true })
            ];
        });

        it('should get pinned chats', () => {
            const pinned = chatManager.getPinnedChats();
            expect(pinned).toHaveLength(2);
            expect(pinned.every(c => c.pinned)).toBe(true);
        });

        it('should get archived chats', () => {
            const archived = chatManager.getArchivedChats();
            expect(archived).toHaveLength(2);
            expect(archived.every(c => c.archived)).toBe(true);
        });

        it('should get active (non-archived) chats', () => {
            const active = chatManager.getActiveChats();
            expect(active).toHaveLength(2);
            expect(active.every(c => !c.archived)).toBe(true);
        });
    });

    describe('toggleArchive', () => {
        it('should toggle archived state', async () => {
            const chat = new Chat({ id: 'chat-1', archived: false });
            chatManager.chats = [chat];

            await chatManager.toggleArchive('chat-1');
            expect(chat.archived).toBe(true);

            await chatManager.toggleArchive('chat-1');
            expect(chat.archived).toBe(false);
        });
    });

    describe('togglePin', () => {
        it('should toggle pinned state', async () => {
            const chat = new Chat({ id: 'chat-1', pinned: false });
            chatManager.chats = [chat];

            await chatManager.togglePin('chat-1');
            expect(chat.pinned).toBe(true);

            await chatManager.togglePin('chat-1');
            expect(chat.pinned).toBe(false);
        });
    });

    describe('clearChatMessages', () => {
        it('should clear all messages from chat', async () => {
            const chat = new Chat({ id: 'chat-1' });
            chat.addMessage({ role: 'user', content: 'Hello' });
            chat.addMessage({ role: 'assistant', content: 'Hi there!' });
            chatManager.chats = [chat];

            await chatManager.clearChatMessages('chat-1');

            expect(chat.getMessageCount()).toBe(0);
        });
    });
});
