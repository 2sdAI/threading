/**
 * ============================================
 * UI MANAGER MODULE
 * ============================================
 * Handles all UI rendering and interactions
 */

export class UIManager {
    constructor(chatManager) {
        this.chatManager = chatManager;
        this.currentView = 'welcomeView';
        this.sidebarTab = 'chats';
        this.deferredPrompt = null;
    }

    init() {
        // Initialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        // PWA install handling
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            const btn = document.getElementById('pwaInstallBtn');
            if (btn) btn.style.display = 'flex';
        });

        // Set initial view
        this.showView('welcomeView');
    }

    showView(viewId) {
        const views = ['welcomeView', 'chatView', 'settingsView'];
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
                <div class="chat-card card mb-2 ${isActive ? 'ring-2 ring-white/30' : ''}" 
                     data-chat-id="${chat.id}"
                     style="padding: 12px; position: relative;">
                    
                    <!-- Main clickable area -->
                    <div class="chat-card-content" onclick="loadChat('${chat.id}')">
                        <div class="flex items-start justify-between gap-2 mb-1">
                            <h3 class="font-semibold text-white text-sm flex-1 truncate">${this.escapeHtml(chat.title)}</h3>
                            <div class="flex items-center gap-1 flex-shrink-0">
                                ${chat.pinned ? '<i data-lucide="pin" class="w-3 h-3 text-yellow-300"></i>' : ''}
                                ${chat.archived ? '<i data-lucide="archive" class="w-3 h-3 text-gray-400"></i>' : ''}
                            </div>
                        </div>
                        <p class="text-white/60 text-xs truncate mb-2">${this.escapeHtml(preview)}</p>
                        <div class="flex items-center justify-between text-xs text-white/40">
                            <span>${chat.getMessageCount()} messages</span>
                            <span>${this.formatDate(chat.updatedAt)}</span>
                        </div>
                    </div>
                    
                    <!-- Action buttons (visible on hover) -->
                    <div class="chat-card-actions">
                        <button 
                            onclick="event.stopPropagation(); toggleChatPin('${chat.id}')" 
                            class="chat-action-btn ${chat.pinned ? 'active' : ''}"
                            title="${chat.pinned ? 'Unpin chat' : 'Pin chat'}">
                            <i data-lucide="pin" class="w-3.5 h-3.5"></i>
                        </button>
                        <button 
                            onclick="event.stopPropagation(); cloneChatPrompt('${chat.id}')" 
                            class="chat-action-btn"
                            title="Clone chat">
                            <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                        </button>
                        <button 
                            onclick="event.stopPropagation(); archiveChatPrompt('${chat.id}')" 
                            class="chat-action-btn ${chat.archived ? 'active' : ''}"
                            title="${chat.archived ? 'Unarchive chat' : 'Archive chat'}">
                            <i data-lucide="archive" class="w-3.5 h-3.5"></i>
                        </button>
                        <button 
                            onclick="event.stopPropagation(); deleteChatPrompt('${chat.id}')" 
                            class="chat-action-btn chat-action-btn-danger"
                            title="Delete chat">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                        </button>
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

        container.innerHTML = messages.map((msg) => {
            const isUser = msg.role === 'user';
            const alignment = isUser ? 'justify-end' : 'justify-start';
            const bgColor = isUser ? 'bg-purple-600/30' : 'bg-white/10';
            const borderColor = isUser ? 'border-purple-500/30' : 'border-white/10';

            // Format content with markdown
            let formattedContent = msg.content;
            if (typeof marked !== 'undefined') {
                formattedContent = marked.parse(msg.content);
            }

            const providerInfo = msg.providerName
                ? `<span class="text-xs text-white/40">${msg.providerName}${msg.modelName ? ` · ${msg.modelName}` : ''}</span>`
                : '';

            return `
                <div class="flex ${alignment} mb-4 fade-in message-${msg.role}">
                    <div class="message-bubble ${bgColor} border ${borderColor}">
                        ${providerInfo}
                        <div class="prose prose-invert prose-sm max-w-none">
                            ${formattedContent}
                        </div>
                        <div class="text-xs text-white/30 mt-2">${this.formatTime(msg.timestamp)}</div>
                    </div>
                </div>
            `;
        }).join('');

        lucide.createIcons();
        this.scrollToBottom();

        // Apply syntax highlighting
        if (typeof Prism !== 'undefined') {
            Prism.highlightAllUnder(container);
        }
    }

    notify(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-white shadow-lg fade-in ${
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

    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

    /**
     * Show confirmation modal with custom content
     */
    showConfirmModal(options) {
        const { title, message, icon, iconColor, confirmText, confirmClass, onConfirm } = options;

        document.getElementById('confirmModalTitle').textContent = title;
        document.getElementById('confirmModalMessage').textContent = message;

        const iconEl = document.getElementById('confirmModalIcon');
        iconEl.setAttribute('data-lucide', icon || 'alert-triangle');
        iconEl.setAttribute('class', `w-12 h-12 mx-auto mb-4 ${iconColor || 'text-yellow-400'}`);

        const confirmBtn = document.getElementById('confirmModalConfirmBtn');
        confirmBtn.textContent = confirmText || 'Confirm';
        confirmBtn.className = `flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${confirmClass || 'bg-red-500 hover:bg-red-600 text-white'}`;

        // Store callback for confirm button
        window._confirmModalCallback = onConfirm;

        this.showModal('confirmModal');
        lucide.createIcons();
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
            const activeId = await this.chatManager.providerStorage.getActiveProviderID();
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
            option.textContent = model.name + (model.description ? ` (${model.description})` : '');
            modelSelect.appendChild(option);
        });

        // Select appropriate model
        let selectedModelId;
        if (preserveSelection && currentSelection) {
            selectedModelId = currentSelection;
        } else if (chat.defaultModelId) {
            selectedModelId = chat.defaultModelId;
        } else {
            selectedModelId = provider.defaultModel || provider.models[0]?.id;
        }

        if (selectedModelId && provider.models.find(m => m.id === selectedModelId)) {
            modelSelect.value = selectedModelId;
        }
    }

    async installPWA() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                this.notify('App installed successfully!', 'success');
            }
            this.deferredPrompt = null;
            const btn = document.getElementById('pwaInstallBtn');
            if (btn) btn.style.display = 'none';
        }
    }
}
