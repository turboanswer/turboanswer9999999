/* Turbo Answer Service Worker — Windows/PWA optimized
 * - App-shell + runtime caching (offline-ready install)
 * - Web Share Target: accept screenshots/images shared into the app
 * - Background Sync: retry queued work when connectivity returns
 * - Periodic Background Sync: run lightweight tasks in the background
 * - Push notifications
 */

const VERSION = "v1";
const APP_SHELL_CACHE = `turbo-shell-${VERSION}`;
const RUNTIME_CACHE = `turbo-runtime-${VERSION}`;
const SHARED_MEDIA_CACHE = "turbo-shared-media";

const APP_SHELL = [
  "/",
  "/chat",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/favicon.ico",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(APP_SHELL_CACHE);
      await cache.addAll(APP_SHELL).catch(() => {
        /* best-effort: never block install on a single missing asset */
      });
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (k) =>
              k !== APP_SHELL_CACHE &&
              k !== RUNTIME_CACHE &&
              k !== SHARED_MEDIA_CACHE
          )
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// ── Web Share Target: receive screenshots shared from Windows ──────────────────
async function handleShareTarget(event) {
  const formData = await event.request.formData();
  const file =
    formData.get("media") ||
    formData.get("image") ||
    formData.getAll("media")[0];

  if (file && file.size) {
    const cache = await caches.open(SHARED_MEDIA_CACHE);
    const headers = new Headers({
      "Content-Type": file.type || "application/octet-stream",
      "X-Shared-Name": encodeURIComponent(file.name || "screenshot.png"),
    });
    await cache.put(
      "shared-image",
      new Response(file, { headers })
    );
  }
  // Redirect into the app which will pick up the shared image.
  return Response.redirect("/chat?shared=1", 303);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Share target POST — intercept before anything else.
  if (request.method === "POST" && url.pathname === "/share-target") {
    event.respondWith(handleShareTarget(event));
    return;
  }

  // Only handle GET for caching.
  if (request.method !== "GET") return;

  // Never cache API or auth or websocket calls — always go to network.
  if (
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/widget") ||
    url.pathname.includes("/realtime")
  ) {
    return;
  }

  // Navigations: network-first, fall back to cached app shell (offline).
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          return fresh;
        } catch {
          const cache = await caches.open(APP_SHELL_CACHE);
          return (
            (await cache.match("/chat")) ||
            (await cache.match("/")) ||
            Response.error()
          );
        }
      })()
    );
    return;
  }

  // Static assets: stale-while-revalidate.
  if (
    url.origin === self.location.origin &&
    /\.(?:js|css|png|jpg|jpeg|webp|gif|svg|ico|woff2?|ttf)$/.test(url.pathname)
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME_CACHE);
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((resp) => {
            if (resp && resp.status === 200) cache.put(request, resp.clone());
            return resp;
          })
          .catch(() => cached);
        return cached || network;
      })()
    );
  }
});

// ── Background Sync: retry queued work when back online ────────────────────────
self.addEventListener("sync", (event) => {
  if (event.tag === "turbo-sync") {
    event.waitUntil(runBackgroundSync());
  }
});

async function runBackgroundSync() {
  // Notify any open clients so they can flush their own queues.
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  for (const client of clients) {
    client.postMessage({ type: "BACKGROUND_SYNC" });
  }
}

// ── Periodic Background Sync: lightweight recurring background task ────────────
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "turbo-refresh") {
    event.waitUntil(runPeriodicRefresh());
  }
});

async function runPeriodicRefresh() {
  try {
    // Keep the app shell warm so installs stay fast and offline-ready.
    const cache = await caches.open(APP_SHELL_CACHE);
    await cache.addAll(APP_SHELL).catch(() => {});
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
    for (const client of clients) {
      client.postMessage({ type: "PERIODIC_REFRESH" });
    }
  } catch {
    /* best-effort */
  }
}

// ── Push notifications ────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let payload = { title: "Turbo Answer", body: "You have a new update." };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    if (event.data) payload.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-96.png",
      data: { url: payload.url || "/chat" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/chat";
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
