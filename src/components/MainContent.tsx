import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Track, theme } from "../types";
import { formatTime } from "../utils";

// REMOVED scanPath and handleScan props
interface MainContentProps {
    tracks: Track[];
    currentTrack: Track | null;
    currentAlbumArt: string | null;
    handlePlayTrack: (track: Track) => void;
}

export default function MainContent({ tracks, currentTrack, currentAlbumArt, handlePlayTrack }: MainContentProps) {

    const [artCache, setArtCache] = useState<Record<string, string>>({});

    const featuredTracks = tracks.slice(0, 5);
    const remainingTracks = tracks.slice(5);

    useEffect(() => {
        async function fetchVisibleArt() {
            const newArt: Record<string, string> = {};
            const tracksToFetch = [...featuredTracks, ...remainingTracks];

            for (const track of tracksToFetch) {
                if (!artCache[track.path]) {
                    try {
                        const art = await invoke<string | null>("get_album_art", { path: track.path });
                        if (art) newArt[track.path] = art;
                    } catch (e) {
                        console.error("Failed to load art for", track.title);
                    }
                }
            }

            if (Object.keys(newArt).length > 0) {
                setArtCache(prev => ({ ...prev, ...newArt }));
            }
        }

        if (tracks.length > 0) {
            fetchVisibleArt();
        }
    }, [tracks]);

    const displayTrack = currentTrack || (featuredTracks.length > 0 ? featuredTracks[0] : null);
    const displayArt = currentTrack ? currentAlbumArt : (displayTrack ? artCache[displayTrack.path] : null);

    return (
        <div style={{
            flex: 1, backgroundColor: theme.surface, borderRadius: "24px",
            backdropFilter: "blur(20px)", border: `1px solid ${theme.border}`,
            boxShadow: "0 8px 32px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column",
            padding: "1.5rem", overflowY: "auto"
        }}>

            {/* Standard Search Bar (Visual Only for now) */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "1.5rem" }}>
                <input
                    type="text" placeholder="Search for artists, songs, or albums..."
                    style={{ flexGrow: 1, padding: "10px 18px", backgroundColor: theme.surfaceSolid, color: theme.textDark, border: "none", borderRadius: "30px", outline: "none", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}
                />
            </div>

            <h2 style={{ fontSize: "1.2rem", fontWeight: "bold", margin: "0 0 0.8rem 0", color: theme.textDark }}>
                {currentTrack ? "Now Playing" : "Releases for You"}
            </h2>

            <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1.5rem", flexShrink: 0 }}>

                {/* Left: Dynamic Hero Album Cover */}
                <div style={{
                    width: "210px", height: "210px", borderRadius: "20px", flexShrink: 0,
                    background: displayArt ? `url(${displayArt}) center/cover no-repeat` : `linear-gradient(135deg, #b09fff, #f6e6ff)`,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.06)", display: "flex", alignItems: "flex-end", padding: "1rem",
                    position: "relative", overflow: "hidden", transition: "background 0.3s ease"
                }}>
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "60%", background: "linear-gradient(transparent, rgba(0,0,0,0.7))" }} />

                    <div style={{ position: "relative", zIndex: 1, color: "#fff" }}>
                        <h3 style={{ margin: 0, fontSize: "1.2rem", textShadow: "0 2px 10px rgba(0,0,0,0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "180px" }}>
                            {displayTrack ? displayTrack.album : "Vibe Engine"}
                        </h3>
                        <p style={{ margin: "3px 0 0 0", fontSize: "0.8rem", opacity: 0.9, textShadow: "0 2px 5px rgba(0,0,0,0.5)" }}>
                            {displayTrack ? displayTrack.artist : "Add music in Settings"}
                        </p>
                    </div>
                </div>

                {/* Right: Top Tracks List */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px", justifyContent: "center" }}>
                    {featuredTracks.map((track, index) => (
                        <div key={index} onClick={() => handlePlayTrack(track)}
                            style={{
                                display: "flex", alignItems: "center", padding: "8px 12px", borderRadius: "10px", cursor: "pointer",
                                backgroundColor: currentTrack?.path === track.path ? theme.surfaceSolid : "transparent",
                                boxShadow: currentTrack?.path === track.path ? "0 2px 10px rgba(0,0,0,0.03)" : "none",
                                transition: "all 0.2s ease"
                            }}
                        >
                            <span style={{ width: "25px", fontSize: "0.8rem", color: theme.textMuted, fontWeight: "500" }}>{index + 1}</span>

                            <button style={{ background: "none", border: "none", color: theme.textMuted, cursor: "pointer", marginRight: "10px", display: "flex", alignItems: "center" }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                            </button>

                            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                                <strong style={{ fontSize: "0.85rem", color: theme.textDark }}>{track.title}</strong>
                                <span style={{ fontSize: "0.75rem", color: theme.textMuted, marginTop: "1px" }}>{track.artist}</span>
                            </div>

                            <span style={{ fontSize: "0.75rem", color: theme.textMuted, width: "35px", textAlign: "right", fontWeight: "500" }}>
                                {formatTime(track.duration)}
                            </span>
                        </div>
                    ))}

                    {tracks.length === 0 && (
                        <div style={{ padding: "10px", color: theme.textMuted, textAlign: "center", fontStyle: "italic", fontSize: "0.85rem" }}>
                            No tracks loaded. Go to Settings to scan directory.
                        </div>
                    )}
                </div>
            </div>

            {/* --- ALL TRACKS --- */}
            <h2 style={{ fontSize: "1.1rem", fontWeight: "bold", margin: "0 0 0.8rem 0", color: theme.textDark }}>All Tracks</h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: "1rem", paddingBottom: "1rem" }}>
                {remainingTracks.map((track, index) => (
                    <div key={index} onClick={() => handlePlayTrack(track)} style={{ display: "flex", flexDirection: "column", cursor: "pointer" }}>
                        <div style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: "14px", backgroundColor: theme.surfaceSolid, marginBottom: "6px", boxShadow: "0 4px 10px rgba(0,0,0,0.03)", overflow: "hidden" }}>
                            {artCache[track.path] && (
                                <img src={artCache[track.path]} alt="Album Art" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            )}
                        </div>
                        <strong style={{ display: "block", fontSize: "0.8rem", color: theme.textDark, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.title}</strong>
                        <span style={{ fontSize: "0.7rem", color: theme.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.artist}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}