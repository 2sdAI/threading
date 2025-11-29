import { ChatManager } from './modules/chat-manager.js';
import { UIManager } from './modules/ui-manager.js';
import { SyncManager } from './modules/sync-manager.js';
import { ProviderFactory } from './modules/provider-factory.js';
import { Message } from './modules/message.js';

// Database Reset Utility
window.resetDatabase = async function() {
    if (!confirm('⚠️ This will delete ALL data. Continue?')) return;
    try {
        if (window.chatManager?.storage?.db) window.chatManager.storage.db.close();
        await new Promise((resolve, reject) => {
            const req = indexedDB.deleteDatabase('AITeamManagerDB');
            req.onsuccess = resolve;
            req.onerror = reject;
        });
        alert('Reset complete. Reloading...');
        window.location.reload();
    } catch (error) {
        alert('Reset failed: ' + error.message);
    }
};

// Global vars
let chatManager;
let ui;
let syncManager;

// Initialize
async function initApp() {
    console.log('🚀 Starting App Initialization...');
    try {
        chatManager = new ChatManager();
        ui = new UIManager(chatManager);

        window.chatManager = chatManager;
        window.ui = ui;

        ui.init();

        console.log('⚙️ Connecting to Database...');
        await chatManager.init();
        console.log('✅ Database Initialized');

        // Initialize cross-tab sync
        syncManager = new SyncManager(chatManager);
        window.syncManager = syncManager;

        await chatManager.providerStorage.initializeDefaultProviders();

        if (chatManager.currentChatId) {
            await window.loadChat(chatManager.currentChatId);
        } else {
            ui.renderSidebar();
        }

        console.log('✅ App Ready');
        lucide.createIcons();

    } catch (error) {
        console.error('❌ CRITICAL INIT ERROR:', error);
        if (ui && ui.notify) {
            ui.notify('App Init Failed: ' + error.message, 'error');
        } else {
            alert('App failed to load. See console.');
        }
    }
}

// --- GLOBAL FUNCTIONS ---

window.createNewChat = async function() {
    console.log('🖱️ createNewChat clicked');
    if (!ensureReady()) return;
    try {
        const chat = await chatManager.createChat();
        await window.loadChat(chat.id);
        ui.notify('New chat created', 'success');

        // Broadcast to other tabs
        if (syncManager) {
            syncManager.broadcast('chat-created', { chatId: chat.id });
        }
    } catch (error) {
        console.error(error);
        ui.notify('Error creating chat', 'error');
    }
};

window.createNewProject = function() {
    console.log('🖱️ createNewProject clicked');
    if (ui) ui.notify('Projects feature coming soon!', 'info');
};

window.loadChat = async function(chatId) {
    console.log('🖱️ loadChat:', chatId);
    if (!ensureReady()) return;
    try {
        await chatManager.loadChat(chatId);
        const chat = chatManager.getCurrentChat();
        ui.showView('chatView');
        ui.updateChatHeader(chat);
        ui.renderMessages(chat.messages);
        ui.renderSidebar();
        await ui.updateChatProviderSelectors(chat);
        ui.focusInput();
        ui.closeSidebar();
    } catch (error) {
        console.error(error);
        ui.notify('Error loading chat', 'error');
    }
};

// --- CHAT CARD ACTIONS ---

/**
 * Prompt to delete a chat
 */
window.deleteChatPrompt = function(chatId) {
    if (!ensureReady()) return;

    const chat = chatManager.getChat(chatId);
    if (!chat) return;

    ui.showConfirmModal({
        title: 'Delete Chat',
        message: `Are you sure you want to delete "${chat.title}"? This action cannot be undone.`,
        icon: 'trash-2',
        iconColor: 'text-red-400',
        confirmText: 'Delete',
        confirmClass: 'bg-red-500 hover:bg-red-600 text-white',
        onConfirm: async () => {
            try {
                await chatManager.deleteChat(chatId);
                ui.hideModal('confirmModal');
                ui.renderSidebar();

                // If deleted chat was active, show welcome view
                if (chatManager.currentChatId === null) {
                    ui.showView('welcomeView');
                }

                ui.notify('Chat deleted', 'success');

                // Broadcast to other tabs
                if (syncManager) {
                    syncManager.broadcast('chat-deleted', { chatId });
                }
            } catch (error) {
                console.error(error);
                ui.notify('Error deleting chat', 'error');
            }
        }
    });
};

