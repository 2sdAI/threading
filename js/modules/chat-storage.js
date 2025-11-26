import { Chat } from './chat.js';

/**
 * ============================================
 * CHAT STORAGE WITH INDEXEDDB
 * ============================================
 * Handles persistent storage of chats and messages using IndexedDB
 */

export class ChatStorage {
    constructor() {
        this.dbName = 'AITeamManagerDB';
        this.version = 2;
        this.db = null;
    }

    /**
     * Initialize IndexedDB
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error('IndexedDB error:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                this.db.onerror = (event) => {
                    console.error('Database Error:', event.target.error);
                };
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                console.log(`Upgrading DB from version ${event.oldVersion} to ${event.newVersion}`);

                // Create providers store if it doesn't exist (shared with ProviderStorage)
                if (!db.objectStoreNames.contains('providers')) {
                    const providerStore = db.createObjectStore('providers', { keyPath: 'id' });
                    providerStore.createIndex('type', 'type', { unique: false });
                    providerStore.createIndex('enabled', 'enabled', { unique: false });
                }

                // Create chats store if it doesn't exist
                if (!db.objectStoreNames.contains('chats')) {
                    const chatStore = db.createObjectStore('chats', { keyPath: 'id' });
                    chatStore.createIndex('projectId', 'projectId', { unique: false });
                    chatStore.createIndex('createdAt', 'createdAt', { unique: false });
                    chatStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                    chatStore.createIndex('pinned', 'pinned', { unique: false });
                    chatStore.createIndex('archived', 'archived', { unique: false });
                }

                // Create settings store if it doesn't exist (shared with ProviderStorage)
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }

                // Create appSettings store if it doesn't exist
                if (!db.objectStoreNames.contains('appSettings')) {
                    db.createObjectStore('appSettings', { keyPath: 'key' });
                }
            };
        });
    }

    /**
     * Ensure DB is initialized
     */
    async ensureDB() {
        if (!this.db) {
            await this.init();
        }
        return this.db;
    }

    /**
     * Save a single chat
     */
    async saveChat(chat) {
        const db = await this.ensureDB();
        const chatData = chat.toJSON();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['chats'], 'readwrite');
            const store = transaction.objectStore('chats');
            const request = store.put(chatData);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Save multiple chats (bulk operation)
     */
    async saveChats(chats) {
        const db = await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['chats'], 'readwrite');
            const store = transaction.objectStore('chats');

            chats.forEach(chat => {
                store.put(chat.toJSON());
            });

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    /**
     * Get a chat by ID
     */
    async getChat(id) {
        const db = await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['chats'], 'readonly');
            const store = transaction.objectStore('chats');
            const request = store.get(id);

            request.onsuccess = () => {
                const data = request.result;
                resolve(data ? Chat.fromJSON(data) : null);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get all chats
     */
    async getAllChats() {
        const db = await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['chats'], 'readonly');
            const store = transaction.objectStore('chats');
            const request = store.getAll();

            request.onsuccess = () => {
                const chatsData = request.result;
                const chats = chatsData.map(data => Chat.fromJSON(data));
                // Sort by updatedAt descending (most recent first)
                chats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
                resolve(chats);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get chats by project ID
     */
    async getChatsByProject(projectId) {
        const db = await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['chats'], 'readonly');
            const store = transaction.objectStore('chats');
            const index = store.index('projectId');
            const request = index.getAll(projectId);

            request.onsuccess = () => {
                const chatsData = request.result;
                const chats = chatsData.map(data => Chat.fromJSON(data));
                chats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
                resolve(chats);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Delete a chat
     */
    async deleteChat(id) {
        const db = await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['chats'], 'readwrite');
            const store = transaction.objectStore('chats');
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Delete multiple chats
     */
    async deleteChats(ids) {
        const db = await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['chats'], 'readwrite');
            const store = transaction.objectStore('chats');

            ids.forEach(id => {
                store.delete(id);
            });

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    /**
     * Clear all chats
     */
    async clearAllChats() {
        const db = await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['chats'], 'readwrite');
            const store = transaction.objectStore('chats');
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Save current chat ID
     */
    async saveCurrentChatId(chatId) {
        const db = await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['appSettings'], 'readwrite');
            const store = transaction.objectStore('appSettings');
            const request = store.put({ key: 'currentChatId', value: chatId });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get current chat ID
     */
    async getCurrentChatId() {
        const db = await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['appSettings'], 'readonly');
            const store = transaction.objectStore('appSettings');
            const request = store.get('currentChatId');

            request.onsuccess = () => resolve(request.result?.value || null);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Save current project ID
     */
    async saveCurrentProjectId(projectId) {
        const db = await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['appSettings'], 'readwrite');
            const store = transaction.objectStore('appSettings');
            const request = store.put({ key: 'currentProjectId', value: projectId });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get current project ID
     */
    async getCurrentProjectId() {
        const db = await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['appSettings'], 'readonly');
            const store = transaction.objectStore('appSettings');
            const request = store.get('currentProjectId');

            request.onsuccess = () => resolve(request.result?.value || null);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Export all chats (for backup)
     */
    async exportChats() {
        const chats = await this.getAllChats();
        return chats.map(chat => chat.toJSON());
    }

    /**
     * Import chats (for restore)
     */
    async importChats(chatsData) {
        const chats = chatsData.map(data => Chat.fromJSON(data));
        await this.saveChats(chats);
        return chats;
    }

    /**
     * Get chat statistics
     */
    async getChatStats() {
        const chats = await this.getAllChats();

        return {
            total: chats.length,
            archived: chats.filter(c => c.archived).length,
            pinned: chats.filter(c => c.pinned).length,
            byProject: chats.reduce((acc, c) => {
                const key = c.projectId || 'no-project';
                acc[key] = (acc[key] || 0) + 1;
                return acc;
            }, {}),
            totalMessages: chats.reduce((sum, c) => sum + c.getMessageCount(), 0)
        };
    }
}
