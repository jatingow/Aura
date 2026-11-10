import { useState, useEffect } from "react";
import { Track } from "../types";
import { getAlbumArtCached } from "../utils";
import LyricsView from "./LyricsView";

interface TopArtistsPanelProps {
    tracks: Track[];
    currentTrack: Track | null;
    currentAlbumArt: string | null;
    handlePlayTrack: (track: Track) => void;
    queue: Track[];
    removeFromQueue: (index: number) => void;
    showLyrics?: boolean;
    setShowLyrics?: (show: boolean) => void;
    progress?: number;
    isPlaying?: boolean;
    handleSeek?: (position: number) => void;
    notify?: (msg: string) => void;
    onOpenFullScreen?: () => void;
}

export default function TopArtistsPanel({
    tracks,
    currentTrack,
    currentAlbumArt,
    handlePlayTrack,
    queue,
    removeFromQueue,
    showLyrics = false,
    setShowLyrics,
    progress = 0,
    isPlaying = false,
    handleSeek = () => {},
    notify,
    onOpenFullScreen
}: TopArtistsPanelProps) {
    const [artistAvatars, setArtistAvatars] = useState<Record<string, string>>({});

    const displayTrack = currentTrack || tracks[0] || null;

    // Group tracks by artist
    const artistMap = tracks.reduce((acc, track) => {
        const name = track.artist || "Unknown Artist";
        if (!acc[name]) {
            acc[name] = { count: 0, tracks: [], sampleTrack: track };
        }
        acc[name].count += (track.playCount || 0);
        acc[name].tracks.push(track);
        return acc;
    }, {} as Record<string, { count: number; tracks: Track[]; sampleTrack: Track }>);

    const sortedArtists = Object.entries(artistMap)
        .sort((a, b) => b[1].count - a[1].count || b[1].tracks.length - a[1].tracks.length)
        .slice(0, 5);

    // Fetch avatar artwork on demand for top artists
    useEffect(() => {
        let isMounted = true;
        async function loadAvatars() {
            const loaded: Record<string, string> = {};
            for (const [artistName, data] of sortedArtists) {
                if (!artistAvatars[artistName]) {
                    const art = await getAlbumArtCached(data.sampleTrack.path);
                    if (art) loaded[artistName] = art;
                }
            }
            if (isMounted && Object.keys(loaded).length > 0) {
                setArtistAvatars(prev => ({ ...prev, ...loaded }));
            }
        }
        if (sortedArtists.length > 0) {
            void loadAvatars();
        }
        return () => { isMounted = false; };
    }, [tracks]);

    // If lyrics mode is active, render LyricsView in this right sidebar
    if (showLyrics) {
        return (
            <LyricsView
                currentTrack={currentTrack}
                currentAlbumArt={currentAlbumArt}
                progress={progress}
                isPlaying={isPlaying}
                handleSeek={handleSeek}
                onClose={() => setShowLyrics?.(false)}
                notify={notify}
            />
        );
    }

    return (
        <div style={{
            width: "300px",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: "18px",
            height: "100%",
            overflowY: "auto",
            paddingRight: "2px"
        }}>
            {/* --- TOP SWITCHER: NOW PLAYING / LYRICS --- */}
            {setShowLyrics && (
                <div style={{
                    display: "flex",
                    backgroundColor: "var(--surface-solid)",
                    borderRadius: "12px",
                    padding: "3px",
                    border: "1px solid var(--border)",
                    flexShrink: 0
                }}>
                    <button
                        onClick={() => setShowLyrics(false)}
                        style={{
                            flex: 1,
                            padding: "6px 0",
                            borderRadius: "9px",
                            fontSize: "0.76rem",
                            fontWeight: "700",
                            backgroundColor: "var(--primary)",
                            color: "#0c0f14",
                            cursor: "pointer",
                            transition: "all 0.18s ease"
                        }}
                    >
                        Now Playing
                    </button>
                    <button
                        onClick={() => setShowLyrics(true)}
                        style={{
                            flex: 1,
                            padding: "6px 0",
                            borderRadius: "9px",
                            fontSize: "0.76rem",
                            fontWeight: "700",
                            backgroundColor: "transparent",
                            color: "var(--text-muted)",
                            cursor: "pointer",
                            transition: "all 0.18s ease"
                        }}
                    >
                        Lyrics
                    </button>
                </div>
            )}

            {/* --- NOW PLAYING COVER ART CARD --- */}
            <div className="glass-panel" style={{ padding: "16px", borderRadius: "18px" }}>
                <span style={{
                    fontSize: "0.72rem",
                    fontWeight: "700",
                    color: "var(--primary)",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    display: "block",
                    marginBottom: "10px"
                }}>
                    {currentTrack ? "Now Playing" : "Featured Cover"}
                </span>

                <div
                    onClick={onOpenFullScreen}
                    title={onOpenFullScreen ? "Click for full screen player" : undefined}
                    style={{
                        width: "100%",
                        aspectRatio: "1 / 1",
                        borderRadius: "14px",
                        overflow: "hidden",
                        backgroundColor: "var(--surface-solid)",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                        marginBottom: "12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "1px solid var(--border)",
                        cursor: onOpenFullScreen ? "pointer" : "default",
                        transition: "transform 0.2s ease"
                    }}
                    onMouseOver={e => {
                        if (onOpenFullScreen) e.currentTarget.style.transform = "scale(1.02)";
                    }}
                    onMouseOut={e => {
                        if (onOpenFullScreen) e.currentTarget.style.transform = "scale(1)";
                    }}
                >
                    {currentAlbumArt ? (
                        <img src={currentAlbumArt} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                        <div style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "8px",
                            color: "var(--text-muted)",
                            opacity: 0.6
                        }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="48" height="48">
                                <circle cx="12" cy="12" r="10"></circle>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            <span style={{ fontSize: "0.74rem" }}>No artwork</span>
                        </div>
                    )}
                </div>

                <div style={{ fontWeight: "700", fontSize: "0.95rem", color: "var(--text-dark)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {displayTrack?.title || "No track playing"}
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {displayTrack ? `${displayTrack.artist} · ${displayTrack.album || "Single"}` : "Pick a song to play"}
                </div>

                {/* View Lyrics Button */}
                {currentTrack && setShowLyrics && (
                    <button
                        onClick={() => setShowLyrics(true)}
                        style={{
                            marginTop: "12px",
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px",
                            padding: "7px 12px",
                            borderRadius: "10px",
                            backgroundColor: "var(--surface-solid)",
                            border: "1px solid var(--border)",
                            color: "var(--primary)",
                            fontSize: "0.76rem",
                            fontWeight: "700",
                            cursor: "pointer",
                            transition: "all 0.15s ease"
                        }}
                        onMouseOver={e => e.currentTarget.style.backgroundColor = "var(--surface-hover)"}
                        onMouseOut={e => e.currentTarget.style.backgroundColor = "var(--surface-solid)"}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                            <path d="M9 18V5l12-2v13"></path>
                            <circle cx="6" cy="18" r="3"></circle>
                            <circle cx="18" cy="16" r="3"></circle>
                            <line x1="3" y1="9" x2="9" y2="9"></line>
                        </svg>
                        Show Lyrics
                    </button>
                )}
            </div>

            {/* --- TRENDING ARTISTS --- */}
            <div className="glass-panel" style={{ padding: "16px", borderRadius: "18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                    <h3 style={{ fontSize: "0.95rem", fontWeight: "700", color: "var(--text-dark)", margin: 0 }}>
                        Trending Artists
                    </h3>
                    <span style={{ fontSize: "0.74rem", color: "var(--text-muted)", cursor: "pointer" }}>
                        See All
                    </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {sortedArtists.map(([artistName, data], index) => {
                        const rankNumber = String(index + 1).padStart(2, "0");
                        const avatar = artistAvatars[artistName];

                        return (
                            <div
                                key={artistName}
                                onClick={() => handlePlayTrack(data.sampleTrack)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "10px",
                                    padding: "6px 8px",
                                    borderRadius: "12px",
                                    cursor: "pointer",
                                    transition: "background 0.2s"
                                }}
                                onMouseOver={e => e.currentTarget.style.backgroundColor = "var(--surface-hover)"}
                                onMouseOut={e => e.currentTarget.style.backgroundColor = "transparent"}
                            >
                                <div style={{
                                    width: "38px",
                                    height: "38px",
                                    borderRadius: "50%",
                                    overflow: "hidden",
                                    backgroundColor: "var(--surface-solid)",
                                    flexShrink: 0,
                                    border: "1px solid var(--border)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                }}>
                                    {avatar ? (
                                        <img src={avatar} alt={artistName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    ) : (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" width="18" height="18">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                            <circle cx="12" cy="7" r="4"></circle>
                                        </svg>
                                    )}
                                </div>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-dark)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {artistName}
                                    </div>
                                </div>

                                <span style={{ fontSize: "0.82rem", fontWeight: "700", color: "var(--primary)" }}>
                                    {rankNumber}
                                </span>
                            </div>
                        );
                    })}

                    {sortedArtists.length === 0 && (
                        <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", textAlign: "center", padding: "12px 0" }}>
                            Add music to view trending artists
                        </div>
                    )}
                </div>
            </div>

            {/* --- UP NEXT / QUEUE --- */}
            {queue.length > 0 && (
                <div className="glass-panel" style={{ padding: "16px", borderRadius: "18px" }}>
                    <h3 style={{ fontSize: "0.95rem", fontWeight: "700", color: "var(--text-dark)", margin: "0 0 10px 0" }}>
                        Up Next ({queue.length})
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {queue.slice(0, 4).map((t, idx) => (
                            <div key={`${t.path}-${idx}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.82rem" }}>
                                <div style={{ overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", flex: 1 }}>
                                    <span style={{ fontWeight: "600", color: "var(--text-dark)" }}>{t.title}</span>
                                    <span style={{ color: "var(--text-muted)", marginLeft: "6px" }}>{t.artist}</span>
                                </div>
                                <button
                                    onClick={() => removeFromQueue(idx)}
                                    style={{ color: "var(--text-muted)", padding: "2px 6px", fontSize: "0.75rem" }}
                                    title="Remove from queue"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
