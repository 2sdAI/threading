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
    console.log('🖱️ loadChat clicked', chatId);
    if (!ensureReady()) return;
    try {
        const chat = await chatManager.loadChat(chatId);
        ui.showView('chatView');
        ui.updateChatHeader(chat);
        ui.renderMessages(chat.messages);
        ui.renderSidebar();
        await updateChatProviderSelectors();
        ui.closeSidebar();
        ui.focusInput();
    } catch (error) {
        console.error(error);
        ui.notify('Error loading chat', 'error');
    }
};

window.clearChat = async function() {
    if (!ensureReady()) return;
    if (!confirm('Clear all messages?')) return;
    try {
        const chatId = chatManager.currentChatId;
        await chatManager.clearChatMessages(chatId);
        const chat = chatManager.getCurrentChat();
        ui.renderMessages(chat.messages);
        ui.notify('Chat cleared', 'success');

        // Broadcast to other windows
        if (syncManager) {
            syncManager.broadcast('chat-updated', { chatId: chatId });
        }
    } catch (_e) { ui.notify('Error clearing chat', _e); }
};

window.sendMessage = async function() {
    if (!ensureReady()) return;
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text) return;

    const chat = chatManager.getCurrentChat();
    if (!chat) { return ui.notify('No active chat', 'error'); }

    await chatManager.addMessage(chat.id, new Message({ role: 'user', content: text }));
    ui.renderMessages(chat.messages);
    ui.clearInput();
    ui.showTypingIndicator();

    // Broadcast user message to other tabs
    if (syncManager) {
        syncManager.broadcast('message-added', { chatId: chat.id });
    }

    try {
        const pId = document.getElementById('chatProviderSelect').value;
        const mId = document.getElementById('chatModelSelect').value;

        const response = await chatManager.sendToAI(text, pId, mId);
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
        option.textContent = m.name + (m.description ? ` - ${m.description}` : '');
        if (chat && chat.defaultModelId === m.id) option.selected = true;
        modelSelect.appendChild(option);
    });
};

window.saveChatSettings = async function() {
    if (!ensureReady()) return;
    const chat = chatManager.getCurrentChat();
    if (!chat) return;

    const title = document.getElementById('chatSettingsTitle').value.trim();
    const providerId = document.getElementById('chatSettingsProvider').value;
    const modelId = document.getElementById('chatSettingsModel').value;

    if (title) {
        await chatManager.updateChatTitle(chat.id, title);
    }

    if (providerId) {
        await chatManager.updateChatProvider(chat.id, providerId, modelId);
    }

    ui.hideModal('chatSettingsModal');
    ui.updateChatHeader(chat);
    await updateChatProviderSelectors();
    ui.notify('Chat settings saved', 'success');

    // Broadcast to other windows
    if (syncManager) {
        syncManager.broadcast('chat-updated', { chatId: chat.id });
    }
};

window.closeChatSettings = function() {
    ui.hideModal('chatSettingsModal');
};

// --- SETTINGS & PROVIDERS ---

window.navigateToSettings = function() {
    if (ui) {
        ui.showView('settingsView');
        window.switchSettingsTab('providers');
    }
};

window.closeSettings = function() {
    if (!ui) return;
    chatManager.currentChatId ? ui.showView('chatView') : ui.showView('welcomeView');
};

window.switchSettingsTab = function(tab) {
    ['providers', 'agents'].forEach(t => {
        const btn = document.getElementById(`settingsTab-${t}`);
        const content = document.getElementById(`settingsContent-${t}`);
        if (btn && content) {
            const isActive = t === tab;
            btn.classList.toggle('border-white', isActive);
            btn.classList.toggle('border-transparent', !isActive);
            btn.classList.toggle('text-white', isActive);
            btn.classList.toggle('text-white/60', !isActive);
            content.style.display = isActive ? 'block' : 'none';
        }
    });
    if (tab === 'providers') window.renderProviders();
};

