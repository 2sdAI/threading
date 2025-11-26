/**
 * ============================================
 * MESSAGE CLASS
 * ============================================
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
