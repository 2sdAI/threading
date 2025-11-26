import { AIProvider } from './ai-provider.js';

/**
 * Simple Encryption Manager
 */
class EncryptionManager {
    async encrypt(text) { return btoa(text); }
    async decrypt(text) { return atob(text); }
}

/**
 * ============================================
 * PROVIDER STORAGE WITH INDEXEDDB
 * ============================================
 */
export class ProviderStorage {
    constructor() {
        this.dbName = 'AITeamManagerDB';
        this.version = 2;
        this.db = null;
        this.encryption = new EncryptionManager();
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error("IndexedDB error:", request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                this.db.onerror = (event) => console.error("Generic DB Error:", event.target.error);
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('providers')) {
                    const providerStore = db.createObjectStore('providers', { keyPath: 'id' });
                    providerStore.createIndex('type', 'type', { unique: false });
                    providerStore.createIndex('enabled', 'enabled', { unique: false });
                }
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    }

    async ensureDB() {
        if (!this.db) await this.init();
        return this.db;
    }

    _sanitizeData(data) {
        if (!data) return null;
        return new AIProvider(data);
    }

    async saveProvider(provider) {
        const db = await this.ensureDB();
        const providerData = { ...provider.toJSON() };
        
        if (providerData.apiKey) {
            providerData.apiKey = await this.encryption.encrypt(providerData.apiKey);
            providerData.isEncrypted = true;
        }

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['providers'], 'readwrite');
            const store = transaction.objectStore('providers');
            const request = store.put(providerData);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getProvider(id) {
        const db = await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['providers'], 'readonly');
            const store = transaction.objectStore('providers');
            const request = store.get(id);

            request.onsuccess = async () => {
                const data = request.result;
                if (data) {
                    if (data.isEncrypted && data.apiKey) {
                        try {
                            data.apiKey = await this.encryption.decrypt(data.apiKey);
                        } catch (e) {
                            console.error("Decrypt fail", e);
                            data.apiKey = '';
                        }
                    }
                    resolve(this._sanitizeData(data));
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    async getAllProviders() {
        const db = await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['providers'], 'readonly');
            const store = transaction.objectStore('providers');
            const request = store.getAll();

            request.onsuccess = async () => {
                const providersData = request.result;
                const providers = await Promise.all(
                    providersData.map(async (data) => {
                        if (data.isEncrypted && data.apiKey) {
                            try {
                                data.apiKey = await this.encryption.decrypt(data.apiKey);
                            } catch (e) {
                                data.apiKey = '';
                            }
                        }
                        return this._sanitizeData(data);
                    })
                );
                resolve(providers);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async getEnabledProviders() {
        const providers = await this.getAllProviders();
        return providers.filter(p => p.enabled);
    }

    async deleteProvider(id) {
        const db = await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['providers'], 'readwrite');
            const store = transaction.objectStore('providers');
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async saveActiveProvider(providerId) {
        const db = await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            store.put({ key: 'activeProvider', value: providerId });
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    async getActiveProvider() {
        const db = await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.get('activeProvider');
            request.onsuccess = () => resolve(request.result?.value || null);
            request.onerror = () => reject(request.error);
        });
    }

    async saveProviderDefaultModel(providerId, modelId) {
        const provider = await this.getProvider(providerId);
        if (provider) {
            provider.defaultModel = modelId;
            await this.saveProvider(provider);
        }
    }

    /**
     * Initialize Default Providers
     * Modified: Returns empty array on fresh install (user request)
     */
    async initializeDefaultProviders() {
        const providers = await this.getAllProviders();
        // Return what we have, even if empty. 
        // Logic to "Create OpenRouter" has been removed.
        return providers; 
    }
}