window.renderProviders = async function() {
    if (!ensureReady()) return;
    const container = document.getElementById('providersList');
    const providers = await chatManager.providerStorage.getAllProviders();
    const activeId = await chatManager.providerStorage.getActiveProvider();

    if (providers.length === 0) {
        container.innerHTML = '<div class="text-white/40 text-center p-8 border border-dashed border-white/20 rounded-xl">No providers. Add one!</div>';
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
            </div>
        `;
        container.appendChild(div);
    });
    lucide.createIcons();
};

window.showAddProviderModal = function() {
    resetProviderModal();
    document.getElementById('providerModalTitle').textContent = 'Add AI Provider';
    document.getElementById('providerModal').style.display = 'flex';
};

window.saveProvider = async function() {
    console.log('🖱️ saveProvider clicked');
    if (!ensureReady()) return;

    const id = document.getElementById('providerModalId').value;
    const name = document.getElementById('providerModalName').value.trim();
    const type = document.getElementById('providerModalType').value;
    const apiUrl = document.getElementById('providerModalApiUrl').value.trim();
    const apiKey = document.getElementById('providerModalApiKey').value.trim();
    const defaultModel = document.getElementById('providerModalDefaultModel').value.trim();
    const enabled = document.getElementById('providerModalEnabled').checked;

    if (!name || !apiUrl) return ui.notify('Name and URL required', 'error');

    // Collect models
    const models = [];
    document.querySelectorAll('#providerModalModels [data-index]').forEach(row => {
        const modelId = row.querySelector('.model-id').value.trim();
        const modelName = row.querySelector('.model-name').value.trim();
        const modelDesc = row.querySelector('.model-desc').value.trim();
        if (modelId && modelName) {
            models.push({
                id: modelId,
                name: modelName,
                description: modelDesc
            });
        }
    });

    try {
        let provider;
        if (id) {
            // Editing existing provider
            provider = await chatManager.providerStorage.getProvider(id);
            provider.name = name;
            provider.type = type;
            provider.apiUrl = apiUrl;
            provider.defaultModel = defaultModel;
            provider.models = models;
            provider.enabled = enabled;
            // Only update API key if a new one is provided
            if (apiKey) {
                provider.apiKey = apiKey;
            }
        } else {
            // Creating new provider
            provider = ProviderFactory.createCustom({
                name,
                type,
                apiUrl,
                apiKey,
                defaultModel,
                models,
                enabled
            });
        }

        await chatManager.providerStorage.saveProvider(provider);
        ui.notify('Provider saved!', 'success');
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

    const activeId = await chatManager.providerStorage.getActiveProvider();
    await chatManager.providerStorage.deleteProvider(id);

    if (id === activeId) {
        const remaining = await chatManager.providerStorage.getAllProviders();
        if (remaining.length > 0) {
            await chatManager.providerStorage.saveActiveProvider(remaining[0].id);
        }
    }

    ui.notify('Provider deleted', 'success');
    window.renderProviders();

    // Broadcast to other tabs
    if (syncManager) {
        syncManager.broadcast('provider-updated', { providerId: id, deleted: true });
    }
};

window.setActiveProvider = async function(id) {
    if (!ensureReady()) return;
    await chatManager.providerStorage.saveActiveProvider(id);
    ui.notify('Active provider updated', 'success');
    window.renderProviders();
};

window.toggleProviderEnabled = async function(id) {
    if (!ensureReady()) return;
    const provider = await chatManager.providerStorage.getProvider(id);
    provider.enabled = !provider.enabled;
    await chatManager.providerStorage.saveProvider(provider);
    window.renderProviders();
};

window.testProvider = async function() {
    const apiUrl = document.getElementById('providerModalApiUrl').value.trim();
    const apiKey = document.getElementById('providerModalApiKey').value.trim();
    const type = document.getElementById('providerModalType').value;
    const defaultModel = document.getElementById('providerModalDefaultModel').value;

    // If editing and no new key provided, get existing key
    const providerId = document.getElementById('providerModalId').value;
    let testKey = apiKey;
    if (!testKey && providerId) {
        const existing = await chatManager.providerStorage.getProvider(providerId);
        if (existing) testKey = existing.apiKey;
    }

    if (!apiUrl || !testKey) return ui.notify('URL and API Key required for test', 'error');

    try {
        ui.notify('Testing connection...', 'info');
        const p = ProviderFactory.createCustom({ name: 'Test', type, apiUrl, apiKey: testKey, defaultModel });
        const res = await p.testConnection();
        if (res.success) ui.notify('Connection successful! ✓', 'success');
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
