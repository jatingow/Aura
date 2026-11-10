import { invoke } from "@tauri-apps/api/core";
import { Track, SongLyrics, LyricLine, LyricsSource } from "./types";

const LYRICS_CACHE_PREFIX = "aura_lyrics_v1_";
const MAX_CACHED_TRACKS = 200;

interface LrclibResponse {
    id: number;
    trackName: string;
    artistName: string;
    albumName?: string;
    duration?: number;
    instrumental?: boolean;
    plainLyrics?: string;
    syncedLyrics?: string;
}

/**
 * Parses LRC text into timed LyricLine objects.
 * Supports [mm:ss.xx], [mm:ss.xxx], [mm:ss], [offset:+-ms],
 * multiple timestamps per line, and plain text fallback.
 */
export function parseLrc(text: string, durationSeconds = 0): {
    lines: LyricLine[];
    isSynced: boolean;
    plainLyrics: string;
} {
    if (!text || !text.trim()) {
        return { lines: [], isSynced: false, plainLyrics: "" };
    }

    const durationMs = durationSeconds > 0 ? durationSeconds * 1000 : 0;

    // Check for [offset: +/-ms]
    let offsetMs = 0;
    const offsetMatch = text.match(/\[offset:\s*([+-]?\d{1,7})\s*\]/i);
    if (offsetMatch) {
        offsetMs = parseInt(offsetMatch[1], 10) || 0;
    }

    const stampRegex = /\[(\d{1,3}):([0-5]\d)(?:\.(\d{1,3}))?\]/g;
    const rawLines = text.split(/\r?\n/);
    const parsedEntries: { start: number; text: string }[] = [];

    for (const rawLine of rawLines) {
        // Skip metadata header tags like [ar: ...], [ti: ...], [al: ...]
        if (/^\[(ti|ar|al|by|offset|length|re|ve):/i.test(rawLine.trim())) {
            continue;
        }

        stampRegex.lastIndex = 0;
        let match: RegExpExecArray | null;
        const starts: number[] = [];
        let lastIndex = 0;

        while ((match = stampRegex.exec(rawLine)) !== null) {
            const minutes = parseInt(match[1], 10);
            const seconds = parseInt(match[2], 10);
            const fraction = match[3] || "0";
            // Normalise milliseconds (e.g. .5 -> 500, .50 -> 500, .500 -> 500)
            const ms = parseInt(fraction.padEnd(3, "0").slice(0, 3), 10);

            const timestamp = (minutes * 60 + seconds) * 1000 + ms - offsetMs;
            starts.push(Math.max(0, timestamp));
            lastIndex = stampRegex.lastIndex;
        }

        const words = rawLine.slice(lastIndex).trim();

        if (starts.length > 0) {
            for (const start of starts) {
                parsedEntries.push({ start, text: words });
            }
        }
    }

    // If timed entries were found, assemble synced lyric lines
    if (parsedEntries.length > 0) {
        // Sort by start timestamp ascending
        parsedEntries.sort((a, b) => a.start - b.start);

        // Merge identical timestamps (e.g., dual language / translation lines)
        const merged: { start: number; text: string }[] = [];
        for (const entry of parsedEntries) {
            if (merged.length > 0 && merged[merged.length - 1].start === entry.start) {
                merged[merged.length - 1].text += "\n" + entry.text;
            } else {
                merged.push({ ...entry });
            }
        }

        // Calculate end times: next line's start or start + 5s (capped by song duration)
        const lines: LyricLine[] = merged.map((entry, i) => {
            let end = 0;
            if (i + 1 < merged.length) {
                end = merged[i + 1].start;
            } else if (durationMs > entry.start) {
                end = durationMs;
            } else {
                end = entry.start + 5000;
            }
            return {
                start: entry.start,
                end,
                text: entry.text
            };
        });

        const hasNonEmptyWords = lines.some(l => l.text.trim().length > 0);
        if (hasNonEmptyWords) {
            const plain = lines.map(l => l.text).filter(Boolean).join("\n");
            return { lines, isSynced: true, plainLyrics: plain };
        }
    }

    // Plain text fallback (no timestamps found)
    const plainLines: LyricLine[] = rawLines
        .map(line => line.trim())
        .filter(line => !/^\[(ti|ar|al|by|offset|length):/i.test(line))
        .map(line => ({
            start: -1,
            end: -1,
            text: line
        }));

    const plainText = plainLines.map(l => l.text).join("\n").trim();
    return {
        lines: plainLines,
        isSynced: false,
        plainLyrics: plainText
    };
}

/**
 * Removes noisy metadata tags like (feat. ...), [Remastered], etc.
 * to improve search hit rates on external lyrics databases.
 */
export function cleanQuery(title: string, artist: string): { cleanTitle: string; cleanArtist: string } {
    const cleanTitle = title
        .replace(/\s*[\(\[](?:feat|ft|featuring)[^\)\]]*[\)\]]/gi, "")
        .replace(/\s*[\(\[](?:official|audio|video|lyrics|hd|4k|music video|lyric video|remaster|remastered|\d{4} remaster)[^\)\]]*[\)\]]/gi, "")
        .replace(/\s*-\s*(?:remastered|live|mono|stereo|bonus track)/gi, "")
        .trim();

    const cleanArtist = artist
        .replace(/\s*[\(\[](?:feat|ft|featuring)[^\)\]]*[\)\]]/gi, "")
        .replace(/\s*(?:feat\.|ft\.|featuring).*$/gi, "")
        .trim();

    return {
        cleanTitle: cleanTitle || title,
        cleanArtist: cleanArtist || artist
    };
}

