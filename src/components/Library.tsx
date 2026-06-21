import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Track, theme } from "../types";

interface LibraryProps {
    tracks: Track[];
    handlePlayTrack: (track: Track) => void;
    handleContextMenu: (e: React.MouseEvent, track: Track) => void;
}

export default function Library({ tracks, handlePlayTrack, handleContextMenu }: LibraryProps) {
    const [artCache, setArtCache] = useState<Record<string, string>>({});

    useEffect(() => {
        async function fetchAllArt() {
            const newArt: Record<string, string> = {};
            for (const track of tracks) {
                if (!artCache[track.path]) {
                    try {
                        const art = await invoke<string | null>("get_album_art", { path: track.path });
                        if (art) newArt[track.path] = art;
                    } catch (e) { }
                }
            }
            if (Object.keys(newArt).length > 0) setArtCache(prev => ({ ...prev, ...newArt }));
        }
        if (tracks.length > 0) fetchAllArt();
    }, [tracks]);

    return (
        <div style={{
            flex: 1, backgroundColor: theme.surface, borderRadius: "24px",
            backdropFilter: "blur(20px)", border: `1px solid ${theme.border}`,
            boxShadow: "0 8px 32px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column",
            padding: "2rem", overflowY: "auto"
        }}>
            <h2 style={{ fontSize: "1.8rem", fontWeight: "bold", margin: "0 0 2rem 0", color: theme.textDark }}>
                All Tracks
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "1.5rem", paddingBottom: "2rem" }}>
                {tracks.map((track, index) => (
                    <div key={index}
                        onClick={() => handlePlayTrack(track)}
                        onContextMenu={(e) => handleContextMenu(e, track)}
                        style={{ display: "flex", flexDirection: "column", cursor: "pointer", transition: "transform 0.2s" }} onMouseOver={e => e.currentTarget.style.transform = "scale(1.02)"} onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}>
                        <div style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: "16px", backgroundColor: theme.surfaceSolid, marginBottom: "10px", boxShadow: "0 4px 15px rgba(0,0,0,0.05)", overflow: "hidden" }}>
                            {artCache[track.path] ? (
                                <img src={artCache[track.path]} alt="Album Art" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: theme.textMuted }}>♪</div>
                            )}
                        </div>
                        <strong style={{ display: "block", fontSize: "0.9rem", color: theme.textDark, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.title}</strong>
                        <span style={{ fontSize: "0.8rem", color: theme.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.artist}</span>
                    </div>
                ))}
                {tracks.length === 0 && <div style={{ color: theme.textMuted }}>Your library is empty.</div>}
            </div>
        </div>
    );
}