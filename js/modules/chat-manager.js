import { Chat } from './chat.js';
import { ChatStorage } from './chat-storage.js';
import { ProviderStorage } from './provider-storage.js';

/**
 * ============================================
 * CHAT MANAGER
 * ============================================
 * Central manager for all chat-related operations, state, and persistence
 */

export class ChatManager {
    constructor(storage = new ChatStorage(), providerStorage = new ProviderStorage()) {
        this.storage = storage;
        this.providerStorage = providerStorage;
        this.chats = [];
        this.currentChatId = null;
        this.currentProjectId = null;
        this.selectedAgent = null;
    }

    /**
     * Initialize the chat manager
     */
    async init() {
        // Initialize storage first (this will create/upgrade the database with all stores)
        await this.storage.init();

        // Then initialize provider storage (will use the already-initialized database)
        await this.providerStorage.init();

        // Load chats
        await this.loadChats();

        // Restore current chat and project IDs
        this.currentChatId = await this.storage.getCurrentChatId();
        this.currentProjectId = await this.storage.getCurrentProjectId();

        return this;
    }

    /**
     * Load all chats from storage
     */
    async loadChats() {
        this.chats = await this.storage.getAllChats();
        return this.chats;
    }

    /**
     * Get a chat by ID
     */
    getChat(id) {
        if (!id) return null;
        return this.chats.find(chat => chat.id === id);
    }

    /**
     * Get current chat
     */
    getCurrentChat() {
        return this.getChat(this.currentChatId);
    }

    /**
     * Get all chats
     */
    getChats() {
        return this.chats;
    }

    /**
     * Get chats by project
     */
    getChatsByProject(projectId) {
        if (!projectId) {
            return this.chats.filter(chat => !chat.projectId);
        }
        return this.chats.filter(chat => chat.projectId === projectId);
    }

    /**
     * Create a new chat
     */
    async createChat(config = {}) {
        // Get default provider if not specified
        if (!config.defaultProviderId) {
            config.defaultProviderId = await this.providerStorage.getActiveProvider();
        }

        // Get default model from provider
        if (!config.defaultModelId && config.defaultProviderId) {
            const provider = await this.providerStorage.getProvider(config.defaultProviderId);
            if (provider) {
                config.defaultModelId = provider.defaultModel;
            }
        }

        // Apply current project if in project context
        if (this.currentProjectId && !config.projectId) {
            config.projectId = this.currentProjectId;
        }

        const chat = Chat.create(config);
        this.chats.unshift(chat); // Add to beginning of array
        await this.storage.saveChat(chat);

        // Set as current chat
        await this.setCurrentChat(chat.id);

        return chat;
    }

    /**
     * Delete a chat
     */
    async deleteChat(id) {
        const index = this.chats.findIndex(chat => chat.id === id);
        if (index === -1) return false;

        this.chats.splice(index, 1);
        await this.storage.deleteChat(id);

        // If we deleted the current chat, switch to another
        if (this.currentChatId === id) {
            const newChat = this.chats[0];
            if (newChat) {
                await this.setCurrentChat(newChat.id);
            } else {
                this.currentChatId = null;
                await this.storage.saveCurrentChatId(null);
            }
        }

        return true;
    }

    /**
     * Delete multiple chats
     */
    async deleteChats(ids) {
        this.chats = this.chats.filter(chat => !ids.includes(chat.id));
        await this.storage.deleteChats(ids);

        // If we deleted the current chat, switch to another
        if (ids.includes(this.currentChatId)) {
            const newChat = this.chats[0];
            if (newChat) {
                await this.setCurrentChat(newChat.id);
            } else {
                this.currentChatId = null;
                await this.storage.saveCurrentChatId(null);
            }
        }
    }

    /**
     * Clear all chats
     */
    async clearAllChats() {
        this.chats = [];
        this.currentChatId = null;
        await this.storage.clearAllChats();
        await this.storage.saveCurrentChatId(null);
    }

    /**
     * Save all chats to storage
     */
    async saveChats() {
        await this.storage.saveChats(this.chats);
    }

    /**
     * Save a single chat
     */
    async saveChat(chat) {
        await this.storage.saveChat(chat);
    }

    /**
     * Load a specific chat by ID
     */
    async loadChat(id) {
        const chat = this.getChat(id);
        if (!chat) {
            throw new Error(`Chat not found: ${id}`);
        }

        await this.setCurrentChat(id);
        return chat;
    }

    /**
     * Set current chat
     */
    async setCurrentChat(id) {
        this.currentChatId = id;
        await this.storage.saveCurrentChatId(id);
    }

    /**
     * Set current project
     */
    async setCurrentProject(projectId) {
        this.currentProjectId = projectId;
        await this.storage.saveCurrentProjectId(projectId);
    }

    /**
     * Exit current project
     */
    async exitProject() {
        this.currentProjectId = null;
        await this.storage.saveCurrentProjectId(null);
    }

