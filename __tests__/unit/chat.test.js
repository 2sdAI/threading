import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Chat } from '@/modules/chat.js';
import { Message } from '@/modules/message.js';

describe('Chat', () => {
    let chat;

    beforeEach(() => {
        chat = new Chat({
            title: 'Test Chat'
        });
    });

    describe('constructor', () => {
        it('should create a chat with default values', () => {
            const newChat = new Chat({});

            expect(newChat.id).toMatch(/^chat-\d+$/);
            expect(newChat.title).toBe('New Chat');
            expect(newChat.messages).toEqual([]);
            expect(newChat.projectId).toBeNull();
            expect(newChat.defaultProviderId).toBeNull();
            expect(newChat.defaultModelId).toBeNull();
            expect(newChat.metadata).toEqual({});
            expect(newChat.archived).toBe(false);
            expect(newChat.pinned).toBe(false);
            expect(newChat.createdAt).toBeDefined();
            expect(newChat.updatedAt).toBeDefined();
        });

        it('should create a chat with provided config', () => {
            const config = {
                id: 'custom-id',
                projectId: 'project-123',
                title: 'Custom Title',
                defaultProviderId: 'provider-1',
                defaultModelId: 'model-1',
                metadata: { key: 'value' },
                archived: true,
                pinned: true
            };

            const customChat = new Chat(config);

            expect(customChat.id).toBe('custom-id');
            expect(customChat.projectId).toBe('project-123');
            expect(customChat.title).toBe('Custom Title');
            expect(customChat.defaultProviderId).toBe('provider-1');
            expect(customChat.defaultModelId).toBe('model-1');
            expect(customChat.metadata).toEqual({ key: 'value' });
            expect(customChat.archived).toBe(true);
            expect(customChat.pinned).toBe(true);
        });

        it('should convert plain message objects to Message instances', () => {
            const chatWithMessages = new Chat({
                messages: [
                    { role: 'user', content: 'Hello' },
                    { role: 'assistant', content: 'Hi there' }
                ]
            });

            expect(chatWithMessages.messages).toHaveLength(2);
            expect(chatWithMessages.messages[0]).toBeInstanceOf(Message);
            expect(chatWithMessages.messages[1]).toBeInstanceOf(Message);
        });

        it('should preserve Message instances when provided', () => {
            const message = new Message({ role: 'user', content: 'Test' });
            const chatWithMessages = new Chat({
                messages: [message]
            });

            expect(chatWithMessages.messages[0]).toBe(message);
        });
    });

    describe('addMessage', () => {
        it('should add a Message instance to messages array', () => {
            const message = new Message({ role: 'user', content: 'Hello' });
            const result = chat.addMessage(message);

            expect(chat.messages).toHaveLength(1);
            expect(chat.messages[0]).toBe(message);
            expect(result).toBe(message);
        });

        it('should convert plain object to Message instance', () => {
            const result = chat.addMessage({ role: 'user', content: 'Hello' });

            expect(chat.messages).toHaveLength(1);
            expect(chat.messages[0]).toBeInstanceOf(Message);
            expect(chat.messages[0].content).toBe('Hello');
            expect(result).toBeInstanceOf(Message);
        });

        it('should update timestamp when adding message', () => {
            const originalTimestamp = chat.updatedAt;

            // Wait a bit to ensure different timestamp
            vi.useFakeTimers();
            vi.advanceTimersByTime(1000);

            chat.addMessage({ role: 'user', content: 'Hello' });

            expect(chat.updatedAt).not.toBe(originalTimestamp);
            vi.useRealTimers();
        });
    });

    describe('updateMessage', () => {
        beforeEach(() => {
            chat.addMessage({ role: 'user', content: 'Original content' });
        });

        it('should update an existing message by ID', () => {
            const messageId = chat.messages[0].id;
            const result = chat.updateMessage(messageId, { content: 'Updated content' });

            expect(result.content).toBe('Updated content');
            expect(chat.messages[0].content).toBe('Updated content');
        });

        it('should return undefined for non-existent message ID', () => {
            const result = chat.updateMessage('non-existent-id', { content: 'Updated' });

            expect(result).toBeUndefined();
        });

        it('should update timestamp when updating message', () => {
            vi.useFakeTimers();
            const originalTimestamp = chat.updatedAt;
            vi.advanceTimersByTime(1000);

            const messageId = chat.messages[0].id;
            chat.updateMessage(messageId, { content: 'Updated' });

            expect(chat.updatedAt).not.toBe(originalTimestamp);
            vi.useRealTimers();
        });
    });

    describe('deleteMessage', () => {
        beforeEach(() => {
            chat.addMessage({ role: 'user', content: 'Message 1' });
            chat.addMessage({ role: 'assistant', content: 'Message 2' });
        });

        it('should delete an existing message by ID', () => {
            const messageId = chat.messages[0].id;
            const result = chat.deleteMessage(messageId);

            expect(result).toBe(true);
            expect(chat.messages).toHaveLength(1);
            expect(chat.messages[0].content).toBe('Message 2');
        });

        it('should return false for non-existent message ID', () => {
            const result = chat.deleteMessage('non-existent-id');

            expect(result).toBe(false);
            expect(chat.messages).toHaveLength(2);
        });

        it('should update timestamp when deleting message', () => {
            vi.useFakeTimers();
            const originalTimestamp = chat.updatedAt;
            vi.advanceTimersByTime(1000);

            const messageId = chat.messages[0].id;
            chat.deleteMessage(messageId);

            expect(chat.updatedAt).not.toBe(originalTimestamp);
            vi.useRealTimers();
        });
    });

    describe('getLastMessage', () => {
        it('should return null for empty messages array', () => {
            expect(chat.getLastMessage()).toBeNull();
        });

        it('should return the last message', () => {
            chat.addMessage({ role: 'user', content: 'First' });
            chat.addMessage({ role: 'assistant', content: 'Second' });
            chat.addMessage({ role: 'user', content: 'Third' });

            const lastMessage = chat.getLastMessage();

            expect(lastMessage.content).toBe('Third');
        });
    });

    describe('getLastUserMessage', () => {
        it('should return null when no user messages exist', () => {
            chat.addMessage({ role: 'assistant', content: 'AI response' });

            expect(chat.getLastUserMessage()).toBeNull();
        });

        it('should return null for empty messages array', () => {
            expect(chat.getLastUserMessage()).toBeNull();
        });

        it('should return the last user message', () => {
            chat.addMessage({ role: 'user', content: 'User 1' });
            chat.addMessage({ role: 'assistant', content: 'AI 1' });
            chat.addMessage({ role: 'user', content: 'User 2' });
            chat.addMessage({ role: 'assistant', content: 'AI 2' });

            const lastUserMessage = chat.getLastUserMessage();

            expect(lastUserMessage.content).toBe('User 2');
            expect(lastUserMessage.role).toBe('user');
        });
    });

    describe('clearMessages', () => {
        it('should clear all messages', () => {
            chat.addMessage({ role: 'user', content: 'Message 1' });
            chat.addMessage({ role: 'assistant', content: 'Message 2' });

            chat.clearMessages();

            expect(chat.messages).toEqual([]);
        });

        it('should update timestamp when clearing messages', () => {
            vi.useFakeTimers();
            chat.addMessage({ role: 'user', content: 'Message' });
            const originalTimestamp = chat.updatedAt;
            vi.advanceTimersByTime(1000);

            chat.clearMessages();

            expect(chat.updatedAt).not.toBe(originalTimestamp);
            vi.useRealTimers();
        });
    });

    describe('setDefaultProvider', () => {
        it('should set provider and model IDs', () => {
            chat.setDefaultProvider('provider-123', 'model-456');

            expect(chat.defaultProviderId).toBe('provider-123');
            expect(chat.defaultModelId).toBe('model-456');
        });

        it('should update timestamp when setting provider', () => {
            vi.useFakeTimers();
            const originalTimestamp = chat.updatedAt;
            vi.advanceTimersByTime(1000);

            chat.setDefaultProvider('provider-123', 'model-456');

            expect(chat.updatedAt).not.toBe(originalTimestamp);
            vi.useRealTimers();
        });
    });

    describe('getMessageCount', () => {
        it('should return 0 for empty chat', () => {
            expect(chat.getMessageCount()).toBe(0);
        });

        it('should return correct count', () => {
            chat.addMessage({ role: 'user', content: '1' });
            chat.addMessage({ role: 'assistant', content: '2' });
            chat.addMessage({ role: 'user', content: '3' });

            expect(chat.getMessageCount()).toBe(3);
        });
    });

    describe('getAIMessageCount', () => {
        it('should return 0 when no AI messages exist', () => {
            chat.addMessage({ role: 'user', content: 'User message' });

            expect(chat.getAIMessageCount()).toBe(0);
        });

        it('should count only assistant messages', () => {
            chat.addMessage({ role: 'user', content: 'User 1' });
            chat.addMessage({ role: 'assistant', content: 'AI 1' });
            chat.addMessage({ role: 'user', content: 'User 2' });
            chat.addMessage({ role: 'assistant', content: 'AI 2' });
            chat.addMessage({ role: 'assistant', content: 'AI 3' });

            expect(chat.getAIMessageCount()).toBe(3);
        });
    });

    describe('generateAutoTitle', () => {
        it('should generate title from first user message', () => {
            chat.addMessage({ role: 'user', content: 'Hello, how are you?' });
            chat.addMessage({ role: 'assistant', content: 'I am fine!' });

            chat.generateAutoTitle();

            expect(chat.title).toBe('Hello, how are you?');
        });

        it('should truncate long messages to 50 characters with ellipsis', () => {
            const longMessage = 'This is a very long message that exceeds fifty characters in total length';
            chat.addMessage({ role: 'user', content: longMessage });

            chat.generateAutoTitle();

            expect(chat.title).toBe('This is a very long message that exceeds fifty cha...');
            expect(chat.title.length).toBe(53); // 50 + '...'
        });

        it('should use first line only for multiline messages', () => {
            chat.addMessage({ role: 'user', content: 'First line\nSecond line\nThird line' });

            chat.generateAutoTitle();

            expect(chat.title).toBe('First line');
        });

        it('should not change title if no user messages exist', () => {
            chat.addMessage({ role: 'assistant', content: 'AI message' });
            const originalTitle = chat.title;

            chat.generateAutoTitle();

            expect(chat.title).toBe(originalTitle);
        });
    });

    describe('getConversationHistory', () => {
        it('should return empty array for empty chat', () => {
            expect(chat.getConversationHistory()).toEqual([]);
        });

        it('should return messages in API format', () => {
            chat.addMessage({ role: 'user', content: 'Hello' });
            chat.addMessage({ role: 'assistant', content: 'Hi there' });

            const history = chat.getConversationHistory();

            expect(history).toEqual([
                { role: 'user', content: 'Hello' },
                { role: 'assistant', content: 'Hi there' }
            ]);
        });

        it('should only include role and content fields', () => {
            chat.addMessage({
                role: 'user',
                content: 'Test',
                providerId: 'provider-1',
                metadata: { key: 'value' }
            });

            const history = chat.getConversationHistory();

            expect(Object.keys(history[0])).toEqual(['role', 'content']);
        });
    });

    describe('exportChat', () => {
        it('should export chat data with required fields', () => {
            chat.addMessage({
                role: 'user',
                content: 'Hello',
                providerName: 'OpenAI',
                modelName: 'GPT-4'
            });

            const exported = chat.exportChat();

            expect(exported.title).toBe('Test Chat');
            expect(exported.createdAt).toBeDefined();
            expect(exported.messages).toHaveLength(1);
            expect(exported.messages[0]).toMatchObject({
                role: 'user',
                content: 'Hello',
                provider: 'OpenAI',
                model: 'GPT-4'
            });
            expect(exported.messages[0].timestamp).toBeDefined();
        });
    });

    describe('toJSON', () => {
        it('should convert chat to plain object', () => {
            chat.addMessage({ role: 'user', content: 'Test' });
            chat.setDefaultProvider('provider-1', 'model-1');
            chat.archived = true;
            chat.pinned = true;

            const json = chat.toJSON();

            expect(json.id).toBe(chat.id);
            expect(json.projectId).toBe(chat.projectId);
            expect(json.title).toBe('Test Chat');
            expect(json.messages).toHaveLength(1);
            expect(json.createdAt).toBe(chat.createdAt);
            expect(json.updatedAt).toBe(chat.updatedAt);
            expect(json.defaultProviderId).toBe('provider-1');
            expect(json.defaultModelId).toBe('model-1');
            expect(json.metadata).toEqual({});
            expect(json.archived).toBe(true);
            expect(json.pinned).toBe(true);
        });

        it('should serialize messages to plain objects', () => {
            chat.addMessage({ role: 'user', content: 'Test' });

            const json = chat.toJSON();

            expect(json.messages[0]).not.toBeInstanceOf(Message);
            expect(json.messages[0].role).toBe('user');
            expect(json.messages[0].content).toBe('Test');
        });
    });

    describe('fromJSON', () => {
        it('should create Chat instance from plain object', () => {
            const data = {
                id: 'chat-123',
                title: 'Restored Chat',
                messages: [
                    { role: 'user', content: 'Hello' }
                ],
                defaultProviderId: 'provider-1',
                archived: true
            };

            const restoredChat = Chat.fromJSON(data);

            expect(restoredChat).toBeInstanceOf(Chat);
            expect(restoredChat.id).toBe('chat-123');
            expect(restoredChat.title).toBe('Restored Chat');
            expect(restoredChat.messages).toHaveLength(1);
            expect(restoredChat.messages[0]).toBeInstanceOf(Message);
            expect(restoredChat.defaultProviderId).toBe('provider-1');
            expect(restoredChat.archived).toBe(true);
        });
    });

    describe('create', () => {
        it('should create a new chat with defaults', () => {
            const newChat = Chat.create();

            expect(newChat).toBeInstanceOf(Chat);
            expect(newChat.title).toBe('New Chat');
            expect(newChat.projectId).toBeNull();
            expect(newChat.defaultProviderId).toBeNull();
            expect(newChat.defaultModelId).toBeNull();
        });

        it('should create a new chat with provided config', () => {
            const newChat = Chat.create({
                title: 'Custom Chat',
                projectId: 'project-123',
                defaultProviderId: 'provider-1',
                defaultModelId: 'model-1'
            });

            expect(newChat.title).toBe('Custom Chat');
            expect(newChat.projectId).toBe('project-123');
            expect(newChat.defaultProviderId).toBe('provider-1');
            expect(newChat.defaultModelId).toBe('model-1');
        });
    });

    describe('updateTimestamp', () => {
        it('should update updatedAt to current time', () => {
            vi.useFakeTimers();
            const initialTime = new Date('2024-01-01T00:00:00Z');
            vi.setSystemTime(initialTime);

            const testChat = new Chat({ title: 'Test' });
            expect(testChat.updatedAt).toBe(initialTime.toISOString());

            const laterTime = new Date('2024-01-01T01:00:00Z');
            vi.setSystemTime(laterTime);

            testChat.updateTimestamp();

            expect(testChat.updatedAt).toBe(laterTime.toISOString());
            vi.useRealTimers();
        });
    });

    describe('roundtrip serialization', () => {
        it('should preserve all data through toJSON/fromJSON cycle', () => {
            chat.addMessage({ role: 'user', content: 'Hello' });
            chat.addMessage({ role: 'assistant', content: 'Hi', providerName: 'OpenAI' });
            chat.setDefaultProvider('provider-1', 'model-1');
            chat.metadata = { custom: 'data' };
            chat.archived = true;
            chat.pinned = true;

            const json = chat.toJSON();
            const restored = Chat.fromJSON(json);

            expect(restored.id).toBe(chat.id);
            expect(restored.title).toBe(chat.title);
            expect(restored.messages).toHaveLength(2);
            expect(restored.messages[0].content).toBe('Hello');
            expect(restored.messages[1].providerName).toBe('OpenAI');
            expect(restored.defaultProviderId).toBe('provider-1');
            expect(restored.defaultModelId).toBe('model-1');
            expect(restored.metadata).toEqual({ custom: 'data' });
            expect(restored.archived).toBe(true);
            expect(restored.pinned).toBe(true);
        });
    });
});
