# Service Worker vs Tab Sync - Explanation

## Service Worker (sw.js)

### What It Does ✅
- **Caches assets** (HTML, CSS, JS, images) for offline use
- **Intercepts network requests** to serve cached files
- **Enables PWA installation** (Add to Home Screen)
- **Handles app updates** (new versions)
- **Runs in background** (even when app is closed)

### What It Does NOT Do ❌
- Does NOT sync data between tabs in real-time
- Does NOT manage application state
- Does NOT communicate between tabs

### Expected Behavior
- **"Stopped" status is NORMAL** - Service workers sleep when idle to save resources
- They wake up automatically on events (fetch, message, etc.)
- Think of them as smart caching layers, not data sync tools

## Tab Synchronization (sync-manager.js)

### How It Works
We use **BroadcastChannel API** to enable real-time communication between tabs:

```
Tab 1: Creates new chat → Broadcasts "chat-created" event
Tab 2: Receives event → Reloads chat list → Updates UI
```

### Synced Events
1. **chat-created** - New chat created
2. **chat-updated** - Chat modified
3. **chat-deleted** - Chat removed
4. **message-added** - New message sent
5. **provider-updated** - Provider settings changed

### Fallback Mechanisms
1. **BroadcastChannel** (modern browsers - preferred)
2. **localStorage events** (older browsers - fallback)
3. **Visibility change** (refresh on tab focus)

## Why Settings "Just Work"

Settings appear to sync because:
- They're stored in IndexedDB (shared between tabs)
- The settings page reads from IndexedDB when opened
- Simple read operations don't need real-time updates

Chats need active sync because:
- They update frequently (new messages)
- Order changes (most recent first)
- Real-time collaboration feel is expected

## Testing Tab Sync

1. Open app in **two browser tabs**
2. In Tab 1: Create a new chat
3. In Tab 2: Chat list should update immediately
4. In Tab 1: Send a message
5. In Tab 2: If viewing that chat, message appears

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Service Worker | ✅ | ✅ | ✅ | ✅ |
| BroadcastChannel | ✅ | ✅ | ✅ | ✅ |
| PWA Install | ✅ | ❌ | ✅ (iOS) | ✅ |

**Note:** Firefox supports service workers and BroadcastChannel, but not PWA installation on desktop.

## Debugging

### Check Service Worker
```
Firefox: F12 → Application (or Storage) → Service Workers
Chrome: F12 → Application → Service Workers
```

### Check Tab Sync
```
1. Open Console (F12)
2. Look for: "✅ SyncManager initialized with BroadcastChannel"
3. When creating chat: "📨 Sync message received: chat-created"
```

### Force Refresh Data
- Switch to another tab and back (triggers visibility change)
- Hard reload: Ctrl + Shift + R
- Or manually call: `window.syncManager.onTabFocus()`

## Common Issues

**Q: Why is service worker "stopped"?**
A: Normal! It's sleeping, not broken.

**Q: Tabs don't sync?**
A: Check console for sync initialization errors. Make sure sync-manager.js is loaded.

**Q: Settings sync but chats don't?**
A: Settings don't need real-time sync. Chats do. Make sure you're using the updated files.

**Q: Firefox says "Not installable"?**
A: Firefox desktop doesn't support PWA install, but service worker still works for caching!

## Performance

- **BroadcastChannel:** Very fast, no polling, minimal overhead
- **Service Worker:** Only active during fetch/events, uses ~0% CPU when idle
- **IndexedDB:** Asynchronous, doesn't block UI

## Summary

```
Service Worker = Offline caching + PWA features
SyncManager = Real-time tab synchronization

Both are needed but serve different purposes!
```