    /**
     * Generate auto title for a chat based on first message
     */
    async generateAutoTitle(chatId) {
        const chat = this.getChat(chatId);
        if (!chat) return;

        const firstUserMessage = chat.messages.find(m => m.isUser());
        if (!firstUserMessage) return;

        // Simple auto-title: first 50 chars of first message
        const content = firstUserMessage.content;
        const title = content.split('\n')[0].substring(0, 50);
        chat.title = title + (content.length > 50 ? '...' : '');

        await this.saveChat(chat);
    }

    /**
     * Update chat title
     */
    async updateChatTitle(chatId, title) {
        const chat = this.getChat(chatId);
        if (!chat) return;

        chat.title = title;
        await this.saveChat(chat);
    }

    /**
     * Update chat provider settings
     */
    async updateChatProvider(chatId, providerId, modelId) {
        const chat = this.getChat(chatId);
        if (!chat) return;

        chat.setDefaultProvider(providerId, modelId);
        await this.saveChat(chat);
    }

    /**
     * Archive/unarchive a chat
     */
    async toggleArchive(chatId) {
        const chat = this.getChat(chatId);
        if (!chat) return;

        chat.archived = !chat.archived;
        await this.saveChat(chat);
    }

    /**
     * Pin/unpin a chat
     */
    async togglePin(chatId) {
        const chat = this.getChat(chatId);
        if (!chat) return;

        chat.pinned = !chat.pinned;
        await this.saveChat(chat);
    }

    /**
     * Clear messages from a chat
     */
    async clearChatMessages(chatId) {
        const chat = this.getChat(chatId);
        if (!chat) return;

        chat.clearMessages();
        await this.saveChat(chat);
    }

    /**
     * Add a message to a chat
     */
    async addMessage(chatId, message) {
        const chat = this.getChat(chatId);
        if (!chat) return null;

        const msg = chat.addMessage(message);

        // Auto-generate title if this is the first message
        if (chat.getMessageCount() === 1) {
            await this.generateAutoTitle(chatId);
        }

        await this.saveChat(chat);
        return msg;
    }

    /**
     * Delete a message from a chat
     */
    async deleteMessage(chatId, messageId) {
        const chat = this.getChat(chatId);
        if (!chat) return false;

        const success = chat.deleteMessage(messageId);
        if (success) {
            await this.saveChat(chat);
        }
        return success;
    }

    /**
     * Send message to AI and get response
     */
    async sendToAI(messageText, providerId = null, modelId = null) {
        const chat = this.getCurrentChat();
        if (!chat) {
            throw new Error('No active chat');
        }

        // Determine which provider and model to use
        const effectiveProviderId = providerId || chat.defaultProviderId || await this.providerStorage.getActiveProvider();
        if (!effectiveProviderId) {
            throw new Error('No AI provider configured');
        }

        const provider = await this.providerStorage.getProvider(effectiveProviderId);
        if (!provider) {
            throw new Error('Provider not found');
        }

        if (!provider.enabled) {
            throw new Error(`Provider ${provider.name} is disabled`);
        }

        const effectiveModelId = modelId || chat.defaultModelId || provider.defaultModel;

        // Get conversation history
        const history = chat.getConversationHistory();

        try {
            // Send request to AI
            const content = await provider.sendRequest(history, effectiveModelId);

            // Find model info
            const model = provider.models.find(m => m.id === effectiveModelId);

            return {
                content,
                providerId: provider.id,
                providerName: provider.name,
                modelId: effectiveModelId,
                modelName: model?.name || effectiveModelId
            };
        } catch (error) {
            console.error('AI Request Error:', error);
            throw error;
        }
    }

    /**
     * Export a chat
     */
    async exportChat(chatId) {
        const chat = this.getChat(chatId);
        if (!chat) return null;

        return chat.exportChat();
    }

    /**
     * Export all chats
     */
    async exportAllChats() {
        return await this.storage.exportChats();
    }

    /**
     * Import chats
     */
    async importChats(chatsData) {
        const importedChats = await this.storage.importChats(chatsData);
        await this.loadChats();
        return importedChats;
    }

    /**
     * Get chat statistics
     */
    async getStats() {
        return await this.storage.getChatStats();
    }

    /**
     * Search chats by title or content
     */
    searchChats(query) {
        const lowerQuery = query.toLowerCase();
        return this.chats.filter(chat => {
            // Search in title
            if (chat.title.toLowerCase().includes(lowerQuery)) {
                return true;
            }
            // Search in message content
            return chat.messages.some(msg =>
                msg.content.toLowerCase().includes(lowerQuery)
            );
        });
    }

    /**
     * Get pinned chats
     */
    getPinnedChats() {
        return this.chats.filter(chat => chat.pinned);
    }

    /**
     * Get archived chats
     */
    getArchivedChats() {
        return this.chats.filter(chat => chat.archived);
    }

    /**
     * Get active (non-archived) chats
     */
    getActiveChats() {
        return this.chats.filter(chat => !chat.archived);
    }
}
