# 2sdAI / Threading

A modern, Progressive Web App (PWA) for multi-agent AI collaboration with real-time cross-window synchronization.

![Version](https://img.shields.io/badge/version-1.0.3-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 🌟 Features

- **Multi-Provider Support**: Connect to OpenAI, Anthropic Claude, OpenRouter, Groq, DeepSeek, and custom APIs
- **Real-Time Sync**: Cross-tab and cross-window synchronization using Service Workers
- **Offline-First**: Full offline support with Service Worker caching
- **PWA Ready**: Installable as a Progressive Web App
- **Privacy-First**: All data stored locally in IndexedDB, API keys encrypted
- **Responsive Design**: Works on desktop, tablet, and mobile

## 🚀 Quick Start

### Option 1: Direct Usage
1. Clone this repository
2. Serve with any static web server:
   ```bash
   # Python
   python -m http.server 8000
   
   # Node.js
   npx serve
   
   # PHP
   php -S localhost:8000
   ```
3. Open `http://localhost:8000` in your browser

### Option 2: Deploy to GitHub Pages
1. Fork this repository
2. Go to Settings → Pages
3. Select branch `main` and folder `/` (root)
4. Your app will be live at `https://yourusername.github.io/2sdAI-Threading/`

## 📁 Project Structure

```
2sdAI-Threading/
├── index.html              # Main entry point
├── manifest.json           # PWA manifest
├── sw.js                   # Service Worker
├── css/
│   └── styles.css          # All styles
├── js/
│   ├── app.js              # Main application logic
│   ├── ui-manager.js       # UI rendering & interactions
│   ├── sync-manager.js     # Cross-window synchronization
│   └── modules/
│       ├── chat-classes.js      # Chat & Message classes
│       ├── chat-manager.js      # Chat state management
│       ├── chat-storage.js      # IndexedDB for chats
│       ├── ai-provider.js       # AI provider implementations
│       └── provider-storage.js  # IndexedDB for providers
├── assets/
│   └── icons/              # PWA icons (add your own)
└── docs/                   # Documentation
```

## 🔧 Configuration

### Adding AI Providers

1. Click **Settings** in the sidebar
2. Click **Add Provider**
3. Select a template or create custom:
   - **OpenAI**: Requires API key from platform.openai.com
   - **Anthropic**: Requires API key from console.anthropic.com
   - **OpenRouter**: Requires API key from openrouter.ai (many free models!)
   - **Groq**: Requires API key from groq.com
   - **Custom**: Any OpenAI-compatible API

### OpenRouter Free Models

OpenRouter provides 18+ free models including:
- Meta Llama 3.3 70B
- Google Gemini 2.0 Flash
- Mistral & Mixtral models
- Microsoft Phi-3 models
- And more!

## 🛠️ Development

### Architecture

The app uses a modular architecture:

1. **Storage Layer** (`chat-storage.js`, `provider-storage.js`)
   - IndexedDB for persistent data
   - Encrypted API key storage

2. **Business Logic** (`chat-manager.js`, `ai-provider.js`)
   - Chat lifecycle management
   - AI provider abstraction

3. **Sync Layer** (`sync-manager.js`)
   - BroadcastChannel for instant tab sync
   - Service Worker relay for cross-window sync

4. **UI Layer** (`ui-manager.js`, `app.js`)
   - DOM rendering and events
   - User interactions

### Key Technologies

- **IndexedDB**: Local database for chats and settings
- **Service Workers**: Offline caching and message relay
- **BroadcastChannel API**: Real-time cross-tab communication
- **Marked.js**: Markdown rendering
- **Prism.js**: Code syntax highlighting
- **Tailwind CSS**: Utility-first styling (via CDN)

## 🌐 Browser Support

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ Full | Including PWA install |
| Firefox | ✅ Full | Service Worker works, no PWA install on desktop |
| Safari | ✅ Full | Including iOS PWA |
| Edge | ✅ Full | Chromium-based |

## 📱 PWA Installation

### Desktop (Chrome/Edge)
1. Click the install icon in the address bar
2. Or click "Install App" button in the sidebar

### Mobile (Chrome Android / Safari iOS)
1. Tap the browser menu
2. Select "Add to Home Screen"
3. App opens in fullscreen mode

### Firefox
Service Workers work for offline functionality, but Firefox desktop doesn't support PWA installation. On Android, use "Add to Home Screen."

## 🔒 Privacy & Security

- **Local-First**: All data stored in browser's IndexedDB
- **No Server**: App runs entirely client-side
- **API Keys**: Encrypted using browser's built-in crypto (base64 for now, upgrade to Web Crypto API recommended)
- **No Tracking**: No analytics, no third-party scripts (except CDN libraries)

## 🐛 Troubleshooting

### Service Worker Not Ready
On first load, Service Worker takes a moment to activate. Refresh the page once.

### Cross-Window Sync Not Working
1. Ensure both windows are on the exact same origin (e.g., both `localhost:8000`)
2. Check console for sync messages
3. Hard reload both windows (Ctrl+Shift+R)

### Provider Connection Fails
1. Verify API key is correct
2. Check if URL ends with `/chat/completions`
3. Use "Test Connection" before saving

### Chat Not Saving
1. Check browser console for IndexedDB errors
2. Ensure browser storage isn't full
3. Try incognito mode to rule out extensions

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - feel free to use this project for any purpose.

## 🙏 Acknowledgments

- Built with modern web standards
- Inspired by ChatGPT and Claude interfaces
- Uses OpenRouter for multi-model access

## 📞 Support

- **Issues**: Open an issue on GitHub
- **Documentation**: See `/docs` folder
- **Updates**: Watch repository for updates

## 🗺️ Roadmap

- [ ] Web Crypto API for better encryption
- [ ] Export/import chats as JSON
- [ ] Dark/light theme toggle
- [ ] Multi-language support
- [ ] Voice input/output
- [ ] Image generation support
- [ ] RAG (Retrieval Augmented Generation)
- [ ] Multi-user collaboration

---

**Made with ❤️ for the AI community**