/**
 * Prompt to clone a chat
 */
window.cloneChatPrompt = function(chatId) {
    if (!ensureReady()) return;

    const chat = chatManager.getChat(chatId);
    if (!chat) return;

    ui.showConfirmModal({
        title: 'Clone Chat',
        message: `Create a copy of "${chat.title}" with all messages?`,
        icon: 'copy',
        iconColor: 'text-blue-400',
        confirmText: 'Clone',
        confirmClass: 'bg-blue-500 hover:bg-blue-600 text-white',
        onConfirm: async () => {
            try {
                const clonedChat = await chatManager.cloneChat(chatId);
                ui.hideModal('confirmModal');
                ui.renderSidebar();

                // Load the cloned chat
                await window.loadChat(clonedChat.id);

                ui.notify('Chat cloned successfully', 'success');

                // Broadcast to other tabs
                if (syncManager) {
                    syncManager.broadcast('chat-created', { chatId: clonedChat.id });
                }
            } catch (error) {
                console.error(error);
                ui.notify('Error cloning chat', 'error');
            }
        }
    });
};

/**
 * Toggle chat pin status
 */
window.toggleChatPin = async function(chatId) {
    if (!ensureReady()) return;

    try {
        const chat = await chatManager.toggleChatPin(chatId);
        if (chat) {
            ui.renderSidebar();
            ui.notify(chat.pinned ? 'Chat pinned' : 'Chat unpinned', 'success');

            // Broadcast to other tabs
            if (syncManager) {
                syncManager.broadcast('chat-updated', { chatId });
            }
        }
    } catch (error) {
        console.error(error);
        ui.notify('Error updating chat', 'error');
    }
};

/**
 * Prompt to archive/unarchive a chat
 */
window.archiveChatPrompt = function(chatId) {
    if (!ensureReady()) return;

    const chat = chatManager.getChat(chatId);
    if (!chat) return;

    const isArchived = chat.archived;

    ui.showConfirmModal({
        title: isArchived ? 'Unarchive Chat' : 'Archive Chat',
        message: isArchived
            ? `Restore "${chat.title}" from archive?`
            : `Archive "${chat.title}"? It will be hidden from the main list.`,
        icon: 'archive',
        iconColor: isArchived ? 'text-green-400' : 'text-orange-400',
        confirmText: isArchived ? 'Unarchive' : 'Archive',
        confirmClass: isArchived
            ? 'bg-green-500 hover:bg-green-600 text-white'
            : 'bg-orange-500 hover:bg-orange-600 text-white',
        onConfirm: async () => {
            try {
                const updatedChat = await chatManager.toggleChatArchive(chatId);
                ui.hideModal('confirmModal');
                ui.renderSidebar();

                // If archived chat was active, show welcome view
                if (updatedChat.archived && chatManager.currentChatId === chatId) {
                    chatManager.currentChatId = null;
                    ui.showView('welcomeView');
                }

                ui.notify(updatedChat.archived ? 'Chat archived' : 'Chat unarchived', 'success');

                // Broadcast to other tabs
                if (syncManager) {
                    syncManager.broadcast('chat-updated', { chatId });
                }
            } catch (error) {
                console.error(error);
                ui.notify('Error updating chat', 'error');
            }
        }
    });
};

/**
 * Handle confirm modal confirm button click
 */
window.handleConfirmModalConfirm = function() {
    if (window._confirmModalCallback) {
        window._confirmModalCallback();
    }
};

/**
 * Close confirm modal
 */
window.closeConfirmModal = function() {
    ui.hideModal('confirmModal');
    window._confirmModalCallback = null;
};

