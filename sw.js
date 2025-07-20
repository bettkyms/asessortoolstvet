const CACHE_NAME = 'assessor-tool-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/main.js',
  '/manifest.json',
  '/assets/icons/icon-192x192.svg',
  '/assets/icons/icon-512x512.svg',
  'https://cdn.tailwindcss.com',
  'https://esm.sh/@google/genai@^1.9.0',
  'https://esm.sh/docx@8.5.0',
  'https://esm.sh/file-saver@2.0.5',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        // Use addAll for atomic operation, but be mindful of failures.
        // For production, a more robust strategy might be needed.
        return cache.addAll(urlsToCache).catch(err => {
          console.error('Failed to cache all URLs:', err);
          // Even if one fails, the SW might still be useful.
        });
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request because it's a stream and can be consumed only once.
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          (response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              if(event.request.url.startsWith('https://esm.sh/')) {
                 // Don't cache opaque responses from esm.sh
                 return response;
              }
            }
            
            // Clone the response because it's a stream and can be consumed only once.
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                // We don't cache POST requests or other non-GET requests
                if(event.request.method === 'GET') {
                    cache.put(event.request, responseToCache);
                }
              });

            return response;
          }
        );
      })
  );
});


self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
