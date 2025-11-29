// __tests__/unit/ui-manager-chat-cards.test.js
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { UIManager } from '@/modules/ui-manager.js';
import { Chat } from '@/modules/chat.js';

// Mock lucide icons
global.lucide = {
    createIcons: vi.fn()
};

// Mock DOM
function createMockDOM() {
    document.body.innerHTML = `
        <div id="sidebar-chats"></div>
        <div id="confirmModal" style="display: none;">
            <i id="confirmModalIcon"></i>
            <h3 id="confirmModalTitle"></h3>
            <p id="confirmModalMessage"></p>
            <button id="confirmModalConfirmBtn"></button>
        </div>
    `;
}

// Mock ChatManager
const createMockChatManager = () => ({
    currentChatId: null,
    currentProjectId: null,
    chats: [],
    getActiveChats: function() {
        return this.chats.filter(c => !c.archived);
    },
    getChatsByProject: function(projectId) {
        if (!projectId) return this.chats.filter(c => !c.projectId);
        return this.chats.filter(c => c.projectId === projectId);
    },
    getChat: function(id) {
        return this.chats.find(c => c.id === id);
    },
    providerStorage: {
        getEnabledProviders: vi.fn().mockResolvedValue([]),
        getActiveProviderID: vi.fn().mockResolvedValue(null),
        getProvider: vi.fn().mockResolvedValue(null)
    }
});

