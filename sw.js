// Offline support.
// - Pages (navigation): network first, so an update is picked up at once; cached copy when offline.
// - Files (scripts, styles, icons): cache first; their names change with every build, so they never go stale.
// Never cache an HTML response for a file request: a server fallback page stored in place of a script
// would leave the app blank after an update.
const CACHE = "conti-v2";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) =>
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  ),
);

const cacheable = (res) => res.ok && !(res.headers.get("content-type") ?? "").includes("text/html");

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put("./", copy)); }
          return res;
        })
        .catch(() => caches.match("./").then((r) => r ?? Response.error())),
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((cached) =>
      cached ??
      fetch(req).then((res) => {
        if (cacheable(res)) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      }),
    ),
  );
});