/**
 * Fetches lyrics from LRCLIB with exact match lookup and search fallback.
 */
export async function fetchLrclib(
    title: string,
    artist: string,
    album?: string,
    duration?: number,
    signal?: AbortSignal
): Promise<{ rawLrc?: string; plainLyrics?: string; isSynced: boolean } | null> {
    const dur = Math.round(duration || 0);

    // 1. Try exact match lookup
    try {
        const params = new URLSearchParams({
            track_name: title,
            artist_name: artist
        });
        if (dur > 0) params.set("duration", dur.toString());
        if (album && album.trim()) params.set("album_name", album.trim());

        const res = await fetch(`https://lrclib.net/api/get?${params.toString()}`, {
            headers: {
                "User-Agent": "Aura/0.1.0 (music player)",
                Accept: "application/json"
            },
            signal
        });

        if (res.ok) {
            const data: LrclibResponse = await res.json();
            if (data.syncedLyrics && data.syncedLyrics.trim()) {
                return {
                    rawLrc: data.syncedLyrics,
                    plainLyrics: data.plainLyrics || "",
                    isSynced: true
                };
            }
            if (data.plainLyrics && data.plainLyrics.trim()) {
                return {
                    plainLyrics: data.plainLyrics,
                    isSynced: false
                };
            }
        }
    } catch (err: any) {
        if (err?.name === "AbortError") throw err;
    }

    // 2. Try cleaned query lookup on /api/get
    const { cleanTitle, cleanArtist } = cleanQuery(title, artist);
    if (cleanTitle !== title || cleanArtist !== artist) {
        try {
            const params = new URLSearchParams({
                track_name: cleanTitle,
                artist_name: cleanArtist
            });
            if (dur > 0) params.set("duration", dur.toString());

            const res = await fetch(`https://lrclib.net/api/get?${params.toString()}`, {
                headers: {
                    "User-Agent": "Aura/0.1.0 (music player)",
                    Accept: "application/json"
                },
                signal
            });

            if (res.ok) {
                const data: LrclibResponse = await res.json();
                if (data.syncedLyrics && data.syncedLyrics.trim()) {
                    return {
                        rawLrc: data.syncedLyrics,
                        plainLyrics: data.plainLyrics || "",
                        isSynced: true
                    };
                }
                if (data.plainLyrics && data.plainLyrics.trim()) {
                    return {
                        plainLyrics: data.plainLyrics,
                        isSynced: false
                    };
                }
            }
        } catch (err: any) {
            if (err?.name === "AbortError") throw err;
        }
    }

    // 3. Fallback to /api/search
    try {
        const searchParams = new URLSearchParams({
            track_name: cleanTitle,
            artist_name: cleanArtist
        });

        const res = await fetch(`https://lrclib.net/api/search?${searchParams.toString()}`, {
            headers: {
                "User-Agent": "Aura/0.1.0 (music player)",
                Accept: "application/json"
            },
            signal
        });

        if (res.ok) {
            const results: LrclibResponse[] = await res.json();
            if (Array.isArray(results) && results.length > 0) {
                // Rank candidates: prioritize synced lyrics, then closest duration
                const sorted = results.sort((a, b) => {
                    const aSynced = a.syncedLyrics ? 1 : 0;
                    const bSynced = b.syncedLyrics ? 1 : 0;
                    if (aSynced !== bSynced) return bSynced - aSynced;

                    if (dur > 0) {
                        const aDiff = Math.abs((a.duration || 0) - dur);
                        const bDiff = Math.abs((b.duration || 0) - dur);
                        return aDiff - bDiff;
                    }
                    return 0;
                });

                const best = sorted[0];
                if (best.syncedLyrics && best.syncedLyrics.trim()) {
                    return {
                        rawLrc: best.syncedLyrics,
                        plainLyrics: best.plainLyrics || "",
                        isSynced: true
                    };
                }
                if (best.plainLyrics && best.plainLyrics.trim()) {
                    return {
                        plainLyrics: best.plainLyrics,
                        isSynced: false
                    };
                }
            }
        }
    } catch (err: any) {
        if (err?.name === "AbortError") throw err;
    }

    return null;
}

