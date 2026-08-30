const STATIC_CACHE = "potb-static-v4-0-7";
const CORE_CACHE = "potb-core-v4-0-7";
const MAP_CACHE = "potb-map-v4-0-7";
const RADAR_CACHE = "potb-radar-v4-0-7";

const MAP_CACHE_LIMIT = 500;
const RADAR_CACHE_LIMIT = 32;

const STATIC_ASSETS = [
	"./",
	"./index.html",
	"./manifest.json",
	"./icon.svg"
];

self.addEventListener("install", event => {
	event.waitUntil(
		caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS))
	);
	self.skipWaiting();
});

self.addEventListener("activate", event => {
	const keep = [STATIC_CACHE, CORE_CACHE, MAP_CACHE, RADAR_CACHE];

	event.waitUntil(
		caches.keys().then(keys => Promise.all(
			keys
				.filter(key => !keep.includes(key))
				.map(key => caches.delete(key))
		))
	);
	self.clients.claim();
});

async function trimCache(cacheName, maxEntries) {
	const cache = await caches.open(cacheName);
	const keys = await cache.keys();

	if (keys.length <= maxEntries) {
		return;
	}

	const removeCount = keys.length - maxEntries;
	await Promise.all(
		keys.slice(0, removeCount).map(key => cache.delete(key))
	);
}

function isLeafletAsset(url) {
	return url.hostname === "unpkg.com";
}

function isMapTile(url) {
	return (
		url.hostname.endsWith("tile.opentopomap.org") ||
		url.hostname === "tile.openstreetmap.org"
	);
}

function isRadarTile(url) {
	return url.hostname.includes("rainviewer");
}

async function cacheFirst(request, cacheName, limit = null) {
	const cached = await caches.match(request);

	if (cached) {
		return cached;
	}

	const response = await fetch(request);
	const cache = await caches.open(cacheName);
	await cache.put(request, response.clone());

	if (limit !== null) {
		await trimCache(cacheName, limit);
	}

	return response;
}

self.addEventListener("fetch", event => {
	const request = event.request;

	if (request.method !== "GET") {
		return;
	}

	const url = new URL(request.url);

	if (url.origin === self.location.origin) {
		event.respondWith(
			caches.match(request).then(cached => {
				if (cached) {
					return cached;
				}

				return fetch(request).then(async response => {
					const cache = await caches.open(STATIC_CACHE);
					await cache.put(request, response.clone());
					return response;
				}).catch(() => caches.match("./index.html"));
			})
		);
		return;
	}

	if (isLeafletAsset(url)) {
		event.respondWith(cacheFirst(request, CORE_CACHE));
		return;
	}

	if (isMapTile(url)) {
		event.respondWith(cacheFirst(request, MAP_CACHE, MAP_CACHE_LIMIT));
		return;
	}

	if (isRadarTile(url)) {
		event.respondWith(cacheFirst(request, RADAR_CACHE, RADAR_CACHE_LIMIT));
	}
});
