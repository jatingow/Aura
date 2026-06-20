import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Track, theme } from "../types";

interface TopArtistsPanelProps {
    tracks: Track[];
    handlePlayTrack: (track: Track) => void;
}

export default function TopArtistsPanel({ tracks, handlePlayTrack }: TopArtistsPanelProps) {
    const [artCache, setArtCache] = useState<Record<string, string>>({});

    // --- AGGREGATE TOP ARTISTS ---
    // 1. Group all tracks by artist and sum up their total playCounts
    const artistStats = tracks.reduce((acc, track) => {
        const artistName = track.artist || "Unknown Artist";
        if (!acc[artistName]) {
            acc[artistName] = { count: 0, sampleTrack: track };
        }
        acc[artistName].count += (track.playCount || 0);
        return acc;
    }, {} as Record<string, { count: number, sampleTrack: Track }>);

    // 2. Convert to an array, filter out unplayed artists, sort descending, and grab the top 6
    const topArtists = Object.entries(artistStats)
        .filter(([_, data]) => data.count > 0)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 6);

    // Fetch the album art for the sample tracks to use as avatars
    useEffect(() => {
        async function fetchAvatars() {
            const newArt: Record<string, string> = {};
            for (const [_, data] of topArtists) {
                const path = data.sampleTrack.path;
                if (!artCache[path]) {
                    try {
                        const art = await invoke<string | null>("get_album_art", { path });
                        if (art) newArt[path] = art;
                    } catch (e) { }
                }
            }
            if (Object.keys(newArt).length > 0) setArtCache(prev => ({ ...prev, ...newArt }));
        }
        if (topArtists.length > 0) fetchAvatars();
    }, [tracks]);

    return (
        <div style={{
            width: "260px", flexShrink: 0, backgroundColor: theme.surface, borderRadius: "24px",
            backdropFilter: "blur(20px)", border: `1px solid ${theme.border}`,
            boxShadow: "0 8px 32px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column",
            padding: "2rem 1.5rem", overflowY: "auto"
        }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: "bold", margin: "0 0 1.5rem 0", color: theme.textDark }}>
                Top Artists
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {topArtists.map(([artistName, data], index) => (
                    <div
                        key={index}
                        onClick={() => handlePlayTrack(data.sampleTrack)} // Plays a track from them when clicked
                        style={{
                            display: "flex", alignItems: "center", gap: "12px", padding: "8px",
                            borderRadius: "12px", cursor: "pointer", transition: "background 0.2s"
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = theme.surfaceSolid}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                    >
                        {/* Circular Avatar */}
                        <div style={{
                            width: "45px", height: "45px", borderRadius: "50%",
                            backgroundColor: theme.surfaceSolid, overflow: "hidden", flexShrink: 0,
                            boxShadow: "0 4px 10px rgba(0,0,0,0.05)"
                        }}>
                            {artCache[data.sampleTrack.path] ? (
                                <img src={artCache[data.sampleTrack.path]} alt={artistName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: theme.textMuted, fontSize: "1.2rem" }}>👤</div>
                            )}
                        </div>

                        {/* Artist Info */}
                        <div style={{ flex: 1, overflow: "hidden" }}>
                            <strong style={{ display: "block", fontSize: "0.9rem", color: theme.textDark, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {artistName}
                            </strong>
                            <span style={{ fontSize: "0.75rem", color: theme.textMuted }}>
                                {data.count} {data.count === 1 ? 'play' : 'plays'}
                            </span>
                        </div>

                        {/* Ellipsis Menu Icon */}
                        <button style={{ background: "none", border: "none", color: theme.textMuted, cursor: "pointer", display: "flex", alignItems: "center", padding: "0 5px" }}>
                            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                                <circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /><circle cx="5" cy="12" r="2" />
                            </svg>
                        </button>
                    </div>
                ))}

                {topArtists.length === 0 && (
                    <div style={{ color: theme.textMuted, fontSize: "0.85rem", textAlign: "center", marginTop: "1rem", fontStyle: "italic" }}>
                        Play some music to see your top artists here.
                    </div>
                )}
            </div>
        </div>
    );
}