# Contributing to 2sdAI / Threading

Thank you for your interest in contributing! Here's how you can help:

## 🐛 Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/yourusername/2sdAI-Threading/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser and version
   - Console errors (if any)

## 💡 Suggesting Features

1. Check [existing feature requests](https://github.com/yourusername/2sdAI-Threading/issues?q=is%3Aissue+is%3Aopen+label%3Aenhancement)
2. Create a new issue with the `enhancement` label
3. Describe the feature and use case

## 🔧 Development Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/2sdAI-Threading.git
cd 2sdAI-Threading

# Serve locally
npx serve -s . -p 8000

# Open http://localhost:8000
```

## 📝 Code Guidelines

### File Organization
- **CSS**: All styles in `/css/styles.css`
- **Core JS**: Main logic in `/js/` (app.js, ui-manager.js, sync-manager.js)
- **Modules**: Reusable modules in `/js/modules/`
- **Docs**: Documentation in `/docs/`

### Code Style
- Use clear, descriptive variable names
- Add comments for complex logic
- Keep functions focused and small
- Use async/await for async operations

### Commit Messages
Follow conventional commits:
- `feat: Add new feature`
- `fix: Fix bug in X`
- `docs: Update README`
- `style: Format code`
- `refactor: Refactor X`
- `test: Add tests for X`

## 🔀 Pull Request Process

1. **Fork** the repository
2. **Create a branch**: `git checkout -b feature/your-feature-name`
3. **Make changes** and test thoroughly
4. **Commit**: Use clear commit messages
5. **Push**: `git push origin feature/your-feature-name`
6. **Create PR**: Open a pull request with:
   - Clear description of changes
   - Screenshots (if UI changes)
   - Link to related issue

## ✅ Testing Checklist

Before submitting a PR, ensure:
- [ ] Code works in Chrome, Firefox, and Safari
- [ ] No console errors
- [ ] Service Worker still functions
- [ ] Cross-window sync works
- [ ] Offline mode works
- [ ] Mobile responsive
- [ ] No breaking changes (or documented)

## 🏗️ Architecture

Understanding the architecture helps with contributions:

### Data Flow
```
User Action → UI Manager → Chat Manager → Storage (IndexedDB)
                                       ↓
                              AI Provider (API Call)
                                       ↓
                              Sync Manager (Broadcast)
```

### Key Components

**Storage Layer**
- `chat-storage.js`: Chat persistence (IndexedDB)
- `provider-storage.js`: Provider settings (IndexedDB)

**Business Logic**
- `chat-manager.js`: Chat lifecycle, state management
- `ai-provider.js`: API abstraction for multiple providers

**Sync Layer**
- `sync-manager.js`: Cross-window communication
- `sw.js`: Service Worker for offline & relay

**UI Layer**
- `ui-manager.js`: DOM rendering
- `app.js`: Event handlers, glue code

## 🎨 Adding a New AI Provider

1. Add template in `ai-provider.js`:
```javascript
newprovider: {
    name: 'New Provider',
    type: 'newprovider',
    apiUrl: 'https://api.example.com/v1/chat/completions',
    defaultModel: 'model-name',
    models: [...]
}
```

2. Add option in `index.html` provider modal
3. Test connection and message sending
4. Update README with instructions

## 🌐 Adding Translations

Currently, the app is in English. To add translations:
1. Create `js/i18n.js` with translation system
2. Extract all user-facing strings
3. Create language files in `/locales/`
4. Submit PR with at least one complete translation

## 📱 PWA Improvements

Ideas for PWA enhancements:
- Background sync for offline messages
- Push notifications for responses
- Share target API
- Better caching strategies

## 🔒 Security Considerations

When contributing, keep in mind:
- Never log API keys
- Use Web Crypto API for encryption (current: base64)
- Sanitize user input
- Validate API responses
- Use Content Security Policy

## 📚 Resources

- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [PWA Guide](https://web.dev/progressive-web-apps/)
- [BroadcastChannel](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel)

## 💬 Questions?

- Open a [Discussion](https://github.com/yourusername/2sdAI-Threading/discussions)
- Join our community (if applicable)
- Tag maintainers in issues

## 🙏 Recognition

Contributors will be:
- Listed in README
- Credited in release notes
- Appreciated forever! ❤️

Thank you for making this project better!