// --- MESSAGING ---

window.sendMessage = async function() {
    if (!ensureReady()) return;
    const input = document.getElementById('messageInput');
    const content = input.value.trim();
    if (!content) return;

    const chat = chatManager.getCurrentChat();
    if (!chat) {
        ui.notify('No chat selected', 'error');
        return;
    }

    // Add user message
    await chatManager.addMessage(chat.id, new Message({
        role: 'user',
        content: content
    }));

    ui.clearInput();
    ui.renderMessages(chat.messages);
    ui.renderSidebar();

    // Broadcast to other tabs
    if (syncManager) {
        syncManager.broadcast('message-added', { chatId: chat.id });
    }

    // Get AI response
    const providerId = document.getElementById('chatProviderSelect').value;
    const modelId = document.getElementById('chatModelSelect').value;

    if (!providerId) {
        ui.notify('No AI provider selected', 'error');
        return;
    }

    // Show typing indicator
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typing';
    typingDiv.className = 'flex justify-start mb-4';
    typingDiv.innerHTML = `
        <div class="bg-white/10 border border-white/10 rounded-lg px-4 py-3">
            <div class="flex items-center gap-2 text-white/60">
                <div class="typing-dots">
                    <span></span><span></span><span></span>
                </div>
                <span class="text-sm">AI is thinking...</span>
            </div>
        </div>
    `;
    document.getElementById('messagesContainer').appendChild(typingDiv);
    ui.scrollToBottom();

    try {
        const response = await chatManager.sendToAI(chat.id, providerId, modelId);

        document.getElementById('typing')?.remove();

        await chatManager.addMessage(chat.id, new Message({
            role: 'assistant',
            content: response.content,
            providerId: response.providerId,
            providerName: response.providerName,
            modelId: response.modelId,
            modelName: response.modelName
        }));

        ui.renderMessages(chat.messages);
        ui.renderSidebar();

        // Broadcast AI response to other tabs
        if (syncManager) {
            syncManager.broadcast('message-added', { chatId: chat.id });
        }
    } catch (error) {
        console.error(error);
        document.getElementById('typing')?.remove();
        ui.notify(error.message, 'error');
    }
};

window.handleInputKeydown = function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        window.sendMessage();
    }
};

// --- CHAT SETTINGS ---

window.showChatSettings = async function() {
    if (!ensureReady()) return;
    const chat = chatManager.getCurrentChat();
    if (!chat) return;

    // Populate modal
    document.getElementById('chatSettingsTitle').value = chat.title;

    // Populate provider dropdown
    const providerSelect = document.getElementById('chatSettingsProvider');
    const providers = await chatManager.providerStorage.getEnabledProviders();

    providerSelect.innerHTML = '<option value="">Use global active provider</option>';
    providers.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id;
        option.textContent = p.name;
        if (chat.defaultProviderId === p.id) option.selected = true;
        providerSelect.appendChild(option);
    });

    // Populate model dropdown
    await window.updateChatSettingsModels();

    // Show modal
    ui.showModal('chatSettingsModal');
};

window.updateChatSettingsModels = async function() {
    const providerId = document.getElementById('chatSettingsProvider').value;
    const modelSelect = document.getElementById('chatSettingsModel');
    const chat = chatManager.getCurrentChat();

    if (!providerId) {
        modelSelect.innerHTML = '<option value="">Use provider\'s default model</option>';
        return;
    }

    const provider = await chatManager.providerStorage.getProvider(providerId);
    if (!provider) return;

    modelSelect.innerHTML = '<option value="">Use provider\'s default model</option>';
    provider.models.forEach(m => {
        const option = document.createElement('option');
        option.value = m.id;
        option.textContent = m.name + (m.description ? ` (${m.description})` : '');
        if (chat.defaultModelId === m.id) option.selected = true;
        modelSelect.appendChild(option);
    });
};

