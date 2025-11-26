// Update this version string to force a cache refresh for all users
const APP_VERSION = 'v1.0.5'; 
const CACHE_NAME = `ai-team-manager-${APP_VERSION}`;

// Assets to cache for offline use
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './css/styles.css',
    './js/app.js',
    './js/modules/ui-manager.js',
    './js/modules/sync-manager.js',
    './js/modules/chat-manager.js',
    './js/modules/chat.js',
    './js/modules/message.js',
    './js/modules/chat-storage.js',
    './js/modules/provider-storage.js',
    './js/modules/ai-provider.js',
    './js/modules/provider-factory.js',
    './manifest.json',
    // External CDN Dependencies
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/lucide@latest',
    'https://cdn.jsdelivr.net/npm/marked@9.1.6/marked.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-javascript.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-python.min.js'
];

// Install: Cache core assets
self.addEventListener('install', (event) => {
    console.log(`[SW] Installing version ${APP_VERSION}`);
    self.skipWaiting(); 
    
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching assets');
            return cache.addAll(ASSETS_TO_CACHE).catch(err => {
                console.error('[SW] Cache failed for some assets:', err);
            });
        })
    );
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
    console.log(`[SW] Activating version ${APP_VERSION}`);
    event.waitUntil(
        Promise.all([
            self.clients.claim(),
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
        ])
    );
});

// Handle messages from clients (for update notifications and sync relay)
self.addEventListener('message', (event) => {
    if (event.data && event.data.action === 'skipWaiting') {
        console.log('[SW] Skip waiting requested');
        self.skipWaiting();
    }
    
    // Sync relay: broadcast to all other clients
    if (event.data && event.data.type === 'sync-relay') {
        const syncMessage = event.data.syncMessage;
        console.log('[SW] Relaying sync message:', syncMessage.type);
        
        // Broadcast to all clients (tabs and windows)
        self.clients.matchAll({ type: 'window' }).then(clients => {
            clients.forEach(client => {
                // Send to all clients except the sender
                if (client.id !== event.source.id) {
                    client.postMessage({
                        type: 'sync-' + syncMessage.type,
                        data: syncMessage.data,
                        timestamp: syncMessage.timestamp
                    });
                }
            });
        });
    }
    
    // Test relay for debugging
    if (event.data && event.data.type === 'test-relay') {
        console.log('[SW] Test relay:', event.data.data);
        
        self.clients.matchAll({ type: 'window' }).then(clients => {
            clients.forEach(client => {
                if (client.id !== event.source.id) {
                    client.postMessage({
                        type: 'test-received',
                        data: event.data.data
                    });
                }
            });
        });
    }
});

// Fetch: Stale-while-revalidate for assets, Network Only for APIs
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // 1. Ignore API calls or non-GET methods (Network Only)
    if (event.request.method !== 'GET' || 
        url.pathname.includes('/api/') || 
        url.pathname.includes('chat/completions') ||
        url.pathname.includes('/messages')) {
        return; 
    }

    // 2. For HTML requests, use network-first strategy to get updates faster
    if (event.request.headers.get('accept').includes('text/html')) {
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                    return networkResponse;
                })
                .catch(() => {
                    return caches.match(event.request);
                })
        );
        return;
    }

    // 3. Stale-while-revalidate strategy for static assets
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Network failed, use cache if available
                return cachedResponse;
            });

            return cachedResponse || fetchPromise;
        })
    );
});
