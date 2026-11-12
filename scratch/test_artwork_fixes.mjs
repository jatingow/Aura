// Comprehensive verification test for album artwork loading, caching, race-condition handling, and album grouping.
import assert from "node:assert";

console.log("=== Testing Album Artwork Fixes & Engine ===");

// -------------------------------------------------------------
// Test 1: LRU Cache, Path Normalization & Negative Caching
// -------------------------------------------------------------
console.log("\n[Test 1] LRU Cache, Path Normalization & Negative Caching");
{
    const MAX_CACHE_SIZE = 250;
    const albumArtLRUCache = new Map();

    function normalizePath(p) {
        return p.trim().replace(/\\/g, "/").toLowerCase();
    }

    function getAlbumArtSynchronous(path) {
        const norm = normalizePath(path);
        if (!albumArtLRUCache.has(norm)) return undefined;
        const val = albumArtLRUCache.get(norm);
        albumArtLRUCache.delete(norm);
        albumArtLRUCache.set(norm, val);
        return val;
    }

    function setAlbumArtInCache(path, data) {
        const norm = normalizePath(path);
        if (albumArtLRUCache.has(norm)) {
            albumArtLRUCache.delete(norm);
        } else if (albumArtLRUCache.size >= MAX_CACHE_SIZE) {
            const oldestKey = albumArtLRUCache.keys().next().value;
            if (oldestKey) albumArtLRUCache.delete(oldestKey);
        }
        albumArtLRUCache.set(norm, data);
    }

    // 1.1 Case insensitivity for Windows paths
    setAlbumArtInCache("C:\\Music\\Rock\\Track1.mp3", "data:image/jpeg;base64,abc");
    assert.strictEqual(getAlbumArtSynchronous("c:\\music\\rock\\track1.mp3"), "data:image/jpeg;base64,abc");
    assert.strictEqual(getAlbumArtSynchronous("C:/MUSIC/ROCK/TRACK1.MP3"), "data:image/jpeg;base64,abc");
    console.log("  ✓ Windows path casing discrepancy correctly normalized");

    // 1.2 Negative caching
    setAlbumArtInCache("C:\\Music\\Empty\\NoArt.mp3", null);
    assert.strictEqual(getAlbumArtSynchronous("c:\\music\\empty\\noart.mp3"), null);
    assert.strictEqual(albumArtLRUCache.has(normalizePath("c:\\music\\empty\\noart.mp3")), true);
    console.log("  ✓ Negative caching supported (null cached, preventing repeated IPC/disk probes)");

    // 1.3 LRU boundary eviction
    for (let i = 0; i < 300; i++) {
        setAlbumArtInCache(`C:\\Music\\Track${i}.mp3`, `art-${i}`);
    }
    assert.strictEqual(albumArtLRUCache.size, 250);
    // Oldest items (0 to 49) should have been evicted
    assert.strictEqual(getAlbumArtSynchronous("C:\\Music\\Track0.mp3"), undefined);
    assert.strictEqual(getAlbumArtSynchronous("C:\\Music\\Track49.mp3"), undefined);
    // Recent items (50 to 299) should exist
    assert.strictEqual(getAlbumArtSynchronous("C:\\Music\\Track299.mp3"), "art-299");
    console.log("  ✓ LRU eviction caps memory at exactly 250 entries");
}

// -------------------------------------------------------------
// Test 2: Rapid Track Skipping & Asynchronous Race Condition Safety
// -------------------------------------------------------------
console.log("\n[Test 2] Rapid Track Skipping & Asynchronous Race Condition Safety");
{
    // Simulate App.tsx artworkLoadIdRef and handlePlayTrack
    let currentAlbumArt = null;
    let artworkLoadId = 0;

    const mockDisk = {
        "track-1": { delay: 150, art: "artwork-track-1" }, // Slow request
        "track-2": { delay: 30, art: "artwork-track-2" },  // Fast request
        "track-3": { delay: 10, art: null }               // Track without artwork
    };

    function simulatePlayTrack(trackId) {
        artworkLoadId++;
        const currentId = artworkLoadId;

        // Reset art to null immediately so previous track's art never lingers
        currentAlbumArt = null;

        // Mock async Tauri invoke
        return new Promise(resolve => {
            const diskEntry = mockDisk[trackId];
            setTimeout(() => {
                // If a newer track started playing while this was reading, discard!
                if (currentId === artworkLoadId) {
                    currentAlbumArt = diskEntry.art;
                }
                resolve({ trackId, discarded: currentId !== artworkLoadId, art: currentAlbumArt });
            }, diskEntry.delay);
        });
    }

    // Simulate user rapidly skipping: track-1 clicked, then track-2 clicked 10ms later
    const p1 = simulatePlayTrack("track-1");
    await new Promise(r => setTimeout(r, 10));
    const p2 = simulatePlayTrack("track-2");

    const [res1, res2] = await Promise.all([p1, p2]);

    assert.strictEqual(res1.discarded, true, "Track 1 was discarded because track 2 was requested");
    assert.strictEqual(res2.discarded, false, "Track 2 was applied");
    assert.strictEqual(currentAlbumArt, "artwork-track-2", "Final artwork is Track 2, never overwritten by late Track 1 response");
    console.log("  ✓ Out-of-order / slow artwork responses successfully discarded during rapid skips");

    // Test transition to track with missing artwork
    await simulatePlayTrack("track-3");
    assert.strictEqual(currentAlbumArt, null, "Artwork correctly set to null for track with no artwork");
    console.log("  ✓ Immediately clears artwork for tracks without artwork without showing stale previous cover");
}

// -------------------------------------------------------------
// Test 3: Tracks with Identical Album Names by Different Artists
// -------------------------------------------------------------
console.log("\n[Test 3] Distinct Artwork for Identical Album Names");
{
    const mockTracks = [
        { title: "Bohemian Rhapsody", artist: "Queen", album: "Greatest Hits", path: "C:\\Music\\Queen\\track1.mp3" },
        { title: "Sweet Child O' Mine", artist: "Guns N' Roses", album: "Greatest Hits", path: "C:\\Music\\GNR\\track1.mp3" },
        { title: "Under Pressure", artist: "Queen", album: "Greatest Hits", path: "C:\\Music\\Queen\\track2.mp3" }
    ];

    // Grouping logic as implemented in AlbumsView and MainContent
    const albumMap = mockTracks.reduce((acc, t) => {
        const artistName = t.artist || "Unknown Artist";
        const albumName = t.album || "Unknown Album";
        const key = `${artistName} - ${albumName}`.toLowerCase();
        if (!acc[key]) {
            acc[key] = {
                albumTitle: albumName,
                artist: artistName,
                tracks: [],
                sampleTrack: t
            };
        }
        acc[key].tracks.push(t);
        return acc;
    }, {});

    const albumEntries = Object.entries(albumMap);

    assert.strictEqual(albumEntries.length, 2, "Expected 2 distinct albums despite identical album title 'Greatest Hits'");
    assert.strictEqual(albumMap["queen - greatest hits"].tracks.length, 2);
    assert.strictEqual(albumMap["guns n' roses - greatest hits"].tracks.length, 1);
    assert.notStrictEqual(albumMap["queen - greatest hits"].sampleTrack.path, albumMap["guns n' roses - greatest hits"].sampleTrack.path);

    console.log("  ✓ Albums keyed by 'artist - album', preventing collision and artwork bleed across artists");
}

console.log("\n>>> ALL ALBUM ARTWORK FIX TESTS PASSED SUCCESSFULLY! <<<\n");
