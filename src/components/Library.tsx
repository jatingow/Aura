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

    const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
    const [sortMode, setSortMode] = useState<"Newest" | "a-z" | "z-a">("Newest");

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

    const sortedTracks = [...tracks];
    if (sortMode === "a-z") {
        sortedTracks.sort((a, b) => a.title.localeCompare(b.title));
    }
    else if (sortMode == "z-a") {
        sortedTracks.sort((a, b) => b.title.localeCompare(a.title));
    }
    else if (sortMode == "Newest") {
        sortedTracks.reverse();
    }

    return (
        <div style={{
            flex: 1, backgroundColor: theme.surface, borderRadius: "24px",
            backdropFilter: "blur(20px)", border: `1px solid ${theme.border}`,
            boxShadow: "0 8px 32px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column",
            padding: "2rem", overflowY: "auto"
        }}>

            {/* --- HEADER & CONTROLS --- */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem" }}>
                <h2 style={{ fontSize: "1.8rem", fontWeight: "bold", margin: 0, color: theme.textDark }}>
                    All Tracks
                </h2>

                <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>

                    {/* Sort Dropdown */}
                    <select
                        value={sortMode}
                        onChange={(e) => setSortMode(e.target.value as any)}
                        style={{
                            padding: "8px 12px", borderRadius: "10px", border: `1px solid ${theme.border}`,
                            backgroundColor: theme.surfaceSolid, color: theme.textDark, outline: "none",
                            cursor: "pointer", fontSize: "0.85rem"
                        }}
                    >
                        <option value="newest">Recently Added</option>
                        <option value="a-z">Title (A-Z)</option>
                        <option value="z-a">Title (Z-A)</option>
                    </select>

                    {/* View Mode Toggles */}
                    <div style={{ display: "flex", backgroundColor: theme.surfaceSolid, borderRadius: "10px", padding: "4px" }}>
                        <button
                            onClick={() => setViewMode("grid")}
                            title="Grid View"
                            style={{
                                padding: "6px", background: viewMode === "grid" ? theme.primary : "transparent",
                                color: viewMode === "grid" ? "#fff" : theme.textMuted, border: "none",
                                borderRadius: "8px", cursor: "pointer", display: "flex", transition: "all 0.2s"
                            }}
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            title="List View"
                            style={{
                                padding: "6px", background: viewMode === "list" ? theme.primary : "transparent",
                                color: viewMode === "list" ? "#fff" : theme.textMuted, border: "none",
                                borderRadius: "8px", cursor: "pointer", display: "flex", transition: "all 0.2s"
                            }}
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                        </button>
                    </div>

                </div>
            </div>

            {/* --- CONDITIONAL RENDERING --- */}
            {viewMode === "grid" ? (
                /* GRID VIEW */
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "1.5rem", paddingBottom: "2rem" }}>
                    {sortedTracks.map((track, index) => (
                        <div
                            key={index}
                            onClick={() => handlePlayTrack(track)}
                            onContextMenu={(e) => handleContextMenu(e, track)}
                            style={{ display: "flex", flexDirection: "column", cursor: "pointer", transition: "transform 0.2s" }}
                            onMouseOver={e => e.currentTarget.style.transform = "scale(1.02)"}
                            onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
                        >
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
                </div>
            ) : (
                /* LIST VIEW */
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", paddingBottom: "2rem" }}>
                    {sortedTracks.map((track, index) => (
                        <div
                            key={index}
                            onClick={() => handlePlayTrack(track)}
                            onContextMenu={(e) => handleContextMenu(e, track)}
                            style={{
                                display: "flex", alignItems: "center", padding: "10px 14px", borderRadius: "12px",
                                cursor: "pointer", transition: "all 0.2s ease"
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = theme.surfaceSolid}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                        >
                            <div style={{ width: "40px", height: "40px", borderRadius: "8px", backgroundColor: theme.surfaceSolid, overflow: "hidden", flexShrink: 0, marginRight: "15px" }}>
                                {artCache[track.path] ? (
                                    <img src={artCache[track.path]} alt="Album Art" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                ) : (
                                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: theme.textMuted }}>♪</div>
                                )}
                            </div>
                            <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
                                <strong style={{ fontSize: "0.9rem", color: theme.textDark, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.title}</strong>
                                <span style={{ fontSize: "0.8rem", color: theme.textMuted, marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.artist}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {tracks.length === 0 && <div style={{ color: theme.textMuted }}>Your library is empty.</div>}
        </div>
    );
}