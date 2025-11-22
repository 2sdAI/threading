# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.3] - 2024-11-22

### Added
- Cross-window synchronization using Service Workers and BroadcastChannel
- Hybrid sync approach for instant updates
- Chat settings modal for title and provider configuration
- Comprehensive OpenRouter model list (30+ models, 18 free!)
- Deduplication for sync messages
- Documentation in `/docs/` folder

### Fixed
- API key persistence when editing providers
- Service Worker not ready on first load
- Clear chat sync between windows
- Chat settings sync across tabs
- Model selector not populating

### Changed
- Modular project structure
- Service Worker to v1.0.3
- Improved error handling
- Better console logging

## [1.0.0] - 2024-11-22

### Added
- Initial release
- Multi-provider AI support (OpenAI, Anthropic, OpenRouter, Groq, DeepSeek)
- Progressive Web App with offline support
- IndexedDB storage for chats and providers
- Encrypted API key storage
- Markdown rendering with syntax highlighting
- Real-time chat interface
- Provider management UI
- Chat history and sidebar
- Responsive design

### Security
- Local-first architecture
- Client-side only (no server)
- Encrypted API keys (base64 - upgrade to Web Crypto API recommended)

## [Unreleased]

### Planned
- Export/import chats
- Dark/light theme toggle
- Voice input/output
- Image generation support
- RAG (Retrieval Augmented Generation)
- Multi-user collaboration
- Web Crypto API encryption
- Better mobile UX
- Keyboard shortcuts
- Chat search
- Message editing
- Message regeneration

---

## Version History

### Version Numbering
- **Major (X.0.0)**: Breaking changes
- **Minor (0.X.0)**: New features, backwards compatible
- **Patch (0.0.X)**: Bug fixes, small improvements

### Support
For questions or issues, please open an issue on GitHub.
