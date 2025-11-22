// __tests__/unit/chat-classes.test.js
/**
 * Unit tests for Chat and Message classes
 */

// Import classes
const { Chat, Message } = require('../../js/modules/chat-classes.js');

describe('Message Class', () => {
  describe('Constructor', () => {
    test('should create message with default values', () => {
      const message = new Message({
        role: 'user',
        content: 'Hello world'
      });

      expect(message.id).toBeDefined();
      expect(message.role).toBe('user');
      expect(message.content).toBe('Hello world');
      expect(message.timestamp).toBeDefined();
      expect(message.agentId).toBeNull();
      expect(message.providerId).toBeNull();
      expect(message.edited).toBe(false);
    });

    test('should create message with custom values', () => {
      const message = new Message({
        id: 'msg-123',
        role: 'assistant',
        content: 'AI response',
        providerId: 'openai',
        providerName: 'OpenAI',
        modelId: 'gpt-4',
        modelName: 'GPT-4'
      });

      expect(message.id).toBe('msg-123');
      expect(message.role).toBe('assistant');
      expect(message.providerId).toBe('openai');
      expect(message.modelId).toBe('gpt-4');
    });
  });

  describe('Methods', () => {
    let message;

    beforeEach(() => {
      message = new Message({
        role: 'user',
        content: 'Original content'
      });
    });

    test('edit() should update content and set edited flag', () => {
      message.edit('New content');

      expect(message.content).toBe('New content');
      expect(message.edited).toBe(true);
      expect(message.editedAt).toBeDefined();
    });

    test('setProvider() should set provider information', () => {
      message.setProvider('openai', 'OpenAI', 'gpt-4', 'GPT-4');

      expect(message.providerId).toBe('openai');
      expect(message.providerName).toBe('OpenAI');
      expect(message.modelId).toBe('gpt-4');
      expect(message.modelName).toBe('GPT-4');
    });

    test('isAI() should return true for assistant role', () => {
      const aiMessage = new Message({ role: 'assistant', content: 'AI' });
      expect(aiMessage.isAI()).toBe(true);
      expect(message.isAI()).toBe(false);
    });

    test('isUser() should return true for user role', () => {
      expect(message.isUser()).toBe(true);
      
      const aiMessage = new Message({ role: 'assistant', content: 'AI' });
      expect(aiMessage.isUser()).toBe(false);
    });

    test('toJSON() should return plain object', () => {
      const json = message.toJSON();

      expect(json).toMatchObject({
        id: message.id,
        role: 'user',
        content: 'Original content',
        edited: false
      });
    });

    test('fromJSON() should create Message instance', () => {
      const json = message.toJSON();
      const restored = Message.fromJSON(json);

      expect(restored).toBeInstanceOf(Message);
      expect(restored.id).toBe(message.id);
      expect(restored.content).toBe(message.content);
    });
  });
});

