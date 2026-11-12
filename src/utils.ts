import { invoke } from "@tauri-apps/api/core";

export function formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
}

export function formatCount(count: number): string {
    if (!count) return "0";
    if (count >= 1000000) return (count / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    if (count >= 1000) return (count / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    return count.toString();
}

// Global in-memory bounded LRU cache for album artwork (supports positive and negative caching)
const MAX_ART_CACHE_ENTRIES = 250;
const artMemoryCache = new Map<string, string | null>();
const inFlightRequests = new Map<string, Promise<string | null>>();

function normalizePathKey(path: string): string {
    return path.trim().replace(/\\/g, "/").toLowerCase();
}

/**
 * Synchronous lookup in the artwork memory cache.
 * Returns:
 * - `string`: Base64 artwork data URI if cached
 * - `null`: Track is confirmed to have no artwork (negative cache hit)
 * - `undefined`: Track artwork has not been probed yet
 */
export function getAlbumArtSynchronous(path: string): string | null | undefined {
    if (!path) return null;
    const key = normalizePathKey(path);
    return artMemoryCache.get(key);
}

/**
 * Asynchronously fetch and cache album artwork.
 * Caches both positive hits and negative hits (null) to avoid repeated disk reads.
 * Deduplicates in-flight IPC requests.
 */
export async function getAlbumArtCached(path: string): Promise<string | null> {
    if (!path) return null;
    const key = normalizePathKey(path);

    if (artMemoryCache.has(key)) {
        return artMemoryCache.get(key)!;
    }

    if (inFlightRequests.has(key)) {
        return inFlightRequests.get(key)!;
    }

    const fetchPromise = invoke<string | null>("get_album_art", { path })
        .then(art => {
            // Store both positive and negative (null) results
            if (artMemoryCache.size >= MAX_ART_CACHE_ENTRIES) {
                // Evict oldest entry (LRU)
                const oldestKey = artMemoryCache.keys().next().value;
                if (oldestKey) artMemoryCache.delete(oldestKey);
            }
            artMemoryCache.set(key, art ?? null);
            inFlightRequests.delete(key);
            return art ?? null;
        })
        .catch(err => {
            console.warn("Album art load error:", err);
            artMemoryCache.set(key, null);
            inFlightRequests.delete(key);
            return null;
        });

    inFlightRequests.set(key, fetchPromise);
    return fetchPromise;
}

export function clearArtworkCache(): void {
    artMemoryCache.clear();
    inFlightRequests.clear();
}
