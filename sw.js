/* Hyderabad Home Tutors — service worker (PWA shell cache, v1).
   Caches only the same-origin app shell. Never caches Firebase / Google API
   calls, the AI chatbot backend, or analytics — those always go to network. */
var CACHE = "hht-shell-v2";
var PRECACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-512-maskable.png",
  "/apple-touch-icon.png",
  "/og-image.jpg"
];
var NEVER_CACHE = [
  "firestore.googleapis.com",
  "googleapis.com",
  "gstatic.com",
  "googletagmanager.com",
  "googlesyndication.com",
  "firebaseapp.com",
  "firebaseio.com",
  "script.google.com",
  "google-analytics.com"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(PRECACHE); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

function neverCache(url) {
  return NEVER_CACHE.some(function (h) { return url.indexOf(h) !== -1; });
}

self.addEventListener("fetch", function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  if (neverCache(e.request.url)) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
      var net = fetch(e.request).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () { return hit; });
      // Shell files: serve cache first, refresh in background.
      // Other same-origin files: network first, fall back to cache.
      if (PRECACHE.indexOf(url.pathname) !== -1 || url.pathname === "/") {
        return hit || net;
      }
      return net.catch(function () { return hit; });
    })
  );
});