window.saveChatSettings = async function() {
    if (!ensureReady()) return;
    const chat = chatManager.getCurrentChat();
    if (!chat) return;

    chat.title = document.getElementById('chatSettingsTitle').value.trim() || 'New Chat';
    chat.defaultProviderId = document.getElementById('chatSettingsProvider').value || null;
    chat.defaultModelId = document.getElementById('chatSettingsModel').value || null;

    await chatManager.saveChat(chat);
    ui.hideModal('chatSettingsModal');
    ui.updateChatHeader(chat);
    ui.renderSidebar();
    ui.notify('Chat settings saved', 'success');

    // Broadcast to other tabs
    if (syncManager) {
        syncManager.broadcast('chat-updated', { chatId: chat.id });
    }
};

window.closeChatSettings = () => ui.hideModal('chatSettingsModal');

// --- NAVIGATION & SETTINGS VIEW ---

window.navigateToSettings = function() {
    console.log('🖱️ navigateToSettings');
    if (!ensureReady()) return;
    ui.showView('settingsView');
    ui.closeSidebar();
    window.renderProviders();
    lucide.createIcons();
};

window.backToWelcome = function() {
    if (!ensureReady()) return;
    chatManager.currentChatId = null;
    ui.showView('welcomeView');
};

// --- PROVIDER MANAGEMENT ---

window.renderProviders = async function() {
    if (!ensureReady()) return;
    const providers = await chatManager.providerStorage.getAllProviders();
    const activeId = await chatManager.providerStorage.getActiveProviderID();
    const container = document.getElementById('providersContainer');

    if (!providers.length) {
        container.innerHTML = '<div class="text-white/50">No providers configured. Add one!</div>';
        return;
    }

    container.innerHTML = '';
    providers.forEach(p => {
        const isActive = p.id === activeId;
        const hasKey = p.apiKey && p.apiKey.length > 0;
        const div = document.createElement('div');
        div.className = `glass rounded-xl p-6 border transition-all ${isActive ? 'border-green-400/50 bg-green-500/5' : 'border-white/10 hover:border-white/30'}`;
        div.innerHTML = `
            <div class="flex items-start justify-between mb-3">
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                        <h3 class="text-white font-bold text-lg">${p.name}</h3>
                        ${isActive ? '<span class="px-2 py-0.5 bg-green-500/20 text-green-300 text-xs rounded-full border border-green-400/30">Active</span>' : ''}
                        ${!p.enabled ? '<span class="px-2 py-0.5 bg-red-500/20 text-red-300 text-xs rounded-full border border-red-400/30">Disabled</span>' : ''}
                    </div>
                    <p class="text-white/50 text-sm">${p.type} • ${p.models.length} models • ${hasKey ? '🔑 Key Set' : '❌ No Key'}</p>
                </div>
                <div class="flex gap-2">
                    <button onclick="window.editProvider('${p.id}')" class="p-2 bg-white/5 rounded hover:bg-white/10"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
                    <button onclick="window.deleteProviderPrompt('${p.id}')" class="p-2 bg-white/5 rounded hover:bg-red-500/20 text-red-300"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
            </div>
            <div class="flex gap-3 mt-4">
                ${!isActive ? `<button onclick="window.setActiveProvider('${p.id}')" class="flex-1 bg-green-600 text-white px-4 py-2 rounded text-sm">Set Active</button>` : ''}
                <button onclick="window.toggleProviderEnabled('${p.id}')" class="flex-1 bg-white/10 text-white px-4 py-2 rounded text-sm">${p.enabled ? 'Disable' : 'Enable'}</button>
                <button onclick="window.testProvider('${p.id}')" class="flex-1 bg-blue-600 text-white px-4 py-2 rounded text-sm">Test</button>
            </div>
        `;
        container.appendChild(div);
    });
    lucide.createIcons();
};

window.openProviderModal = function() {
    resetProviderModal();
    document.getElementById('providerModalTitle').textContent = 'Add AI Provider';
    document.getElementById('providerModal').style.display = 'flex';
};