describe('UIManager Chat Cards', () => {
    let ui;
    let mockChatManager;

    beforeEach(() => {
        createMockDOM();
        mockChatManager = createMockChatManager();
        ui = new UIManager(mockChatManager);
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    // ============================================
    // RENDER CHAT LIST TESTS
    // ============================================
    describe('renderChatsList', () => {
        it('should render empty state when no chats', () => {
            mockChatManager.chats = [];

            ui.renderChatsList();

            const container = document.getElementById('sidebar-chats');
            expect(container.innerHTML).toContain('No chats yet');
            expect(container.innerHTML).toContain('Click "New Chat"');
        });

        it('should render chat cards for each chat', () => {
            const chat1 = new Chat({ id: 'chat-1', title: 'First Chat' });
            const chat2 = new Chat({ id: 'chat-2', title: 'Second Chat' });
            mockChatManager.chats = [chat1, chat2];

            ui.renderChatsList();

            const container = document.getElementById('sidebar-chats');
            expect(container.querySelectorAll('.chat-card').length).toBe(2);
            expect(container.innerHTML).toContain('First Chat');
            expect(container.innerHTML).toContain('Second Chat');
        });

        it('should include action buttons in each card', () => {
            const chat = new Chat({ id: 'chat-1', title: 'Test' });
            mockChatManager.chats = [chat];

            ui.renderChatsList();

            const container = document.getElementById('sidebar-chats');
            const actionsContainer = container.querySelector('.chat-card-actions');

            expect(actionsContainer).not.toBeNull();
            expect(actionsContainer.querySelectorAll('.chat-action-btn').length).toBe(4); // pin, clone, archive, delete
        });

        it('should include delete button with danger styling', () => {
            const chat = new Chat({ id: 'chat-1', title: 'Test' });
            mockChatManager.chats = [chat];

            ui.renderChatsList();

            const container = document.getElementById('sidebar-chats');
            const deleteBtn = container.querySelector('.chat-action-btn-danger');

            expect(deleteBtn).not.toBeNull();
            expect(deleteBtn.getAttribute('title')).toBe('Delete chat');
        });

        it('should include clone button', () => {
            const chat = new Chat({ id: 'chat-1', title: 'Test' });
            mockChatManager.chats = [chat];

            ui.renderChatsList();

            const container = document.getElementById('sidebar-chats');
            const cloneBtn = container.querySelector('button[title="Clone chat"]');

            expect(cloneBtn).not.toBeNull();
        });

        it('should show pin icon for pinned chats', () => {
            const chat = new Chat({ id: 'chat-1', title: 'Pinned Chat' });
            chat.pinned = true;
            mockChatManager.chats = [chat];

            ui.renderChatsList();

            const container = document.getElementById('sidebar-chats');
            const cardContent = container.querySelector('.chat-card-content');

            expect(cardContent.innerHTML).toContain('data-lucide="pin"');
        });

        it('should not show pin icon for unpinned chats', () => {
            const chat = new Chat({ id: 'chat-1', title: 'Unpinned Chat' });
            chat.pinned = false;
            mockChatManager.chats = [chat];

            ui.renderChatsList();

            const container = document.getElementById('sidebar-chats');
            const cardContent = container.querySelector('.chat-card-content');
            const pinIcons = cardContent.querySelectorAll('i[data-lucide="pin"]');

            expect(pinIcons.length).toBe(0);
        });

        it('should show archive icon for archived chats', () => {
            const chat = new Chat({ id: 'chat-1', title: 'Archived Chat' });
            chat.archived = true;
            mockChatManager.chats = [chat];

            // Override getActiveChats to include archived for this test
            mockChatManager.getActiveChats = () => mockChatManager.chats;

            ui.renderChatsList();

            const container = document.getElementById('sidebar-chats');
            expect(container.innerHTML).toContain('data-lucide="archive"');
        });

        it('should highlight active chat with ring', () => {
            const chat1 = new Chat({ id: 'chat-1', title: 'Active' });
            const chat2 = new Chat({ id: 'chat-2', title: 'Inactive' });
            mockChatManager.chats = [chat1, chat2];
            mockChatManager.currentChatId = 'chat-1';

            ui.renderChatsList();

            const container = document.getElementById('sidebar-chats');
            const cards = container.querySelectorAll('.chat-card');

            expect(cards[0].classList.contains('ring-2')).toBe(true);
            expect(cards[1].classList.contains('ring-2')).toBe(false);
        });

        it('should show message count', () => {
            const chat = new Chat({ id: 'chat-1', title: 'Test' });
            chat.addMessage({ role: 'user', content: 'Hello' });
            chat.addMessage({ role: 'assistant', content: 'Hi!' });
            mockChatManager.chats = [chat];

            ui.renderChatsList();

            const container = document.getElementById('sidebar-chats');
            expect(container.innerHTML).toContain('2 messages');
        });

        it('should show message preview', () => {
            const chat = new Chat({ id: 'chat-1', title: 'Test' });
            chat.addMessage({ role: 'user', content: 'This is a test message' });
            mockChatManager.chats = [chat];

            ui.renderChatsList();

            const container = document.getElementById('sidebar-chats');
            expect(container.innerHTML).toContain('This is a test message');
        });

        it('should truncate long message preview', () => {
            const chat = new Chat({ id: 'chat-1', title: 'Test' });
            const longMessage = 'A'.repeat(100);
            chat.addMessage({ role: 'user', content: longMessage });
            mockChatManager.chats = [chat];

            ui.renderChatsList();

            const container = document.getElementById('sidebar-chats');
            // Preview should be truncated to 60 chars + "..."
            expect(container.innerHTML).toContain('...');
        });

        it('should include chat ID as data attribute', () => {
            const chat = new Chat({ id: 'chat-123', title: 'Test' });
            mockChatManager.chats = [chat];

            ui.renderChatsList();

            const container = document.getElementById('sidebar-chats');
            const card = container.querySelector('.chat-card');

            expect(card.getAttribute('data-chat-id')).toBe('chat-123');
        });

        it('should have onclick handler for main content area', () => {
            const chat = new Chat({ id: 'chat-1', title: 'Test' });
            mockChatManager.chats = [chat];

            ui.renderChatsList();

            const container = document.getElementById('sidebar-chats');
            const content = container.querySelector('.chat-card-content');

            expect(content.getAttribute('onclick')).toContain("loadChat('chat-1')");
        });

        it('should have stopPropagation on action buttons', () => {
            const chat = new Chat({ id: 'chat-1', title: 'Test' });
            mockChatManager.chats = [chat];

            ui.renderChatsList();

            const container = document.getElementById('sidebar-chats');
            const deleteBtn = container.querySelector('.chat-action-btn-danger');

            expect(deleteBtn.getAttribute('onclick')).toContain('event.stopPropagation()');
        });

        it('should show active state on pin button when pinned', () => {
            const chat = new Chat({ id: 'chat-1', title: 'Test' });
            chat.pinned = true;
            mockChatManager.chats = [chat];

            ui.renderChatsList();

            const container = document.getElementById('sidebar-chats');
            const pinBtn = container.querySelector('button[title="Unpin chat"]');

            expect(pinBtn.classList.contains('active')).toBe(true);
        });
    });

    // ============================================
    // CONFIRM MODAL TESTS
    // ============================================
    describe('showConfirmModal', () => {
        it('should display modal with correct title', () => {
            ui.showConfirmModal({
                title: 'Test Title',
                message: 'Test message',
                onConfirm: vi.fn()
            });

            expect(document.getElementById('confirmModalTitle').textContent).toBe('Test Title');
        });

        it('should display modal with correct message', () => {
            ui.showConfirmModal({
                title: 'Title',
                message: 'This is the test message',
                onConfirm: vi.fn()
            });

            expect(document.getElementById('confirmModalMessage').textContent).toBe('This is the test message');
        });

        it('should set custom icon', () => {
            ui.showConfirmModal({
                title: 'Title',
                message: 'Message',
                icon: 'trash-2',
                onConfirm: vi.fn()
            });

            expect(document.getElementById('confirmModalIcon').getAttribute('data-lucide')).toBe('trash-2');
        });

        it('should set custom icon color', () => {
            ui.showConfirmModal({
                title: 'Title',
                message: 'Message',
                iconColor: 'text-red-500',
                onConfirm: vi.fn()
            });

            expect(document.getElementById('confirmModalIcon').getAttribute('class')).toContain('text-red-500');
        });

        it('should set custom confirm button text', () => {
            ui.showConfirmModal({
                title: 'Title',
                message: 'Message',
                confirmText: 'Delete Forever',
                onConfirm: vi.fn()
            });

            expect(document.getElementById('confirmModalConfirmBtn').textContent).toBe('Delete Forever');
        });

        it('should set custom confirm button class', () => {
            ui.showConfirmModal({
                title: 'Title',
                message: 'Message',
                confirmClass: 'bg-blue-500 text-white',
                onConfirm: vi.fn()
            });

            expect(document.getElementById('confirmModalConfirmBtn').getAttribute('class')).toContain('bg-blue-500');
        });

        it('should store callback in window', () => {
            const callback = vi.fn();
            ui.showConfirmModal({
                title: 'Title',
                message: 'Message',
                onConfirm: callback
            });

            expect(window._confirmModalCallback).toBe(callback);
        });

        it('should show the modal', () => {
            ui.showConfirmModal({
                title: 'Title',
                message: 'Message',
                onConfirm: vi.fn()
            });

            expect(document.getElementById('confirmModal').style.display).toBe('flex');
        });
    });

    // ============================================
    // ESCAPE HTML TESTS
    // ============================================
    describe('escapeHtml', () => {
        it('should escape HTML special characters', () => {
            const result = ui.escapeHtml('<script>alert("xss")</script>');

            expect(result).not.toContain('<script>');
            expect(result).toContain('&lt;');
            expect(result).toContain('&gt;');
        });

        it('should escape ampersands', () => {
            const result = ui.escapeHtml('Tom & Jerry');

            expect(result).toContain('&amp;');
        });

        it('should handle quotes in text', () => {
            const result = ui.escapeHtml('He said "hello"');

            // textContent doesn't escape quotes (they're safe in text nodes)
            // This is correct behavior - quotes only need escaping in attribute values
            expect(result).toBe('He said "hello"');
        });
    });

    // ============================================
    // FORMAT DATE TESTS
    // ============================================
    describe('formatDate', () => {
        it('should return "Just now" for recent dates', () => {
            const now = new Date().toISOString();
            const result = ui.formatDate(now);

            expect(result).toBe('Just now');
        });

        it('should return minutes ago for recent dates', () => {
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
            const result = ui.formatDate(fiveMinutesAgo);

            expect(result).toBe('5m ago');
        });

        it('should return hours ago for older dates', () => {
            const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
            const result = ui.formatDate(twoHoursAgo);

            expect(result).toBe('2h ago');
        });

        it('should return days ago for even older dates', () => {
            const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
            const result = ui.formatDate(threeDaysAgo);

            expect(result).toBe('3d ago');
        });
    });
});
