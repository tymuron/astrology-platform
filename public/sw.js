// Kill switch for the old network-first service worker.
//
// The previous SW (vastulogie-v1) intercepted every GET and did a network-first
// fetch with a cache fallback. On Safari this caused ~60s page stalls on cold
// launch (e.g. opening a Telegram link in Safari) because a single slow fetch
// would block the whole page until Safari's network timeout. This SW takes
// over from the old one, wipes all caches, unregisters itself, and forces
// open clients to reload SW-free. Future visits get no SW at all because
// index.html no longer calls register().

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        // 1. Wipe every cache the old SW left behind.
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
        // 2. Unregister ourselves.
        await self.registration.unregister();
        // 3. Force-reload any open pages so they navigate without SW control.
        const clients = await self.clients.matchAll({ includeUncontrolled: true });
        clients.forEach((client) => { try { client.navigate(client.url); } catch { } });
    })());
});
