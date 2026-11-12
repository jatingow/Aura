import { useState, useEffect } from "react";
import { Track, theme } from "../types";
import { formatTime, getAlbumArtCached, getAlbumArtSynchronous } from "../utils";
import Artwork from "./Artwork";

interface LibraryProps {
    tracks: Track[];
    currentTrack: Track | null;
    isPlaying: boolean;
    handlePlayTrack: (track: Track) => void;
    togglePause: () => void;
    handleContextMenu: (e: React.MouseEvent, track: Track) => void;
    searchQuery: string;
    setSearchQuery: (value: string) => void;
    favorites: string[];
    toggleFavorite: (path: string) => void;
    filterOnlyFavorites?: boolean;
}

export default function Library({
    tracks,
    currentTrack,
    isPlaying,
    handlePlayTrack,
    togglePause,
    handleContextMenu,
    searchQuery,
    setSearchQuery,
    favorites,
    toggleFavorite,
    filterOnlyFavorites = false
}: LibraryProps) {
    const [viewMode, setViewMode] = useState<"list" | "grid">("list");
    const [sortMode, setSortMode] = useState<"newest" | "a-z" | "artist" | "duration">("newest");
    const [albumArtCache, setAlbumArtCache] = useState<Record<string, string>>({});

    // Filter tracks
    const filteredTracks = tracks.filter(track => {
        if (filterOnlyFavorites && !favorites.includes(track.path)) {
            return false;
        }
        const query = searchQuery.toLowerCase();
        return `${track.title} ${track.artist} ${track.album}`.toLowerCase().includes(query);
    });

    const sortedTracks = [...filteredTracks];
    if (sortMode === "a-z") {
        sortedTracks.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortMode === "artist") {
        sortedTracks.sort((a, b) => a.artist.localeCompare(b.artist));
    } else if (sortMode === "duration") {
        sortedTracks.sort((a, b) => b.duration - a.duration);
    } else if (sortMode === "newest") {
        sortedTracks.reverse();
    }

    // Lazy load art for visible items (first 50) efficiently in parallel
    useEffect(() => {
        let isMounted = true;
        async function loadVisible() {
            const slice = sortedTracks.slice(0, 50);
            const newArt: Record<string, string> = {};
            const fetchPromises: Promise<void>[] = [];

            for (const t of slice) {
                const normPath = t.path.toLowerCase();
                if (albumArtCache[normPath] === undefined) {
                    const syncHit = getAlbumArtSynchronous(t.path);
                    if (syncHit !== undefined) {
                        if (syncHit) newArt[normPath] = syncHit;
                    } else {
                        fetchPromises.push(
                            getAlbumArtCached(t.path).then(art => {
                                if (art && isMounted) {
                                    setAlbumArtCache(prev => ({ ...prev, [normPath]: art }));
                                }
                            })
                        );
                    }
                }
            }

            if (isMounted && Object.keys(newArt).length > 0) {
                setAlbumArtCache(prev => ({ ...prev, ...newArt }));
            }

            if (fetchPromises.length > 0) {
                await Promise.all(fetchPromises);
            }
        }
        if (sortedTracks.length > 0) {
            void loadVisible();
        }
        return () => { isMounted = false; };
    }, [tracks, sortMode, searchQuery]);

    return (
        <main className="glass-panel" style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            overflowY: "auto",
            padding: "24px 28px",
            borderRadius: "24px"
        }}>
            {/* Header controls */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "22px" }}>
                <div>
                    <h2 style={{ fontSize: "1.7rem", fontWeight: "800", color: "var(--text-dark)", margin: "0 0 4px 0" }}>
                        {filterOnlyFavorites ? "Liked Songs" : "Your Music Library"}
                    </h2>
                    <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                        {sortedTracks.length} {sortedTracks.length === 1 ? "track" : "tracks"} available
                    </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    {/* Search */}
                    <input
                        type="search"
                        placeholder="Filter tracks..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{
                            width: "200px",
                            padding: "8px 14px",
                            borderRadius: "14px",
                            backgroundColor: "var(--surface-solid)",
                            border: `1px solid ${theme.border}`,
                            color: "var(--text-dark)",
                            fontSize: "0.85rem",
                            outline: "none"
                        }}
                    />

                    {/* Sort */}
                    <select
                        value={sortMode}
                        onChange={e => setSortMode(e.target.value as any)}
                        style={{
                            padding: "8px 12px",
                            borderRadius: "14px",
                            backgroundColor: "var(--surface-solid)",
                            border: `1px solid ${theme.border}`,
                            color: "var(--text-dark)",
                            fontSize: "0.85rem",
                            outline: "none",
                            cursor: "pointer"
                        }}
                    >
                        <option value="newest">Recently Added</option>
                        <option value="a-z">Title (A-Z)</option>
                        <option value="artist">Artist</option>
                        <option value="duration">Duration</option>
                    </select>

                    {/* View Toggle */}
                    <div style={{ display: "flex", backgroundColor: "var(--surface-solid)", borderRadius: "12px", padding: "3px", border: `1px solid ${theme.border}` }}>
                        <button
                            onClick={() => setViewMode("list")}
                            title="List View"
                            className="icon-btn"
                            style={{
                                padding: "6px",
                                borderRadius: "8px",
                                backgroundColor: viewMode === "list" ? "var(--primary)" : "transparent",
                                color: viewMode === "list" ? "#0c0f14" : "var(--text-muted)"
                            }}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                <line x1="8" y1="6" x2="21" y2="6"></line>
                                <line x1="8" y1="12" x2="21" y2="12"></line>
                                <line x1="8" y1="18" x2="21" y2="18"></line>
                                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                                <line x1="3" y1="18" x2="3.01" y2="18"></line>
                            </svg>
                        </button>
                        <button
                            onClick={() => setViewMode("grid")}
                            title="Grid View"
                            className="icon-btn"
                            style={{
                                padding: "6px",
                                borderRadius: "8px",
                                backgroundColor: viewMode === "grid" ? "var(--primary)" : "transparent",
                                color: viewMode === "grid" ? "#0c0f14" : "var(--text-muted)"
                            }}
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                                <rect x="3" y="3" width="7" height="7" rx="1"></rect>
                                <rect x="14" y="3" width="7" height="7" rx="1"></rect>
                                <rect x="14" y="14" width="7" height="7" rx="1"></rect>
                                <rect x="3" y="14" width="7" height="7" rx="1"></rect>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* List or Grid View */}
            {viewMode === "list" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", paddingBottom: "20px" }}>
                    {sortedTracks.map((track, idx) => {
                        const isCurrent = currentTrack?.path === track.path;
                        const isFav = favorites.includes(track.path);

                        return (
                            <div
                                key={track.path}
                                className={`track-row ${isCurrent ? "is-active" : ""}`}
                                onClick={() => handlePlayTrack(track)}
                                onContextMenu={e => handleContextMenu(e, track)}
                            >
                                <span style={{ width: "32px", fontSize: "0.85rem", color: isCurrent ? "var(--primary)" : "var(--text-muted)", fontWeight: "600" }}>
                                    {String(idx + 1).padStart(2, "0")}
                                </span>

                                <Artwork
                                    src={albumArtCache[track.path.toLowerCase()] || null}
                                    alt={track.title}
                                    width={38}
                                    height={38}
                                    borderRadius={10}
                                    iconSize={18}
                                    style={{ marginRight: "14px", flexShrink: 0 }}
                                />

                                <div style={{ flex: 1.5, minWidth: 0 }}>
                                    <div style={{ fontSize: "0.88rem", fontWeight: "600", color: isCurrent ? "var(--primary)" : "var(--text-dark)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {track.title}
                                    </div>
                                    <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {track.artist}
                                    </div>
                                </div>

                                <div style={{ flex: 1, fontSize: "0.8rem", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", padding: "0 10px" }}>
                                    {track.album || "—"}
                                </div>

                                <div style={{ width: "70px", fontSize: "0.8rem", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                                    {formatTime(track.duration)}
                                </div>

                                <button
                                    onClick={e => {
                                        e.stopPropagation();
                                        toggleFavorite(track.path);
                                    }}
                                    title={isFav ? "Unlike" : "Like"}
                                    className="icon-btn"
                                    style={{ padding: "6px", color: isFav ? "var(--primary)" : "var(--text-muted)", marginRight: "10px" }}
                                >
                                    <svg viewBox="0 0 24 24" fill={isFav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" width="16" height="16">
                                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                    </svg>
                                </button>

                                <button
                                    onClick={e => {
                                        e.stopPropagation();
                                        if (isCurrent) togglePause();
                                        else handlePlayTrack(track);
                                    }}
                                    style={{
                                        width: "32px",
                                        height: "32px",
                                        borderRadius: "50%",
                                        backgroundColor: isCurrent ? "var(--primary)" : "var(--surface-solid)",
                                        color: isCurrent ? "#0c0f14" : "var(--text-dark)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        border: `1px solid ${theme.border}`
                                    }}
                                >
                                    {isCurrent && isPlaying ? "⏸" : "▶"}
                                </button>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "16px", paddingBottom: "24px" }}>
                    {sortedTracks.map(track => {
                        const isCurrent = currentTrack?.path === track.path;
                        return (
                            <div
                                key={track.path}
                                onClick={() => handlePlayTrack(track)}
                                onContextMenu={e => handleContextMenu(e, track)}
                                className="glass-card"
                                style={{
                                    padding: "10px",
                                    cursor: "pointer",
                                    border: isCurrent ? "1px solid var(--primary)" : `1px solid ${theme.border}`
                                }}
                            >
                                <div style={{ width: "100%", aspectRatio: "1", borderRadius: "12px", overflow: "hidden", backgroundColor: "var(--surface-solid)", marginBottom: "8px" }}>
                                    <Artwork
                                        src={albumArtCache[track.path.toLowerCase()] || null}
                                        alt={track.title}
                                        width="100%"
                                        height="100%"
                                        borderRadius={12}
                                        iconSize={32}
                                    />
                                </div>
                                <div style={{ fontSize: "0.85rem", fontWeight: "700", color: isCurrent ? "var(--primary)" : "var(--text-dark)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {track.title}
                                </div>
                                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: "2px" }}>
                                    {track.artist}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {sortedTracks.length === 0 && (
                <div style={{ textAlign: "center", padding: "50px 20px", color: "var(--text-muted)" }}>
                    {filterOnlyFavorites ? "You haven't liked any songs yet." : "No songs found. Add music from Settings."}
                </div>
            )}
        </main>
    );
}