window.saveProvider = async function() {
    if (!ensureReady()) return;
    const id = document.getElementById('providerModalId').value || `provider-${Date.now()}`;
    const name = document.getElementById('providerModalName').value.trim();
    const type = document.getElementById('providerModalType').value.trim() || 'custom';
    const apiUrl = document.getElementById('providerModalApiUrl').value.trim();
    const apiKey = document.getElementById('providerModalApiKey').value;
    const defaultModel = document.getElementById('providerModalDefaultModel').value.trim();
    const enabled = document.getElementById('providerModalEnabled').checked;

    if (!name || !apiUrl) {
        ui.notify('Name and API URL are required', 'error');
        return;
    }

    // Gather models
    const modelRows = document.querySelectorAll('#providerModalModels > div');
    const models = [];
    modelRows.forEach(row => {
        const mid = row.querySelector('.model-id')?.value.trim();
        const mname = row.querySelector('.model-name')?.value.trim();
        const mdesc = row.querySelector('.model-desc')?.value.trim();
        if (mid && mname) {
            models.push({ id: mid, name: mname, description: mdesc });
        }
    });

    try {
        const existingProvider = await chatManager.providerStorage.getProvider(id);

        const provider = ProviderFactory.create({
            id,
            name,
            type,
            apiUrl,
            apiKey: apiKey || existingProvider?.apiKey || '',
            defaultModel: defaultModel || models[0]?.id || '',
            models,
            enabled
        });

        await chatManager.providerStorage.saveProvider(provider);
        ui.notify('Provider saved ✓', 'success');
        document.getElementById('providerModal').style.display = 'none';
        window.renderProviders();

        // Broadcast to other tabs
        if (syncManager) {
            syncManager.broadcast('provider-updated', { providerId: provider.id });
        }

        // Update selector if in chat
        if (chatManager.currentChatId) {
            await updateChatProviderSelectors();
        }

    } catch (err) {
        console.error(err);
        ui.notify('Save failed: ' + err.message, 'error');
    }
};

window.editProvider = async function(id) {
    if (!ensureReady()) return;
    const provider = await chatManager.providerStorage.getProvider(id);
    if (!provider) return;

    document.getElementById('providerModalTitle').textContent = 'Edit AI Provider';
    document.getElementById('providerModalId').value = provider.id;
    document.getElementById('providerModalName').value = provider.name;
    document.getElementById('providerModalType').value = provider.type;
    document.getElementById('providerModalApiUrl').value = provider.apiUrl;
    document.getElementById('providerModalApiKey').value = ''; // Security: don't show key
    document.getElementById('providerModalApiKey').placeholder = provider.apiKey ? '••••••••••••••••' : 'Leave blank to keep existing key';
    document.getElementById('providerModalDefaultModel').value = provider.defaultModel;
    document.getElementById('providerModalEnabled').checked = provider.enabled;
    document.getElementById('providerModalTemplate').value = ''; // Reset template selector

    const container = document.getElementById('providerModalModels');
    container.innerHTML = '';
    if (provider.models && provider.models.length > 0) {
        provider.models.forEach(m => addProviderModelRow(m));
    }

    document.getElementById('providerModal').style.display = 'flex';
};

window.deleteProviderPrompt = async function(id) {
    if (!ensureReady()) return;
    if (!confirm('Delete this provider?')) return;
    await chatManager.providerStorage.deleteProvider(id);
    ui.notify('Provider deleted', 'success');
    window.renderProviders();

    if (syncManager) {
        syncManager.broadcast('provider-updated', { providerId: id });
    }
};

window.setActiveProvider = async function(id) {
    if (!ensureReady()) return;
    await chatManager.providerStorage.saveActiveProvider(id);
    ui.notify('Active provider set ✓', 'success');
    window.renderProviders();

    if (syncManager) {
        syncManager.broadcast('provider-updated', { providerId: id });
    }
};

