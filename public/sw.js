const CACHE = "captchagate-v2";
self.addEventListener("install", (e) => {
  (e as any).waitUntil(
    caches.open(CACHE).then((c) => c.addAll(["/", "/index.html"]))
  );
  self.skipWaiting();
});
self.addEventListener("fetch", (e) => {
  (e as any).respondWith(
    caches.match((e as any).request).then((r) => r || fetch((e as any).request))
  );
});
self.addEventListener("activate", (e) => {
  (e as any).waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
});
