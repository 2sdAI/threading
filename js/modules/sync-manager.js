/**
 * ============================================
 * SYNC MANAGER - Hybrid Approach
 * ============================================
 * Uses Service Worker when ready, BroadcastChannel as instant fallback
 * Reliable cross-window sync that works immediately!
 */

export class SyncManager {
    constructor(chatManager) {
        this.chatManager = chatManager;
        this.serviceWorkerReady = false;
        this.broadcastChannel = null;
        this.lastProcessedTimestamp = 0;

        this.init();
    }

    /**
     * Initialize sync mechanisms
     */
    async init() {
        // 1. Setup BroadcastChannel immediately (works right away for same-window tabs)
        if ('BroadcastChannel' in window) {
            this.broadcastChannel = new BroadcastChannel('ai-team-manager-sync');
            this.broadcastChannel.addEventListener('message', (event) => {
                console.log('📨 BC sync:', event.data.type);
                this.handleSyncMessage(event.data);
            });
            console.log('✅ BroadcastChannel ready (instant fallback)');
        }

        // 2. Setup Service Worker (better for cross-window, but might take a moment)
        if ('serviceWorker' in navigator) {
            this.initServiceWorker();
        } else {
            console.warn('⚠️ Service Worker not supported');
        }

        // 3. Listen for visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.onTabFocus();
            }
        });
    }

    /**
     * Initialize Service Worker sync
     */
    async initServiceWorker() {
        try {
            // Wait for existing registration (registered in index.html)
            await navigator.serviceWorker.ready;
            console.log('✅ Service Worker ready');

            // Check if we have a controller (might not on first load)
            if (navigator.serviceWorker.controller) {
                this.serviceWorkerReady = true;
                console.log('✅ Service Worker controlling page');
            } else {
                console.log('⏳ Waiting for Service Worker to control page (reload page to activate)');

                // Wait for controller to be available
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    this.serviceWorkerReady = true;
                    console.log('✅ Service Worker now controlling page');
                });
            }

            // Listen for messages from Service Worker
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data && event.data.type && event.data.type.startsWith('sync-')) {
                    const originalType = event.data.type.replace('sync-', '');
                    console.log('📨 SW sync:', originalType);

                    this.handleSyncMessage({
                        type: originalType,
                        data: event.data.data,
                        timestamp: event.data.timestamp
                    });
                }
            });

        } catch (error) {
            console.error('Service Worker init error:', error);
        }
    }

    /**
     * Broadcast using best available method
     */
    broadcast(type, data = {}) {
        const message = {
            type,
            data,
            timestamp: Date.now()
        };

        console.log('📤 Broadcasting:', type);
        const sentVia = [];

        // 1. Try Service Worker first (best for cross-window)
        if (this.serviceWorkerReady && navigator.serviceWorker.controller) {
            try {
                navigator.serviceWorker.controller.postMessage({
                    type: 'sync-relay',
                    syncMessage: message
                });
                sentVia.push('SW');
            } catch (e) {
                console.error('SW broadcast error:', e);
            }
        }

        // 2. Always use BroadcastChannel as fallback/supplement
        if (this.broadcastChannel) {
            try {
                this.broadcastChannel.postMessage(message);
                sentVia.push('BC');
            } catch (e) {
                console.error('BC broadcast error:', e);
            }
        }

        if (sentVia.length === 0) {
            console.warn('⚠️ No sync method available! Reload page to activate Service Worker.');
        } else {
            console.log('✓ Sent via:', sentVia.join(' + '));
        }
    }

    /**
     * Handle incoming sync messages
     */
    async handleSyncMessage(message) {
        // Prevent duplicate processing (in case message comes from multiple sources)
        if (message.timestamp <= this.lastProcessedTimestamp) {
            return; // Already processed
        }
        this.lastProcessedTimestamp = message.timestamp;

        try {
            switch (message.type) {
                case 'chat-created':
                    await this.handleChatCreated(message.data);
                    break;

                case 'chat-updated':
                    await this.handleChatUpdated(message.data);
                    break;

                case 'chat-deleted':
                    await this.handleChatDeleted(message.data);
                    break;

                case 'message-added':
                    await this.handleMessageAdded(message.data);
                    break;

                case 'provider-updated':
                    await this.handleProviderUpdated(message.data);
                    break;

                case 'settings-changed':
                    await this.handleSettingsChanged(message.data);
                    break;

                default:
                    console.log('Unknown sync message type:', message.type);
            }
        } catch (error) {
            console.error('Error handling sync message:', error);
        }
    }

    /**
     * Handle chat created in another tab/window
     */
    async handleChatCreated() {
        await this.chatManager.loadChats();
        if (window.ui) {
            window.ui.renderSidebar();
        }
    }

    /**
     * Handle chat updated in another tab/window
     */
    async handleChatUpdated(data) {
        await this.chatManager.loadChats();

        if (window.ui && this.chatManager.currentChatId === data.chatId) {
            const chat = this.chatManager.getCurrentChat();
            if (chat) {
                window.ui.updateChatHeader(chat);
                window.ui.renderMessages(chat.messages);
            }
        }

        if (window.ui) {
            window.ui.renderSidebar();
        }
    }

    /**
     * Handle chat deleted in another tab/window
     */
    async handleChatDeleted(data) {
        await this.chatManager.loadChats();

        if (this.chatManager.currentChatId === data.chatId) {
            this.chatManager.currentChatId = null;
            if (window.ui) {
                window.ui.showView('welcomeView');
            }
        }

        if (window.ui) {
            window.ui.renderSidebar();
        }
    }

    /**
     * Handle message added in another tab/window
     */
    async handleMessageAdded(data) {
        const chat = await this.chatManager.storage.getChat(data.chatId);
        if (chat) {
            const index = this.chatManager.chats.findIndex(c => c.id === data.chatId);
            if (index !== -1) {
                this.chatManager.chats[index] = chat;
            }

            if (window.ui && this.chatManager.currentChatId === data.chatId) {
                window.ui.renderMessages(chat.messages);
                window.ui.updateChatHeader(chat);
            }

            if (window.ui) {
                window.ui.renderSidebar();
            }
        }
    }

    /**
     * Handle provider settings updated in another tab/window
     */
    async handleProviderUpdated() {
        if (window.ui && window.ui.currentView === 'chatView') {
            const chat = this.chatManager.getCurrentChat();
            if (chat) {
                await window.ui.updateChatProviderSelectors(chat);
            }
        }

        if (window.ui && window.ui.currentView === 'settingsView') {
            await window.renderProviders();
        }
    }

    /**
     * Handle general settings changed
     */
    async handleSettingsChanged(_data) {
        console.log('Settings changed in another tab/window');
    }

    /**
     * Called when tab becomes visible (refresh data)
     */
    async onTabFocus() {
        console.log('🔄 Tab focused, refreshing data...');

        try {
            await this.chatManager.loadChats();

            if (window.ui) {
                window.ui.renderSidebar();

                if (this.chatManager.currentChatId) {
                    const chat = this.chatManager.getCurrentChat();
                    if (chat) {
                        window.ui.updateChatHeader(chat);
                        window.ui.renderMessages(chat.messages);
                    }
                }
            }
        } catch (error) {
            console.error('Error refreshing on tab focus:', error);
        }
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.broadcastChannel) {
            this.broadcastChannel.close();
        }
    }
}
