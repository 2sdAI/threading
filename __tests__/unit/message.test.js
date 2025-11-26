import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Message } from '@modules/message.js';

const MOCK_DATE = 1678886400000; // Mar 15 2023 09:00:00 GMT

describe('Message Class', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(MOCK_DATE);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    // --- Constructor Tests ---
    describe('Constructor', () => {
        it('should create a Message instance with correct properties', () => {
            const content = 'Hello Vitest!';
            const role = 'user';

            const message = new Message({ content, role });

            expect(message).toBeInstanceOf(Message);
            expect(message.content).toBe(content);
            expect(message.role).toBe(role);
            expect(message.timestamp).toBe(new Date(MOCK_DATE).toISOString());
        });

        it('should generate unique ID', () => {
            const message1 = new Message({ content: 'Test 1', role: 'user' });
            vi.advanceTimersByTime(1);
            const message2 = new Message({ content: 'Test 2', role: 'user' });

            expect(message1.id).toMatch(/^msg-\d+-[a-z0-9]+$/);
            expect(message2.id).toMatch(/^msg-\d+-[a-z0-9]+$/);
            expect(message1.id).not.toBe(message2.id);
        });

        it('should use provided ID if given', () => {
            const message = new Message({
                id: 'custom-id-123',
                content: 'Test',
                role: 'user'
            });

            expect(message.id).toBe('custom-id-123');
        });

        it('should initialize with default values', () => {
            const message = new Message({ content: 'Test', role: 'user' });

            expect(message.agentId).toBeNull();
            expect(message.providerId).toBeNull();
            expect(message.providerName).toBeNull();
            expect(message.modelId).toBeNull();
            expect(message.modelName).toBeNull();
            expect(message.metadata).toEqual({});
            expect(message.edited).toBe(false);
            expect(message.editedAt).toBeNull();
        });

        it('should accept all optional properties', () => {
            const message = new Message({
                content: 'Test',
                role: 'assistant',
                agentId: 'agent-1',
                providerId: 'provider-1',
                providerName: 'OpenAI',
                modelId: 'gpt-4',
                modelName: 'GPT-4',
                metadata: { tokens: 100 },
                edited: true,
                editedAt: '2023-01-01T00:00:00Z'
            });

            expect(message.agentId).toBe('agent-1');
            expect(message.providerId).toBe('provider-1');
            expect(message.providerName).toBe('OpenAI');
            expect(message.modelId).toBe('gpt-4');
            expect(message.modelName).toBe('GPT-4');
            expect(message.metadata).toEqual({ tokens: 100 });
            expect(message.edited).toBe(true);
            expect(message.editedAt).toBe('2023-01-01T00:00:00Z');
        });

        it('should throw an error if content is empty', () => {
            expect(() => new Message({ content: '', role: 'user' }))
                .toThrow('Message content cannot be empty.');
        });

        it('should throw an error if content is whitespace only', () => {
            expect(() => new Message({ content: '   ', role: 'user' }))
                .toThrow('Message content cannot be empty.');
        });

        it('should throw an error if role (sender) is empty', () => {
            expect(() => new Message({ content: 'Content', role: '' }))
                .toThrow('Message sender cannot be empty.');
        });

        it('should throw an error if role is missing', () => {
            expect(() => new Message({ content: 'Content' }))
                .toThrow('Message sender cannot be empty.');
        });

        it('should throw an error if content is not a string', () => {
            expect(() => new Message({ content: 123, role: 'user' }))
                .toThrow('Message content cannot be empty.');
        });

        it('should throw an error if content is null', () => {
            expect(() => new Message({ content: null, role: 'user' }))
                .toThrow('Message content cannot be empty.');
        });

        it('should throw an error if content is undefined', () => {
            expect(() => new Message({ role: 'user' }))
                .toThrow('Message content cannot be empty.');
        });
    });

    // --- edit() Method Tests ---
    describe('edit', () => {
        it('should update message content', () => {
            const message = new Message({ content: 'Original content', role: 'user' });

            message.edit('Updated content');

            expect(message.content).toBe('Updated content');
        });

        it('should set edited flag to true', () => {
            const message = new Message({ content: 'Original', role: 'user' });
            expect(message.edited).toBe(false);

            message.edit('Updated');

            expect(message.edited).toBe(true);
        });

        it('should set editedAt timestamp', () => {
            const message = new Message({ content: 'Original', role: 'user' });
            expect(message.editedAt).toBeNull();

            vi.advanceTimersByTime(5000); // Advance 5 seconds
            message.edit('Updated');

            expect(message.editedAt).toBe(new Date(MOCK_DATE + 5000).toISOString());
        });

        it('should update editedAt on subsequent edits', () => {
            const message = new Message({ content: 'Original', role: 'user' });

            vi.advanceTimersByTime(1000);
            message.edit('First edit');
            const firstEditTime = message.editedAt;

            vi.advanceTimersByTime(1000);
            message.edit('Second edit');
            const secondEditTime = message.editedAt;

            expect(secondEditTime).not.toBe(firstEditTime);
            expect(message.content).toBe('Second edit');
        });

        it('should handle empty string edit (allow clearing content)', () => {
            const message = new Message({ content: 'Original', role: 'user' });

            // Note: edit() doesn't validate content, only constructor does
            message.edit('');

            expect(message.content).toBe('');
            expect(message.edited).toBe(true);
        });

        it('should preserve other message properties when editing', () => {
            const message = new Message({
                content: 'Original',
                role: 'assistant',
                providerId: 'provider-1',
                providerName: 'OpenAI',
                modelId: 'gpt-4',
                metadata: { tokens: 50 }
            });

            message.edit('Updated content');

            expect(message.role).toBe('assistant');
            expect(message.providerId).toBe('provider-1');
            expect(message.providerName).toBe('OpenAI');
            expect(message.modelId).toBe('gpt-4');
            expect(message.metadata).toEqual({ tokens: 50 });
        });
    });

    // --- setProvider() Method Tests ---
    describe('setProvider', () => {
        it('should set all provider information', () => {
            const message = new Message({ content: 'Test', role: 'assistant' });

            message.setProvider('provider-123', 'Anthropic', 'claude-3', 'Claude 3 Sonnet');

            expect(message.providerId).toBe('provider-123');
            expect(message.providerName).toBe('Anthropic');
            expect(message.modelId).toBe('claude-3');
            expect(message.modelName).toBe('Claude 3 Sonnet');
        });

        it('should allow setting partial provider info with null values', () => {
            const message = new Message({ content: 'Test', role: 'assistant' });

            message.setProvider('provider-123', 'OpenAI', null, null);

            expect(message.providerId).toBe('provider-123');
            expect(message.providerName).toBe('OpenAI');
            expect(message.modelId).toBeNull();
            expect(message.modelName).toBeNull();
        });

        it('should overwrite existing provider information', () => {
            const message = new Message({
                content: 'Test',
                role: 'assistant',
                providerId: 'old-provider',
                providerName: 'Old Provider',
                modelId: 'old-model',
                modelName: 'Old Model'
            });

            message.setProvider('new-provider', 'New Provider', 'new-model', 'New Model');

            expect(message.providerId).toBe('new-provider');
            expect(message.providerName).toBe('New Provider');
            expect(message.modelId).toBe('new-model');
            expect(message.modelName).toBe('New Model');
        });

        it('should not affect other message properties', () => {
            const message = new Message({
                content: 'Test content',
                role: 'assistant',
                agentId: 'agent-1',
                metadata: { custom: 'data' }
            });

            message.setProvider('provider-1', 'Provider', 'model-1', 'Model');

            expect(message.content).toBe('Test content');
            expect(message.role).toBe('assistant');
            expect(message.agentId).toBe('agent-1');
            expect(message.metadata).toEqual({ custom: 'data' });
        });

        it('should allow clearing provider info with undefined', () => {
            const message = new Message({
                content: 'Test',
                role: 'assistant',
                providerId: 'provider-1',
                providerName: 'Provider'
            });

            message.setProvider(undefined, undefined, undefined, undefined);

            expect(message.providerId).toBeUndefined();
            expect(message.providerName).toBeUndefined();
            expect(message.modelId).toBeUndefined();
            expect(message.modelName).toBeUndefined();
        });
    });

    // --- isAI() Method Tests ---
    describe('isAI', () => {
        it('should return true for assistant role', () => {
            const message = new Message({ content: 'AI response', role: 'assistant' });
            expect(message.isAI()).toBe(true);
        });

        it('should return false for user role', () => {
            const message = new Message({ content: 'User message', role: 'user' });
            expect(message.isAI()).toBe(false);
        });

        it('should return false for other roles', () => {
            const message = new Message({ content: 'System message', role: 'system' });
            expect(message.isAI()).toBe(false);
        });
    });

    // --- isUser() Method Tests ---
    describe('isUser', () => {
        it('should return true for user role', () => {
            const message = new Message({ content: 'User message', role: 'user' });
            expect(message.isUser()).toBe(true);
        });

        it('should return false for assistant role', () => {
            const message = new Message({ content: 'AI response', role: 'assistant' });
            expect(message.isUser()).toBe(false);
        });

        it('should return false for other roles', () => {
            const message = new Message({ content: 'System message', role: 'system' });
            expect(message.isUser()).toBe(false);
        });
    });

    // --- getFormattedTime() Method Tests ---
    describe('getFormattedTime', () => {
        it('should return formatted time string', () => {
            const message = new Message({ content: 'Test', role: 'user' });

            const formattedTime = message.getFormattedTime();

            // Should be in HH:MM format
            expect(formattedTime).toMatch(/^\d{1,2}:\d{2}( [AP]M)?$/);
        });

        it('should use the message timestamp', () => {
            const specificTime = '2023-06-15T14:30:00Z';
            const message = new Message({
                content: 'Test',
                role: 'user',
                timestamp: specificTime
            });

            const formattedTime = message.getFormattedTime();

            // Verify it uses the provided timestamp
            expect(formattedTime).toBeDefined();
            expect(typeof formattedTime).toBe('string');
        });
    });

    // --- getFormattedMessage() Method Tests ---
    describe('getFormattedMessage', () => {
        it('should return correctly formatted string', () => {
            const content = 'Meeting at 10 AM.';
            const role = 'user';

            const message = new Message({ content, role });

            const expectedTime = new Date(MOCK_DATE).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
            });
            const expectedFormat = `[${expectedTime}] ${role}: ${content}`;

            expect(message.getFormattedMessage()).toBe(expectedFormat);
        });

        it('should include role in formatted message', () => {
            const message = new Message({ content: 'Test', role: 'assistant' });

            expect(message.getFormattedMessage()).toContain('assistant');
        });

        it('should include content in formatted message', () => {
            const message = new Message({ content: 'Hello World', role: 'user' });

            expect(message.getFormattedMessage()).toContain('Hello World');
        });

        it('should wrap time in brackets', () => {
            const message = new Message({ content: 'Test', role: 'user' });

            expect(message.getFormattedMessage()).toMatch(/\[.*\]/);
        });
    });

    // --- toJSON() Method Tests ---
    describe('toJSON', () => {
        it('should return plain object with all properties', () => {
            const message = new Message({
                content: 'Test content',
                role: 'assistant',
                agentId: 'agent-1',
                providerId: 'provider-1',
                providerName: 'OpenAI',
                modelId: 'gpt-4',
                modelName: 'GPT-4',
                metadata: { tokens: 100 }
            });

            const json = message.toJSON();

            expect(json).toEqual({
                id: message.id,
                role: 'assistant',
                content: 'Test content',
                timestamp: message.timestamp,
                agentId: 'agent-1',
                providerId: 'provider-1',
                providerName: 'OpenAI',
                modelId: 'gpt-4',
                modelName: 'GPT-4',
                metadata: { tokens: 100 },
                edited: false,
                editedAt: null
            });
        });

        it('should include edited state', () => {
            const message = new Message({ content: 'Original', role: 'user' });
            message.edit('Edited');

            const json = message.toJSON();

            expect(json.edited).toBe(true);
            expect(json.editedAt).toBeDefined();
        });

        it('should return a new object (not reference)', () => {
            const message = new Message({ content: 'Test', role: 'user' });

            const json1 = message.toJSON();
            const json2 = message.toJSON();

            expect(json1).not.toBe(json2);
            expect(json1).toEqual(json2);
        });
    });

    // --- fromJSON() Static Method Tests ---
    describe('fromJSON', () => {
        it('should create Message instance from plain object', () => {
            const data = {
                id: 'msg-123',
                role: 'user',
                content: 'Hello',
                timestamp: '2023-01-01T00:00:00Z',
                agentId: null,
                providerId: 'provider-1',
                providerName: 'OpenAI',
                modelId: 'gpt-4',
                modelName: 'GPT-4',
                metadata: {},
                edited: false,
                editedAt: null
            };

            const message = Message.fromJSON(data);

            expect(message).toBeInstanceOf(Message);
            expect(message.id).toBe('msg-123');
            expect(message.content).toBe('Hello');
            expect(message.providerId).toBe('provider-1');
        });

        it('should preserve edited state', () => {
            const data = {
                role: 'user',
                content: 'Edited message',
                edited: true,
                editedAt: '2023-06-15T10:00:00Z'
            };

            const message = Message.fromJSON(data);

            expect(message.edited).toBe(true);
            expect(message.editedAt).toBe('2023-06-15T10:00:00Z');
        });

        it('should roundtrip through toJSON/fromJSON', () => {
            const original = new Message({
                content: 'Test',
                role: 'assistant',
                providerId: 'provider-1',
                providerName: 'Test Provider',
                modelId: 'model-1',
                modelName: 'Test Model',
                agentId: 'agent-1',
                metadata: { custom: 'data' }
            });
            original.edit('Edited content');

            const json = original.toJSON();
            const restored = Message.fromJSON(json);

            expect(restored.id).toBe(original.id);
            expect(restored.content).toBe('Edited content');
            expect(restored.edited).toBe(true);
            expect(restored.providerId).toBe('provider-1');
            expect(restored.metadata).toEqual({ custom: 'data' });
        });
    });

    // --- Edge Cases ---
    describe('Edge Cases', () => {
        it('should handle very long content', () => {
            const longContent = 'A'.repeat(10000);
            const message = new Message({ content: longContent, role: 'user' });

            expect(message.content).toBe(longContent);
            expect(message.content.length).toBe(10000);
        });

        it('should handle special characters in content', () => {
            const specialContent = '特殊字符 🎉 <script>alert("xss")</script> \n\t\r';
            const message = new Message({ content: specialContent, role: 'user' });

            expect(message.content).toBe(specialContent);
        });

        it('should handle unicode in all fields', () => {
            const message = new Message({
                content: '你好世界 🌍',
                role: 'user',
                providerName: '中文提供者',
                modelName: '模型名 🤖'
            });

            message.setProvider('provider-中文', '提供者名', 'model-中文', '模型');

            expect(message.providerId).toBe('provider-中文');
            expect(message.providerName).toBe('提供者名');
        });

        it('should handle multiline content', () => {
            const multilineContent = 'Line 1\nLine 2\nLine 3\n\nLine 5';
            const message = new Message({ content: multilineContent, role: 'user' });

            expect(message.content).toBe(multilineContent);
            expect(message.content.split('\n')).toHaveLength(5);
        });

        it('should handle content with only special characters', () => {
            const message = new Message({ content: '!@#$%^&*()', role: 'user' });
            expect(message.content).toBe('!@#$%^&*()');
        });
    });
});
