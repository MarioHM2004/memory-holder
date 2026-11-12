/*
 * Memory Holder's service worker.
 *
 * It sits between the app and the network and answers what it can from the
 * phone, so the app stops re-downloading itself over a connection that runs
 * to Singapore.
 *
 * What it deliberately does NOT do is cache pages or data. Those carry the
 * diary itself, the Cache API belongs to the browser rather than to the
 * account, and a worker that served one person's memories to the next user
 * of a phone would be a worse bug than a slow page. Every page is fetched
 * from the network, every time; without a connection you get the offline
 * page instead of yesterday's diary.
 *
 * Bump VERSION whenever these rules change: anything not carrying the
 * current one is deleted on activation.
 */

const VERSION = "v1";
const STATIC = `mh-static-${VERSION}`;
const PHOTOS = `mh-photos-${VERSION}`;
const OFFLINE_URL = "/offline.html";

/** How many photos to keep before dropping the oldest. */
const PHOTO_LIMIT = 400;

/** Build output and icons: hashed filenames, nothing personal, same for everyone. */
const isShared = (url) =>
  url.pathname.startsWith("/_next/static/") ||
  url.pathname.startsWith("/app-icon/") ||
  url.pathname === "/icon.svg" ||
  url.pathname === "/apple-icon" ||
  url.pathname === "/manifest.webmanifest" ||
  url.pathname === OFFLINE_URL;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC);
      await cache.add(OFFLINE_URL);
      // Taking over immediately is safe here because every cached asset is
      // addressed by a hashed filename: a page from the old build still asks
      // for the files that build shipped, and those are still served.
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith("mh-") && !name.endsWith(VERSION))
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  // Sent when someone signs out. The photos are already in the browser's own
  // cache for a year — the /media route says so — but leaving them in a
  // store of our own after someone has left isn't ours to decide.
  if (event.data?.type === "signout") {
    event.waitUntil(caches.delete(PHOTOS));
  }
});

/** The Cache API has no eviction of its own; oldest out once it's full. */
async function trim(cacheName, limit) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= limit) return;
  await Promise.all(keys.slice(0, keys.length - limit).map((key) => cache.delete(key)));
}

async function fromCacheFirst(request, cacheName, limit) {
  const cached = await caches.match(request, { cacheName });
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
    if (limit) await trim(cacheName, limit);
  }
  return response;
}

async function handlePage(request) {
  try {
    return await fetch(request);
  } catch {
    const offline = await caches.match(OFFLINE_URL, { cacheName: STATIC });
    if (offline) return offline;
    throw new Error("offline");
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Supabase, Resend, anything else: not ours, and signed links expire in
  // ways this would have no idea about.
  if (url.origin !== self.location.origin) return;

  // Never: a cached answer to a send or an export is a bug with
  // consequences, not a stale page.
  if (url.pathname.startsWith("/api/")) return;

  if (isShared(url)) {
    event.respondWith(fromCacheFirst(request, STATIC));
    return;
  }

  // Photos keyed by their URL, which holds a media id only someone who could
  // already open that photo would know.
  if (url.pathname.startsWith("/media/")) {
    event.respondWith(fromCacheFirst(request, PHOTOS, PHOTO_LIMIT));
    return;
  }

  // Full page loads only — not the partial fetches Next makes when the app
  // navigates on its own, which have no page to fall back to. The network is
  // always asked; the cache is never consulted for a page.
  if (request.mode === "navigate") {
    event.respondWith(handlePage(request));
  }
});