window.toggleProviderEnabled = async function(id) {
    if (!ensureReady()) return;
    const provider = await chatManager.providerStorage.getProvider(id);
    if (!provider) return;
    provider.enabled = !provider.enabled;
    await chatManager.providerStorage.saveProvider(provider);
    ui.notify(provider.enabled ? 'Provider enabled' : 'Provider disabled', 'success');
    window.renderProviders();

    if (syncManager) {
        syncManager.broadcast('provider-updated', { providerId: id });
    }
};

window.testProvider = async function(id) {
    if (!ensureReady()) return;
    const provider = await chatManager.providerStorage.getProvider(id);
    if (!provider) return;
    ui.notify('Testing connection...', 'info');
    try {
        const res = await provider.testConnection();
        if (res.success) ui.notify('Connection successful ✓', 'success');
        else ui.notify('Connection failed: ' + res.message, 'error');
    } catch (e) {
        ui.notify('Test Error: ' + e.message, 'error');
    }
};

// Helpers
function ensureReady() {
    if (!window.chatManager || !window.ui) {
        console.error('App not ready. ChatManager or UI is null.');
        return false;
    }
    return true;
}

function resetProviderModal() {
    document.getElementById('providerModalId').value = '';
    document.getElementById('providerModalName').value = '';
    document.getElementById('providerModalType').value = 'custom';
    document.getElementById('providerModalApiUrl').value = '';
    document.getElementById('providerModalApiKey').value = '';
    document.getElementById('providerModalApiKey').placeholder = 'Your API key';
    document.getElementById('providerModalDefaultModel').value = '';
    document.getElementById('providerModalModels').innerHTML = '';
    document.getElementById('providerModalEnabled').checked = true;
    document.getElementById('providerModalTemplate').value = '';
}

async function updateChatProviderSelectors() {
    if (window.ui && window.chatManager) {
        await window.ui.updateChatProviderSelectors(window.chatManager.getCurrentChat());
    }
}

// --- EVENT HANDLERS ---
window.closeProviderModal = () => document.getElementById('providerModal').style.display = 'none';
window.addProviderModel = () => addProviderModelRow({ id:'', name:'', description:'' });

window.loadProviderTemplate = function() {
    const templateName = document.getElementById('providerModalTemplate').value;
    if (!templateName) return;

    const template = ProviderFactory.getTemplate(templateName);
    if (template) {
        document.getElementById('providerModalName').value = template.name;
        document.getElementById('providerModalType').value = template.type;
        document.getElementById('providerModalApiUrl').value = template.apiUrl;
        document.getElementById('providerModalDefaultModel').value = template.defaultModel;

        // Clear and populate models
        const container = document.getElementById('providerModalModels');
        container.innerHTML = '';
        template.models.forEach(m => addProviderModelRow(m));

        ui.notify(`Loaded ${template.name} template`, 'success');
    }
};

function addProviderModelRow(m) {
    const div = document.createElement('div');
    div.className = 'flex gap-2 mb-2 bg-white/5 p-2 rounded items-center';
    div.dataset.index = Date.now() + Math.random();
    div.innerHTML = `
        <input class="model-id bg-transparent border border-white/20 rounded px-2 py-1 text-white text-sm flex-1" value="${m.id || ''}" placeholder="model-id">
        <input class="model-name bg-transparent border border-white/20 rounded px-2 py-1 text-white text-sm flex-1" value="${m.name || ''}" placeholder="Model Name">
        <input class="model-desc bg-transparent border border-white/20 rounded px-2 py-1 text-white text-sm flex-1" value="${m.description || ''}" placeholder="Description">
        <button onclick="this.parentElement.remove()" class="text-red-400 hover:text-red-300 px-2 text-xl">×</button>
    `;
    document.getElementById('providerModalModels').appendChild(div);
}

// Attach other UI events globally
window.onChatProviderChange = async () => {
    const chat = window.chatManager.getCurrentChat();
    await window.ui.updateChatModelSelector(chat, true);
};

window.toggleSidebar = () => window.ui.toggleSidebar();
window.switchTab = (t) => window.ui.switchTab(t);

// Start
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initApp);
else initApp();
