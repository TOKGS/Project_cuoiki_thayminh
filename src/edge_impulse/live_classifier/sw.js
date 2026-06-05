// Service Worker for Bearing Fault Detector PWA
// Enables offline support and faster loading

const CACHE_NAME = 'bearing-fault-v7'; // bump version de buoc browser tai lai
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './manifest.json',
    // app.js KHONG cache - luon fetch moi nhat
    // wasm KHONG cache - qua lon
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    const url = event.request.url;
    // Khong cache: API, fonts, CDN, app.js, WASM
    if (url.includes('edgeimpulse.com') ||
        url.includes('fonts.googleapis.com') ||
        url.includes('cdn.jsdelivr.net') ||
        url.includes('app.js') ||
        url.includes('.wasm') ||
        url.includes('localhost.run')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request).then(cached => {
            return cached || fetch(event.request);
        })
    );
});
