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

// Global in-memory cache for album artwork to prevent repeated disk/IPC hits
const artMemoryCache = new Map<string, string>();
const inFlightRequests = new Map<string, Promise<string | null>>();

export async function getAlbumArtCached(path: string): Promise<string | null> {
    if (!path) return null;
    if (artMemoryCache.has(path)) {
        return artMemoryCache.get(path)!;
    }
    if (inFlightRequests.has(path)) {
        return inFlightRequests.get(path)!;
    }

    const fetchPromise = invoke<string | null>("get_album_art", { path })
        .then(art => {
            if (art) {
                artMemoryCache.set(path, art);
            }
            inFlightRequests.delete(path);
            return art;
        })
        .catch(err => {
            console.warn("Album art load error:", err);
            inFlightRequests.delete(path);
            return null;
        });

    inFlightRequests.set(path, fetchPromise);
    return fetchPromise;
}