/**
 * Cache management in localStorage
 */
function getFromCache(trackPath: string): SongLyrics | null {
    try {
        const key = LYRICS_CACHE_PREFIX + trackPath;
        const raw = localStorage.getItem(key);
        if (raw) {
            return JSON.parse(raw);
        }
    } catch (e) {
        // Ignore JSON/storage errors
    }
    return null;
}

function saveToCache(lyrics: SongLyrics): void {
    try {
        const key = LYRICS_CACHE_PREFIX + lyrics.trackPath;
        localStorage.setItem(key, JSON.stringify(lyrics));

        // Manage cache size index
        const indexKey = "aura_lyrics_index";
        let index: string[] = [];
        try {
            index = JSON.parse(localStorage.getItem(indexKey) || "[]");
        } catch {
            index = [];
        }

        index = index.filter(p => p !== lyrics.trackPath);
        index.push(lyrics.trackPath);

        // Prune older cached items if exceeding MAX_CACHED_TRACKS
        if (index.length > MAX_CACHED_TRACKS) {
            const excess = index.splice(0, index.length - MAX_CACHED_TRACKS);
            for (const oldPath of excess) {
                localStorage.removeItem(LYRICS_CACHE_PREFIX + oldPath);
            }
        }
        localStorage.setItem(indexKey, JSON.stringify(index));
    } catch (e) {
        // Storage full or quota exceeded, silent ignore
    }
}

/**
 * User setting: Allow looking up missing lyrics on LRCLIB.
 * Defaults to true. When false, only local metadata and sidecar files are used.
 */
export function isLrclibFallbackEnabled(): boolean {
    const val = localStorage.getItem("aura_lyrics_fallback");
    return val !== "false";
}

export function setLrclibFallbackEnabled(enabled: boolean): void {
    localStorage.setItem("aura_lyrics_fallback", enabled ? "true" : "false");
}

/**
 * Clears cached lyrics from localStorage.
 */
export function clearLyricsCache(): number {
    const indexKey = "aura_lyrics_index";
    try {
        const index: string[] = JSON.parse(localStorage.getItem(indexKey) || "[]");
        for (const p of index) {
            localStorage.removeItem(LYRICS_CACHE_PREFIX + p);
        }
        localStorage.removeItem(indexKey);
        return index.length;
    } catch {
        return 0;
    }
}

