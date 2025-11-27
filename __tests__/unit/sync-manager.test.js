// __tests__/unit/sync-manager.test.js
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock BroadcastChannel
class MockBroadcastChannel {
    constructor(name) {
        this.name = name;
        this.onmessage = null;
        this.postMessage = vi.fn();
        this.close = vi.fn();
        this.addEventListener = vi.fn((event, callback) => {
            if (event === 'message') this.onmessage = callback;
        });
    }
}

global.BroadcastChannel = MockBroadcastChannel;

// Mock navigator.serviceWorker
const mockServiceWorker = {
    ready: Promise.resolve({ active: { postMessage: vi.fn() } }),
    controller: { postMessage: vi.fn() },
    addEventListener: vi.fn()
};
Object.defineProperty(navigator, 'serviceWorker', {
    value: mockServiceWorker,
    writable: true
});

import { SyncManager } from '@/modules/sync-manager.js';

describe('SyncManager', () => {
    let syncManager;
    let mockChatManager;

    beforeEach(() => {
        vi.clearAllMocks();

        mockChatManager = {
            loadChats: vi.fn().mockResolvedValue([]),
            currentChatId: null,
            chats: [],
            storage: {
                getChat: vi.fn().mockResolvedValue(null)
            },
            getCurrentChat: vi.fn().mockReturnValue(null)
        };
    });

    afterEach(() => {
        if (syncManager) {
            syncManager.destroy();
        }
    });

    describe('Initialization', () => {
        it('should create BroadcastChannel', () => {
            syncManager = new SyncManager(mockChatManager);

            expect(syncManager.broadcastChannel).toBeDefined();
            expect(syncManager.broadcastChannel.name).toBe('ai-team-manager-sync');
        });

        it('should register message listener', () => {
            syncManager = new SyncManager(mockChatManager);

            expect(syncManager.broadcastChannel.addEventListener)
                .toHaveBeenCalledWith('message', expect.any(Function));
        });
    });

    describe('Broadcasting', () => {
        it('should broadcast chat-created event', () => {
            syncManager = new SyncManager(mockChatManager);

            syncManager.broadcast('chat-created', { chatId: 'test-123' });

            expect(syncManager.broadcastChannel.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'chat-created',
                    data: { chatId: 'test-123' }
                })
            );
        });

        it('should include timestamp in broadcast', () => {
            syncManager = new SyncManager(mockChatManager);

            syncManager.broadcast('chat-updated', { chatId: 'test' });

            const call = syncManager.broadcastChannel.postMessage.mock.calls[0][0];
            expect(call.timestamp).toBeDefined();
            expect(typeof call.timestamp).toBe('number');
        });
    });

    describe('Message Handling', () => {
        it('should deduplicate messages by timestamp', async () => {
            syncManager = new SyncManager(mockChatManager);

            const message = { type: 'chat-created', data: {}, timestamp: 1000 };

            await syncManager.handleSyncMessage(message);
            await syncManager.handleSyncMessage(message); // Duplicate

            expect(mockChatManager.loadChats).toHaveBeenCalledTimes(1);
        });

        it('should handle chat-deleted and clear current view', async () => {
            window.ui = { showView: vi.fn(), renderSidebar: vi.fn() };
            mockChatManager.currentChatId = 'deleted-chat';

            syncManager = new SyncManager(mockChatManager);

            await syncManager.handleSyncMessage({
                type: 'chat-deleted',
                data: { chatId: 'deleted-chat' },
                timestamp: Date.now()
            });

            expect(mockChatManager.currentChatId).toBeNull();
            expect(window.ui.showView).toHaveBeenCalledWith('welcomeView');

            delete window.ui;
        });
    });

    describe('Cleanup', () => {
        it('should close BroadcastChannel on destroy', () => {
            syncManager = new SyncManager(mockChatManager);

            syncManager.destroy();

            expect(syncManager.broadcastChannel.close).toHaveBeenCalled();
        });
    });
});
