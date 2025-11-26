/**
 * ============================================
 * CHAT & MESSAGE CLASSES
 * ============================================
 * Object-oriented structure for chats and messages
 */

/**
 * Message Class
 * Represents a single message in a chat
 */
export class Message {
    constructor(config) {
        this.id = config.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.role = config.role; // 'user' or 'assistant'
        this.content = config.content;
        this.timestamp = config.timestamp || new Date().toISOString();
        this.agentId = config.agentId || null;

        // Provider and model information
        this.providerId = config.providerId || null;
        this.providerName = config.providerName || null;
        this.modelId = config.modelId || null;
        this.modelName = config.modelName || null;

        // Metadata
        this.metadata = config.metadata || {};
        this.edited = config.edited || false;
        this.editedAt = config.editedAt || null;
    }

    /**
     * Update message content
     */
    edit(newContent) {
        this.content = newContent;
        this.edited = true;
        this.editedAt = new Date().toISOString();
    }

    /**
     * Set provider information
     */
    setProvider(providerId, providerName, modelId, modelName) {
        this.providerId = providerId;
        this.providerName = providerName;
        this.modelId = modelId;
        this.modelName = modelName;
    }

    /**
     * Check if this is an AI message
     */
    isAI() {
        return this.role === 'assistant';
    }

    /**
     * Check if this is a user message
     */
    isUser() {
        return this.role === 'user';
    }

    /**
     * Get formatted timestamp
     */
    getFormattedTime() {
        const date = new Date(this.timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    /**
     * Convert to plain object for storage
     */
    toJSON() {
        return {
            id: this.id,
            role: this.role,
            content: this.content,
            timestamp: this.timestamp,
            agentId: this.agentId,
            providerId: this.providerId,
            providerName: this.providerName,
            modelId: this.modelId,
            modelName: this.modelName,
            metadata: this.metadata,
            edited: this.edited,
            editedAt: this.editedAt
        };
    }

    /**
     * Create from plain object
     */
    static fromJSON(data) {
        return new Message(data);
    }
}

/**
 * Chat Class
 * Represents a conversation with configuration
 */
export class Chat {
    constructor(config) {
        this.id = config.id || `chat-${Date.now()}`;
        this.projectId = config.projectId || null;
        this.title = config.title || 'New Chat';
        this.messages = (config.messages || []).map(m =>
            m instanceof Message ? m : Message.fromJSON(m)
        );
        this.createdAt = config.createdAt || new Date().toISOString();
        this.updatedAt = config.updatedAt || new Date().toISOString();

        // Default provider and model for this chat
        this.defaultProviderId = config.defaultProviderId || null;
        this.defaultModelId = config.defaultModelId || null;

        // Chat metadata
        this.metadata = config.metadata || {};
        this.archived = config.archived || false;
        this.pinned = config.pinned || false;
    }

    /**
     * Add a message to the chat
     */
    addMessage(message) {
        if (!(message instanceof Message)) {
            message = new Message(message);
        }
        this.messages.push(message);
        this.updateTimestamp();
        return message;
    }

    /**
     * Update a message by ID
     */
    updateMessage(messageId, updates) {
        const message = this.messages.find(m => m.id === messageId);
        if (message) {
            Object.assign(message, updates);
            this.updateTimestamp();
        }
        return message;
    }

    /**
     * Delete a message by ID
     */
    deleteMessage(messageId) {
        const index = this.messages.findIndex(m => m.id === messageId);
        if (index !== -1) {
            this.messages.splice(index, 1);
            this.updateTimestamp();
            return true;
        }
        return false;
    }

    /**
     * Get last message
     */
    getLastMessage() {
        return this.messages[this.messages.length - 1] || null;
    }

    /**
     * Get last user message
     */
    getLastUserMessage() {
        for (let i = this.messages.length - 1; i >= 0; i--) {
            if (this.messages[i].isUser()) {
                return this.messages[i];
            }
        }
        return null;
    }

    /**
     * Clear all messages
     */
    clearMessages() {
        this.messages = [];
        this.updateTimestamp();
    }

    /**
     * Set default provider and model
     */
    setDefaultProvider(providerId, modelId) {
        this.defaultProviderId = providerId;
        this.defaultModelId = modelId;
        this.updateTimestamp();
    }

    /**
     * Get message count
     */
    getMessageCount() {
        return this.messages.length;
    }

    /**
     * Get AI message count
     */
    getAIMessageCount() {
        return this.messages.filter(m => m.isAI()).length;
    }

    /**
     * Update timestamp
     */
    updateTimestamp() {
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Generate auto title from first message
     */
    generateAutoTitle() {
        const firstUserMessage = this.messages.find(m => m.isUser());
        if (firstUserMessage) {
            const content = firstUserMessage.content;
            // Take first 50 characters or until first newline
            const title = content.split('\n')[0].substring(0, 50);
            this.title = title + (content.length > 50 ? '...' : '');
            this.updateTimestamp();
        }
    }

    /**
     * Get conversation history for API
     */
    getConversationHistory() {
        return this.messages.map(m => ({
            role: m.role,
            content: m.content
        }));
    }

    /**
     * Export chat
     */
    exportChat() {
        return {
            title: this.title,
            createdAt: this.createdAt,
            messages: this.messages.map(m => ({
                role: m.role,
                content: m.content,
                timestamp: m.timestamp,
                provider: m.providerName,
                model: m.modelName
            }))
        };
    }

    /**
     * Convert to plain object for storage
     */
    toJSON() {
        return {
            id: this.id,
            projectId: this.projectId,
            title: this.title,
            messages: this.messages.map(m => m.toJSON()),
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            defaultProviderId: this.defaultProviderId,
            defaultModelId: this.defaultModelId,
            metadata: this.metadata,
            archived: this.archived,
            pinned: this.pinned
        };
    }

    /**
     * Create from plain object
     */
    static fromJSON(data) {
        return new Chat(data);
    }

    /**
     * Create a new chat with defaults
     */
    static create(config = {}) {
        return new Chat({
            title: config.title || 'New Chat',
            projectId: config.projectId || null,
            defaultProviderId: config.defaultProviderId || null,
            defaultModelId: config.defaultModelId || null
        });
    }
}