describe('Chat Class', () => {
  describe('Constructor', () => {
    test('should create chat with default values', () => {
      const chat = new Chat({});

      expect(chat.id).toBeDefined();
      expect(chat.title).toBe('New Chat');
      expect(chat.messages).toEqual([]);
      expect(chat.createdAt).toBeDefined();
      expect(chat.archived).toBe(false);
      expect(chat.pinned).toBe(false);
    });

    test('should create chat with custom values', () => {
      const chat = new Chat({
        id: 'chat-123',
        title: 'Custom Chat',
        projectId: 'project-1',
        defaultProviderId: 'openai',
        defaultModelId: 'gpt-4'
      });

      expect(chat.id).toBe('chat-123');
      expect(chat.title).toBe('Custom Chat');
      expect(chat.projectId).toBe('project-1');
      expect(chat.defaultProviderId).toBe('openai');
    });

    test('should convert message objects to Message instances', () => {
      const chat = new Chat({
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      });

      expect(chat.messages[0]).toBeInstanceOf(Message);
    });
  });

  describe('Message Management', () => {
    let chat;

    beforeEach(() => {
      chat = new Chat({ title: 'Test Chat' });
    });

    test('addMessage() should add message and update timestamp', () => {
      const message = chat.addMessage({ role: 'user', content: 'Hello' });

      expect(chat.messages).toHaveLength(1);
      expect(message).toBeInstanceOf(Message);
      expect(chat.updatedAt).toBeDefined();
      expect(new Date(chat.updatedAt)).toBeInstanceOf(Date);
    });

    test('updateMessage() should modify existing message', () => {
      const message = chat.addMessage({ role: 'user', content: 'Original' });
      
      const updated = chat.updateMessage(message.id, { content: 'Updated' });

      expect(updated.content).toBe('Updated');
      expect(chat.messages[0].content).toBe('Updated');
    });

    test('deleteMessage() should remove message', () => {
      const message = chat.addMessage({ role: 'user', content: 'Hello' });
      
      const result = chat.deleteMessage(message.id);

      expect(result).toBe(true);
      expect(chat.messages).toHaveLength(0);
    });

    test('deleteMessage() should return false for non-existent message', () => {
      const result = chat.deleteMessage('non-existent');
      expect(result).toBe(false);
    });

    test('clearMessages() should remove all messages', () => {
      chat.addMessage({ role: 'user', content: 'Message 1' });
      chat.addMessage({ role: 'assistant', content: 'Message 2' });
      
      chat.clearMessages();

      expect(chat.messages).toHaveLength(0);
    });
  });

  describe('Query Methods', () => {
    let chat;

    beforeEach(() => {
      chat = new Chat({});
      chat.addMessage({ role: 'user', content: 'Hello' });
      chat.addMessage({ role: 'assistant', content: 'Hi there' });
      chat.addMessage({ role: 'user', content: 'How are you?' });
    });

    test('getLastMessage() should return most recent message', () => {
      const last = chat.getLastMessage();
      expect(last.content).toBe('How are you?');
    });

    test('getLastUserMessage() should return most recent user message', () => {
      const last = chat.getLastUserMessage();
      expect(last.content).toBe('How are you?');
    });

    test('getMessageCount() should return total messages', () => {
      expect(chat.getMessageCount()).toBe(3);
    });

    test('getAIMessageCount() should return only AI messages', () => {
      expect(chat.getAIMessageCount()).toBe(1);
    });

    test('getConversationHistory() should format for API', () => {
      const history = chat.getConversationHistory();

      expect(history).toEqual([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there' },
        { role: 'user', content: 'How are you?' }
      ]);
    });
  });

  describe('Auto Title Generation', () => {
    test('generateAutoTitle() should create title from first message', () => {
      const chat = new Chat({});
      chat.addMessage({ role: 'user', content: 'This is a test message' });
      
      chat.generateAutoTitle();

      expect(chat.title).toBe('This is a test message');
    });

    test('generateAutoTitle() should truncate long messages', () => {
      const chat = new Chat({});
      const longMessage = 'A'.repeat(100);
      chat.addMessage({ role: 'user', content: longMessage });
      
      chat.generateAutoTitle();

      expect(chat.title).toHaveLength(53); // 50 chars + '...'
      expect(chat.title).toContain('...');
    });

    test('generateAutoTitle() should stop at newline', () => {
      const chat = new Chat({});
      chat.addMessage({ role: 'user', content: 'First line\nSecond line' });
      
      chat.generateAutoTitle();

      expect(chat.title).toBe('First line');
    });
  });

  describe('Settings Management', () => {
    let chat;

    beforeEach(() => {
      chat = new Chat({});
    });

    test('setDefaultProvider() should set provider and model', () => {
      chat.setDefaultProvider('openai', 'gpt-4');

      expect(chat.defaultProviderId).toBe('openai');
      expect(chat.defaultModelId).toBe('gpt-4');
    });
  });

  describe('Serialization', () => {
    test('toJSON() should create plain object', () => {
      const chat = new Chat({
        title: 'Test',
        messages: [{ role: 'user', content: 'Hello' }]
      });

      const json = chat.toJSON();

      expect(json.title).toBe('Test');
      expect(json.messages).toHaveLength(1);
      expect(json.messages[0]).toHaveProperty('role', 'user');
    });

    test('fromJSON() should restore Chat instance', () => {
      const original = new Chat({ title: 'Original' });
      original.addMessage({ role: 'user', content: 'Test' });

      const json = original.toJSON();
      const restored = Chat.fromJSON(json);

      expect(restored).toBeInstanceOf(Chat);
      expect(restored.title).toBe('Original');
      expect(restored.messages[0]).toBeInstanceOf(Message);
    });

    test('create() should use factory pattern', () => {
      const chat = Chat.create({
        title: 'Factory Chat',
        projectId: 'project-1'
      });

      expect(chat).toBeInstanceOf(Chat);
      expect(chat.title).toBe('Factory Chat');
      expect(chat.projectId).toBe('project-1');
    });
  });

  describe('Export', () => {
    test('exportChat() should format for export', () => {
      const chat = new Chat({ title: 'Export Test' });
      chat.addMessage({ 
        role: 'user', 
        content: 'Hello',
        providerId: 'openai',
        providerName: 'OpenAI',
        modelId: 'gpt-4',
        modelName: 'GPT-4'
      });

      const exported = chat.exportChat();

      expect(exported).toHaveProperty('title', 'Export Test');
      expect(exported.messages[0]).toMatchObject({
        role: 'user',
        content: 'Hello',
        provider: 'OpenAI',
        model: 'GPT-4'
      });
    });
  });
});
