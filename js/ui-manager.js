/**
 * ============================================
 * UI MANAGER
 * ============================================
 * Centralized UI rendering and DOM manipulation
 */

class UIManager {
    constructor(chatManager) {
        this.chatManager = chatManager;
        this.currentView = null;
        this.sidebarTab = 'chats';
        this.deferredPrompt = null; 
    }

    /**
     * Initialize UI
     */
    init() {
        this.setupEventListeners();
        this.setupPWA(); 
        this.showView('welcomeView');
    }

    /**
     * Setup PWA installation and Update listeners
     */
    setupPWA() {
        const installBtn = document.getElementById('pwaInstallBtn');

        // 1. Handle Install Prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            console.log('PWA Install Prompt Captured');
            if (installBtn) {
                installBtn.style.display = 'flex';
                installBtn.classList.add('fade-in');
            }
        });

        // 2. Handle Successful Install
        window.addEventListener('appinstalled', () => {
            if (installBtn) installBtn.style.display = 'none';
            this.deferredPrompt = null;
            this.notify('App installed successfully!', 'success');
        });

        // 3. Handle Service Worker Updates (Versioning)
        if ('serviceWorker' in navigator) {
            let refreshing = false;
            // When the SW controller changes, reload the page
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (!refreshing) {
                    refreshing = true;
                    window.location.reload();
                }
            });
        }
    }

    /**
     * Trigger PWA installation
     */
    async installPWA() {
        if (!this.deferredPrompt) return;
        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        console.log(`Install prompt outcome: ${outcome}`);
        this.deferredPrompt = null;
        document.getElementById('pwaInstallBtn').style.display = 'none';
    }

    /**
     * Show Update Notification
     * Called from index.html when a new SW waits
     */
    showUpdateNotification(worker) {
        const div = document.createElement('div');
        div.className = 'fixed bottom-4 right-4 z-[200] bg-slate-800 border border-white/20 p-4 rounded-lg shadow-2xl flex flex-col gap-2 fade-in';
        div.innerHTML = `
            <div class="flex items-center gap-2 text-white">
                <i data-lucide="download-cloud" class="w-5 h-5 text-blue-400"></i>
                <span class="font-semibold">New Version Available</span>
            </div>
            <p class="text-white/60 text-xs">An update is ready to install.</p>
            <div class="flex gap-2 mt-2">
                <button id="updateBtn" class="bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-500">Update Now</button>
                <button id="dismissUpdate" class="text-white/60 hover:text-white px-3 py-1.5 text-sm">Dismiss</button>
            </div>
        `;
        document.body.appendChild(div);
        lucide.createIcons();

        div.querySelector('#updateBtn').addEventListener('click', () => {
            // Tell the Service Worker to skip waiting and activate
            worker.postMessage({ action: 'skipWaiting' });
            div.remove();
        });

        div.querySelector('#dismissUpdate').addEventListener('click', () => {
            div.remove();
        });
    }

    /**
     * Setup global event listeners
     */
    setupEventListeners() {
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('input', () => {
                messageInput.style.height = 'auto';
                messageInput.style.height = Math.min(messageInput.scrollHeight, 150) + 'px';
            });
        }
    }

    // ... [Rest of the file remains the same: showView, renderSidebar, etc.] ...
    // Ensure you copy the rest of the methods from your original file
    // or I can provide the full file if needed, but brevity suggests keeping existing methods.
    
    showView(viewId) {
        const views = ['welcomeView', 'chatView', 'settingsView', 'projectView'];
        views.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.display = id === viewId ? 'flex' : 'none';
            }
        });
        this.currentView = viewId;
    }

    switchTab(tabName) {
        this.sidebarTab = tabName;
        const tabs = ['chats', 'projects', 'stories', 'sprints', 'agents'];
        tabs.forEach(tab => {
            const button = document.getElementById(`tab-${tab}`);
            const content = document.getElementById(`sidebar-${tab}`);
            if (button) {
                if (tab === tabName) {
                    button.classList.add('border-white', 'text-white');
                    button.classList.remove('border-transparent', 'text-white/60');
                } else {
                    button.classList.remove('border-white', 'text-white');
                    button.classList.add('border-transparent', 'text-white/60');
                }
            }
            if (content) {
                content.style.display = tab === tabName ? 'block' : 'none';
            }
        });
        this.renderSidebar();
    }

    renderSidebar() {
        if (this.sidebarTab === 'chats') {
            this.renderChatsList();
        } else if (this.sidebarTab === 'projects') {
            this.renderProjectsList();
        }
    }

    renderChatsList() {
        const container = document.getElementById('sidebar-chats');
        if (!container) return;

        const chats = this.chatManager.currentProjectId 
            ? this.chatManager.getChatsByProject(this.chatManager.currentProjectId)
            : this.chatManager.getActiveChats();

        if (chats.length === 0) {
            container.innerHTML = `
                <div class="text-center text-white/60 py-8 px-4">
                    <i data-lucide="message-square" class="w-12 h-12 mx-auto mb-3 opacity-50"></i>
                    <p class="text-sm">No chats yet</p>
                    <p class="text-xs mt-1">Click "New Chat" to start</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        container.innerHTML = chats.map(chat => {
            const isActive = chat.id === this.chatManager.currentChatId;
            const lastMessage = chat.getLastMessage();
            const preview = lastMessage 
                ? (lastMessage.content.substring(0, 60) + (lastMessage.content.length > 60 ? '...' : ''))
                : 'No messages';

            return `
                <div onclick="loadChat('${chat.id}')" 
                     class="card mb-2 ${isActive ? 'ring-2 ring-white/30' : ''}" 
                     style="padding: 12px;">
                    <div class="flex items-start justify-between gap-2 mb-1">
                        <h3 class="font-semibold text-white text-sm flex-1 truncate">${this.escapeHtml(chat.title)}</h3>
                        ${chat.pinned ? '<i data-lucide="pin" class="w-3 h-3 text-yellow-300 flex-shrink-0"></i>' : ''}
                    </div>
                    <p class="text-white/60 text-xs truncate mb-2">${this.escapeHtml(preview)}</p>
                    <div class="flex items-center justify-between text-xs text-white/40">
                        <span>${chat.getMessageCount()} messages</span>
                        <span>${this.formatDate(chat.updatedAt)}</span>
                    </div>
                </div>
            `;
        }).join('');

        lucide.createIcons();
    }

    renderProjectsList() {
        const container = document.getElementById('sidebar-projects');
        if (!container) return;
        container.innerHTML = `
            <div class="text-center text-white/60 py-8 px-4">
                <i data-lucide="folder" class="w-12 h-12 mx-auto mb-3 opacity-50"></i>
                <p class="text-sm">No projects yet</p>
                <p class="text-xs mt-1">Click "Project" to create one</p>
            </div>
        `;
        lucide.createIcons();
    }

    renderMessages(messages) {
        const container = document.getElementById('messagesContainer');
        if (!container) return;

        if (!messages || messages.length === 0) {
            container.innerHTML = `
                <div class="flex items-center justify-center h-full text-white/60">
                    <div class="text-center">
                        <i data-lucide="message-square" class="w-16 h-16 mx-auto mb-4 opacity-30"></i>
                        <p class="text-lg">Start a conversation</p>
                        <p class="text-sm mt-2">Type your message below</p>
                    </div>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        container.innerHTML = messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            const alignment = isUser ? 'justify-end' : 'justify-start';
            const fadeClass = 'fade-in';

            let agentBadge = '';
            if (!isUser && msg.agentId) {
                agentBadge = `
                    <div class="agent-badge">
                        <i data-lucide="bot" class="w-3 h-3"></i>
                        Agent
                    </div>
                `;
            }

            let providerInfo = '';
            if (!isUser && msg.providerName) {
                providerInfo = `
                    <div class="flex items-center gap-2 text-xs text-white/50 mt-2">
                        <i data-lucide="cpu" class="w-3 h-3"></i>
                        <span>${this.escapeHtml(msg.providerName)} · ${this.escapeHtml(msg.modelName || msg.modelId)}</span>
                    </div>
                `;
            }

            const content = isUser ? this.escapeHtml(msg.content) : this.renderMarkdown(msg.content);

            return `
                <div class="message message-${msg.role} flex ${alignment} mb-4 ${fadeClass}" data-message-id="${msg.id}">
                    <div class="message-bubble">
                        ${agentBadge}
                        <div class="message-content">${content}</div>
                        ${providerInfo}
                        <div class="text-xs text-white/40 mt-2">${msg.getFormattedTime()}</div>
                    </div>
                </div>
            `;
        }).join('');

        container.querySelectorAll('pre code').forEach((block) => {
            Prism.highlightElement(block);
        });

        lucide.createIcons();
        this.scrollToBottom();
    }

    renderMarkdown(content) {
        try {
            return marked.parse(content);
        } catch (e) {
            console.error('Markdown parse error:', e);
            return this.escapeHtml(content);
        }
    }

    showTypingIndicator() {
        const container = document.getElementById('messagesContainer');
        if (!container) return;

        const typing = document.createElement('div');
        typing.id = 'typing';
        typing.className = 'flex justify-start mb-4 fade-in';
        typing.innerHTML = `
            <div class="message-bubble" style="background: rgba(102, 126, 234, 0.15);">
                <div class="flex items-center gap-2">
                    <div class="typing-dots">
                        <span></span><span></span><span></span>
                    </div>
                    <span class="text-white/60 text-sm">Thinking...</span>
                </div>
            </div>
        `;
        container.appendChild(typing);
        this.scrollToBottom();
    }

    notify(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-[200] px-4 py-3 rounded-lg shadow-lg text-white fade-in ${
            type === 'error' ? 'bg-red-500' : 
            type === 'success' ? 'bg-green-500' : 
            'bg-blue-500'
        }`;
        notification.innerHTML = `
            <div class="flex items-center gap-2">
                <i data-lucide="${type === 'error' ? 'alert-circle' : type === 'success' ? 'check-circle' : 'info'}" class="w-5 h-5"></i>
                <span>${this.escapeHtml(message)}</span>
            </div>
        `;
        document.body.appendChild(notification);
        lucide.createIcons();

        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    updateChatHeader(chat) {
        if (!chat) return;
        const titleEl = document.getElementById('chatTitle');
        const subtitleEl = document.getElementById('chatSubtitle');
        if (titleEl) titleEl.textContent = chat.title;
        if (subtitleEl) {
            const messageCount = chat.getMessageCount();
            const aiCount = chat.getAIMessageCount();
            subtitleEl.textContent = `${messageCount} messages · ${aiCount} AI responses`;
        }
    }

    updateProjectContext(projectId, projectName) {
        const contextBar = document.getElementById('projectContext');
        const nameEl = document.getElementById('currentProjectName');
        if (projectId && projectName) {
            contextBar.style.display = 'block';
            nameEl.textContent = projectName;
        } else {
            contextBar.style.display = 'none';
        }
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        sidebar.classList.toggle('active');
        if (sidebar.classList.contains('active')) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }

    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        sidebar.classList.remove('active');
        overlay.classList.add('hidden');
    }

    scrollToBottom() {
        const container = document.getElementById('messagesContainer');
        if (container) {
            setTimeout(() => {
                container.scrollTop = container.scrollHeight;
            }, 100);
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.style.display = 'flex';
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.style.display = 'none';
    }

    clearInput() {
        const input = document.getElementById('messageInput');
        if (input) {
            input.value = '';
            input.style.height = 'auto';
        }
    }

    focusInput() {
        const input = document.getElementById('messageInput');
        if (input) input.focus();
    }

    async updateChatProviderSelectors(chat) {
        if (!chat) return;
        const providerSelect = document.getElementById('chatProviderSelect');
        const providers = await this.chatManager.providerStorage.getEnabledProviders();
        
        if (providers.length === 0) {
            providerSelect.innerHTML = '<option value="">No providers configured</option>';
            return;
        }

        providerSelect.innerHTML = '';
        providers.forEach(provider => {
            const option = document.createElement('option');
            option.value = provider.id;
            option.textContent = provider.name;
            providerSelect.appendChild(option);
        });

        let selectedProviderId = chat.defaultProviderId;
        if (!selectedProviderId) {
            const activeId = await this.chatManager.providerStorage.getActiveProvider();
            selectedProviderId = activeId || providers[0].id;
        }
        // Check if the provider actually exists in list (might have been deleted)
        if (!providers.find(p => p.id === selectedProviderId)) {
             selectedProviderId = providers[0].id;
        }
        
        providerSelect.value = selectedProviderId;
        await this.updateChatModelSelector(chat, false);
    }

    async updateChatModelSelector(chat, preserveSelection = false) {
        const providerId = document.getElementById('chatProviderSelect').value;
        const modelSelect = document.getElementById('chatModelSelect');
        
        if (!providerId) {
            modelSelect.innerHTML = '<option>No Provider</option>';
            return;
        }

        const provider = await this.chatManager.providerStorage.getProvider(providerId);
        if (!provider || !provider.models) return;

        const currentSelection = modelSelect.value;
        modelSelect.innerHTML = '';
        
        provider.models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.name + (model.description ? ` - ${model.description}` : '');
            modelSelect.appendChild(option);
        });

        let selectedModelId;
        if (preserveSelection && currentSelection && provider.models.find(m => m.id === currentSelection)) {
            selectedModelId = currentSelection;
        } else if (chat && chat.defaultModelId && provider.models.find(m => m.id === chat.defaultModelId)) {
            selectedModelId = chat.defaultModelId;
        } else {
            selectedModelId = provider.defaultModel || provider.models[0].id;
        }
        modelSelect.value = selectedModelId;

        this.updateStatusText(provider, selectedModelId, chat);
    }

    updateStatusText(provider, modelId, chat) {
        const statusDiv = document.getElementById('chatProviderStatus');
        if(!provider) {
             statusDiv.innerHTML = `<i data-lucide="alert-circle" class="w-3 h-3 text-red-400"></i> <span class="text-red-200">No provider selected</span>`;
             lucide.createIcons();
             return;
        }
        const selectedModel = provider.models.find(m => m.id === modelId);
        const isChatDefault = chat && chat.defaultProviderId === provider.id && chat.defaultModelId === modelId;
        
        statusDiv.innerHTML = `
            <i data-lucide="check-circle" class="w-3 h-3 text-green-400"></i>
            <span class="text-green-200"><strong>${this.escapeHtml(provider.name)}</strong> · ${this.escapeHtml(selectedModel?.name || modelId)}${isChatDefault ? ' (Chat Default)' : ''}</span>
        `;
        lucide.createIcons();
    }
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UIManager };
}