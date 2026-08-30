const STATIC_CACHE = "potb-static-v4-0-9";
const CORE_CACHE = "potb-core-v4-0-9";
const MAP_CACHE = "potb-map-v4-0-9";
const RADAR_CACHE = "potb-radar-v4-0-9";

const MAP_CACHE_LIMIT = 500;
const RADAR_CACHE_LIMIT = 32;

const APP_SHELL_URL = new URL("./index.html", self.registration.scope).href;
const ROOT_URL = new URL("./", self.registration.scope).href;

const OPTIONAL_STATIC_ASSETS = [
	new URL("./manifest.json", self.registration.scope).href,
	new URL("./icon.svg", self.registration.scope).href
];

self.addEventListener("install", event => {
	event.waitUntil((async () => {
		const cache = await caches.open(STATIC_CACHE);

		// index.html is the one asset that must exist for an offline cold start.
		const shellResponse = await fetch(APP_SHELL_URL, { cache: "reload" });

		if (!shellResponse.ok) {
			throw new Error(`Could not cache app shell: HTTP ${shellResponse.status}`);
		}

		await cache.put(APP_SHELL_URL, shellResponse.clone());

		// Cache the root URL too because a home-screen launch may navigate to
		// either /repo/ or /repo/index.html depending on install/browser state.
		await cache.put(ROOT_URL, shellResponse.clone());

		// Manifest/icon failure must not invalidate the whole service-worker install.
		await Promise.allSettled(
			OPTIONAL_STATIC_ASSETS.map(async url => {
				const response = await fetch(url, { cache: "reload" });
				if (response.ok) {
					await cache.put(url, response.clone());
				}
			})
		);
	})());

	self.skipWaiting();
});

self.addEventListener("activate", event => {
	const keep = [STATIC_CACHE, CORE_CACHE, MAP_CACHE, RADAR_CACHE];

	event.waitUntil((async () => {
		const keys = await caches.keys();

		await Promise.all(
			keys
				.filter(key => !keep.includes(key))
				.map(key => caches.delete(key))
		);

		await self.clients.claim();
	})());
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

	if (!response || !response.ok) {
		return response;
	}

	const cache = await caches.open(cacheName);
	await cache.put(request, response.clone());

	if (limit !== null) {
		await trimCache(cacheName, limit);
	}

	return response;
}

async function appShellResponse(request) {
	const cache = await caches.open(STATIC_CACHE);
	const cachedShell =
		await cache.match(APP_SHELL_URL) ||
		await cache.match(ROOT_URL);

	// Prefer the cached shell immediately. Refresh it opportunistically when
	// online, but never make app startup depend on the network.
	if (cachedShell) {
		fetch(request)
			.then(async response => {
				if (response?.ok) {
					await cache.put(APP_SHELL_URL, response.clone());
					await cache.put(ROOT_URL, response.clone());
				}
			})
			.catch(() => {});

		return cachedShell;
	}

	// First ever launch before installation completed.
	try {
		const response = await fetch(request);

		if (response?.ok) {
			await cache.put(APP_SHELL_URL, response.clone());
			await cache.put(ROOT_URL, response.clone());
		}

		return response;
	} catch {
		return new Response(
			"PoTB Trail Assistant ist noch nicht für den Offline-Start vorbereitet. Einmal mit Internet öffnen und 'Offline-Kern vorbereiten' ausführen.",
			{
				status: 503,
				headers: { "Content-Type": "text/plain; charset=utf-8" }
			}
		);
	}
}

self.addEventListener("fetch", event => {
	const request = event.request;

	if (request.method !== "GET") {
		return;
	}

	const url = new URL(request.url);

	// Navigation requests must always fall back to the cached app shell.
	if (request.mode === "navigate") {
		event.respondWith(appShellResponse(request));
		return;
	}

	if (url.origin === self.location.origin) {
		event.respondWith(
			caches.match(request).then(async cached => {
				if (cached) {
					return cached;
				}

				try {
					const response = await fetch(request);

					if (response?.ok) {
						const cache = await caches.open(STATIC_CACHE);
						await cache.put(request, response.clone());
					}

					return response;
				} catch {
					return caches.match(APP_SHELL_URL);
				}
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