/**
 * Returns number of cached song lyrics.
 */
export function getCachedLyricsCount(): number {
    try {
        const index: string[] = JSON.parse(localStorage.getItem("aura_lyrics_index") || "[]");
        return index.length;
    } catch {
        return 0;
    }
}

/**
 * Main offline-first lyrics resolver:
 * 1. Checks local cache (localStorage)
 * 2. Checks local file: sidecar .lrc or embedded audio tags (ID3/Vorbis/MP4) via Rust
 * 3. Falls back to online provider (LRCLIB) if offline data is absent and fallback is enabled
 * 4. Automatically caches any fetched lyrics for subsequent offline play
 */
export async function getTrackLyrics(
    track: Track,
    forceRefresh = false,
    signal?: AbortSignal
): Promise<SongLyrics | null> {
    if (!track || !track.path) return null;

    // 1. Check local cache (unless force-refreshing)
    if (!forceRefresh) {
        const cached = getFromCache(track.path);
        if (cached && (cached.lines.length > 0 || cached.plainLyrics)) {
            return cached;
        }
    }

    // 2. Check local audio file metadata or sidecar .lrc file via Rust backend
    try {
        const localResult = await invoke<{ lyrics: string; source: string } | null>("get_lyrics", {
            path: track.path
        });

        if (localResult && localResult.lyrics && localResult.lyrics.trim()) {
            const parsed = parseLrc(localResult.lyrics, track.duration);
            const lyricsObj: SongLyrics = {
                trackPath: track.path,
                source: (localResult.source === "sidecar" ? "sidecar" : "embedded") as LyricsSource,
                isSynced: parsed.isSynced,
                rawLrc: parsed.isSynced ? localResult.lyrics : undefined,
                plainLyrics: parsed.plainLyrics,
                lines: parsed.lines
            };
            saveToCache(lyricsObj);
            return lyricsObj;
        }
    } catch (err) {
        console.warn("Local lyrics read error:", err);
    }

    // 3. Third-party online fallback (LRCLIB), only if enabled
    if (isLrclibFallbackEnabled()) {
        try {
            const onlineResult = await fetchLrclib(
                track.title,
                track.artist,
                track.album,
                track.duration,
                signal
            );

            if (onlineResult) {
                const parsed = onlineResult.rawLrc
                    ? parseLrc(onlineResult.rawLrc, track.duration)
                    : parseLrc(onlineResult.plainLyrics || "", track.duration);

                const lyricsObj: SongLyrics = {
                    trackPath: track.path,
                    source: "lrclib",
                    isSynced: parsed.isSynced,
                    rawLrc: onlineResult.rawLrc,
                    plainLyrics: parsed.plainLyrics || onlineResult.plainLyrics,
                    lines: parsed.lines
                };
                saveToCache(lyricsObj);
                return lyricsObj;
            }
        } catch (err: any) {
            if (err?.name === "AbortError") throw err;
            console.warn("Online lyrics fetch error:", err);
        }
    }

    return null;
}

/**
 * Manually import an LRC file for a track (persisted to cache + sidecar .lrc file).
 */
export async function importLyricsForTrack(track: Track, lrcText: string): Promise<SongLyrics> {
    const parsed = parseLrc(lrcText, track.duration);
    const lyricsObj: SongLyrics = {
        trackPath: track.path,
        source: "imported",
        isSynced: parsed.isSynced,
        rawLrc: parsed.isSynced ? lrcText : undefined,
        plainLyrics: parsed.plainLyrics,
        lines: parsed.lines
    };

    // Save to cache
    saveToCache(lyricsObj);

    // Save as sidecar .lrc file next to the track on disk
    try {
        await invoke("save_lyrics_sidecar", {
            path: track.path,
            lyrics: lrcText
        });
    } catch (err) {
        console.warn("Could not save sidecar .lrc file:", err);
    }

    return lyricsObj;
}

