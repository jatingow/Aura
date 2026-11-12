import { useState, useEffect, useRef } from "react";
import { Track, theme } from "../types";
import { formatTime, getAlbumArtCached, getAlbumArtSynchronous } from "../utils";
import Artwork from "./Artwork";

interface MainContentProps {
    tracks: Track[];
    currentTrack: Track | null;
    currentAlbumArt: string | null;
    isPlaying: boolean;
    handlePlayTrack: (track: Track) => void;
    togglePause: () => void;
    handleContextMenu: (e: React.MouseEvent, track: Track) => void;
    searchQuery: string;
    setSearchQuery: (value: string) => void;
    favorites: string[];
    toggleFavorite: (path: string) => void;
    onSyncLibrary: () => void;
    isScanning: boolean;
    onOpenSettings: () => void;
}

export default function MainContent({
    tracks,
    currentTrack,
    currentAlbumArt,
    isPlaying,
    handlePlayTrack,
    togglePause,
    handleContextMenu,
    searchQuery,
    setSearchQuery,
    favorites,
    toggleFavorite,
    onSyncLibrary,
    isScanning,
    onOpenSettings
}: MainContentProps) {
    const [albumArtCache, setAlbumArtCache] = useState<Record<string, string>>({});
    const carouselRef = useRef<HTMLDivElement>(null);

    // Filter tracks based on search query
    const filteredTracks = tracks.filter(track => {
        return `${track.title} ${track.artist} ${track.album}`
            .toLowerCase()
            .includes(searchQuery.toLowerCase());
    });

    // Derive featured track, albums, and popular tracks
    const popularTracks = [...filteredTracks]
        .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
        .slice(0, 10);

    // Group albums uniquely by artist + album name so distinct albums never collide
    const uniqueAlbumKeys = new Set<string>();
    const albums: Track[] = [];
    for (const t of filteredTracks) {
        const key = `${t.artist} - ${t.album || t.title}`.toLowerCase();
        if (!uniqueAlbumKeys.has(key)) {
            uniqueAlbumKeys.add(key);
            albums.push(t);
            if (albums.length >= 8) break;
        }
    }

    const heroTrack = currentTrack || popularTracks[0] || filteredTracks[0] || null;
    const isHeroFavorite = heroTrack ? favorites.includes(heroTrack.path) : false;

    // Load artwork for visible items efficiently in parallel
    useEffect(() => {
        let isMounted = true;
        async function loadVisibleArt() {
            const tracksToLoad = [
                ...(heroTrack ? [heroTrack] : []),
                ...albums,
                ...popularTracks.slice(0, 8)
            ];

            const newArt: Record<string, string> = {};
            const fetchPromises: Promise<void>[] = [];

            for (const track of tracksToLoad) {
                const normPath = track.path.toLowerCase();
                if (albumArtCache[normPath] === undefined) {
                    const syncHit = getAlbumArtSynchronous(track.path);
                    if (syncHit !== undefined) {
                        if (syncHit) newArt[normPath] = syncHit;
                    } else {
                        fetchPromises.push(
                            getAlbumArtCached(track.path).then(art => {
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

        if (tracks.length > 0) {
            void loadVisibleArt();
        }
        return () => { isMounted = false; };
    }, [tracks, searchQuery, heroTrack?.path]);

    const scrollCarousel = (direction: "left" | "right") => {
        if (carouselRef.current) {
            const offset = direction === "left" ? -280 : 280;
            carouselRef.current.scrollBy({ left: offset, behavior: "smooth" });
        }
    };

    return (
        <main style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            overflowY: "auto",
            paddingRight: "10px",
            gap: "22px"
        }}>
            {/* --- TOP SEARCH & NAVIGATION BAR --- */}
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                padding: "4px 0"
            }}>
                {/* Back / Forward Buttons */}
                <div style={{ display: "flex", gap: "6px" }}>
                    <button
                        title="Back"
                        className="icon-btn"
                        style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            backgroundColor: "var(--surface-solid)",
                            border: `1px solid ${theme.border}`
                        }}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                            <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                    </button>
                    <button
                        title="Forward"
                        className="icon-btn"
                        style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            backgroundColor: "var(--surface-solid)",
                            border: `1px solid ${theme.border}`
                        }}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </button>
                </div>

                {/* Pill Search Bar */}
                <div style={{
                    flex: 1,
                    maxWidth: "460px",
                    position: "relative",
                    display: "flex",
                    alignItems: "center"
                }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" style={{ position: "absolute", left: "14px", pointerEvents: "none" }}>
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input
                        type="search"
                        placeholder="Search for songs, artists etc."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{
                            width: "100%",
                            padding: "10px 16px 10px 42px",
                            borderRadius: "24px",
                            backgroundColor: "var(--surface-solid)",
                            border: `1px solid ${theme.border}`,
                            color: "var(--text-dark)",
                            fontSize: "0.88rem",
                            outline: "none"
                        }}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            style={{ position: "absolute", right: "12px", color: "var(--text-muted)", fontSize: "0.8rem", padding: "4px" }}
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* Right Header Actions */}
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "12px" }}>
                    <button
                        onClick={onOpenSettings}
                        title="Settings"
                        className="icon-btn"
                        style={{
                            width: "38px",
                            height: "38px",
                            borderRadius: "50%",
                            backgroundColor: "var(--surface-solid)",
                            border: `1px solid ${theme.border}`
                        }}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                    </button>

                    {/* Cyan "Sync Library" Action Button */}
                    <button
                        onClick={onSyncLibrary}
                        disabled={isScanning}
                        style={{
                            padding: "9px 20px",
                            borderRadius: "24px",
                            backgroundColor: "var(--primary)",
                            color: "#0c0f14",
                            fontWeight: "700",
                            fontSize: "0.84rem",
                            boxShadow: "0 4px 16px var(--primary-glow)",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            transition: "transform 0.15s ease"
                        }}
                        onMouseOver={e => e.currentTarget.style.transform = "scale(1.03)"}
                        onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                            <polyline points="23 4 23 10 17 10"></polyline>
                            <polyline points="1 20 1 14 7 14"></polyline>
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                        </svg>
                        {isScanning ? "Scanning..." : "Sync Library"}
                    </button>
                </div>
            </div>

            {/* --- HERO BANNER: "ARTIST OF THE MONTH" / FEATURED --- */}
            {heroTrack && (
                <div className="glass-panel" style={{
                    minHeight: "220px",
                    borderRadius: "24px",
                    position: "relative",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    padding: "28px 32px",
                    background: "var(--heroGradient)",
                    border: "1px solid var(--border)"
                }}>
                    <div style={{ position: "relative", zIndex: 2, maxWidth: "58%" }}>
                        <span style={{
                            fontSize: "0.74rem",
                            fontWeight: "700",
                            letterSpacing: "1px",
                            textTransform: "uppercase",
                            color: "var(--primary)",
                            display: "block",
                            marginBottom: "8px"
                        }}>
                            Featured Sound
                        </span>

                        <h1 style={{
                            fontSize: "clamp(1.8rem, 3.2vw, 2.6rem)",
                            fontWeight: "800",
                            color: "var(--text-dark)",
                            margin: "0 0 6px 0",
                            lineHeight: 1.1,
                            letterSpacing: "-0.5px"
                        }}>
                            {heroTrack.artist}
                        </h1>

                        <p style={{
                            fontSize: "1.05rem",
                            color: "var(--text-muted)",
                            margin: "0 0 16px 0",
                            fontWeight: "500"
                        }}>
                            {heroTrack.title} · {heroTrack.album || "Single"}
                        </p>

                        {/* Social listening stats badge */}
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "16px",
                            fontSize: "0.78rem",
                            color: "var(--text-muted)",
                            marginBottom: "20px"
                        }}>
                            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                                {formatTime(heroTrack.duration)}
                            </span>
                            <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                                <svg viewBox="0 0 24 24" fill={isHeroFavorite ? "var(--primary)" : "none"} stroke={isHeroFavorite ? "var(--primary)" : "currentColor"} strokeWidth="2" width="14" height="14">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                </svg>
                                {isHeroFavorite ? "Favorited" : "Like"}
                            </span>
                        </div>

                        {/* Banner Action Buttons */}
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <button
                                onClick={() => {
                                    if (currentTrack?.path === heroTrack.path) {
                                        togglePause();
                                    } else {
                                        handlePlayTrack(heroTrack);
                                    }
                                }}
                                style={{
                                    padding: "10px 24px",
                                    borderRadius: "22px",
                                    backgroundColor: "var(--primary)",
                                    color: "#0c0f14",
                                    fontWeight: "700",
                                    fontSize: "0.88rem",
                                    boxShadow: "0 4px 16px var(--primary-glow)",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    transition: "transform 0.15s ease"
                                }}
                                onMouseOver={e => e.currentTarget.style.transform = "scale(1.04)"}
                                onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
                            >
                                {currentTrack?.path === heroTrack.path && isPlaying ? "Pause" : "Play Now"}
                            </button>

                            <button
                                onClick={() => toggleFavorite(heroTrack.path)}
                                style={{
                                    padding: "10px 20px",
                                    borderRadius: "22px",
                                    backgroundColor: "transparent",
                                    color: isHeroFavorite ? "var(--primary)" : "var(--text-dark)",
                                    border: isHeroFavorite ? "1px solid var(--primary)" : `1px solid ${theme.border}`,
                                    fontWeight: "600",
                                    fontSize: "0.88rem",
                                    transition: "all 0.2s ease"
                                }}
                            >
                                {isHeroFavorite ? "Favorited ✓" : "Add to Liked"}
                            </button>
                        </div>
                    </div>

                    {/* Blended Album Artwork Visual */}
                    <div style={{
                        position: "absolute",
                        right: "24px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: "210px",
                        height: "210px",
                        borderRadius: "20px",
                        overflow: "hidden",
                        boxShadow: "0 16px 40px rgba(0,0,0,0.35)",
                        zIndex: 1
                    }}>
                        <Artwork
                            src={
                                currentTrack && currentTrack.path.toLowerCase() === heroTrack.path.toLowerCase()
                                    ? currentAlbumArt
                                    : albumArtCache[heroTrack.path.toLowerCase()] || null
                            }
                            alt={heroTrack.title}
                            width="100%"
                            height="100%"
                            borderRadius={20}
                            iconSize={48}
                            sublabel="No Artwork"
                        />
                    </div>
                </div>
            )}

            {/* --- "ALBUM OF THE WEEK" / RECENT ALBUMS CAROUSEL --- */}
            <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                    <h2 style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--text-dark)", margin: 0 }}>
                        Album of the week
                    </h2>
                    <div style={{ display: "flex", gap: "6px" }}>
                        <button onClick={() => scrollCarousel("left")} className="icon-btn" style={{ padding: "4px" }} title="Scroll Left">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                <polyline points="15 18 9 12 15 6"></polyline>
                            </svg>
                        </button>
                        <button onClick={() => scrollCarousel("right")} className="icon-btn" style={{ padding: "4px" }} title="Scroll Right">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                        </button>
                    </div>
                </div>

                <div
                    ref={carouselRef}
                    style={{
                        display: "flex",
                        gap: "16px",
                        overflowX: "auto",
                        paddingBottom: "8px",
                        scrollbarWidth: "none"
                    }}
                >
                    {albums.map(track => {
                        return (
                            <div
                                key={track.path}
                                onClick={() => handlePlayTrack(track)}
                                onContextMenu={e => handleContextMenu(e, track)}
                                className="glass-card"
                                style={{
                                    width: "142px",
                                    flexShrink: 0,
                                    padding: "10px",
                                    cursor: "pointer"
                                }}
                            >
                                <div style={{
                                    width: "100%",
                                    aspectRatio: "1 / 1",
                                    borderRadius: "14px",
                                    overflow: "hidden",
                                    backgroundColor: "var(--surface-solid)",
                                    marginBottom: "10px",
                                    boxShadow: "0 6px 16px rgba(0,0,0,0.18)"
                                }}>
                                    <Artwork
                                        src={albumArtCache[track.path.toLowerCase()] || null}
                                        alt={track.album || track.title}
                                        width="100%"
                                        height="100%"
                                        borderRadius={14}
                                        iconSize={36}
                                    />
                                </div>
                                <div style={{
                                    fontSize: "0.85rem",
                                    fontWeight: "700",
                                    color: "var(--text-dark)",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis"
                                }}>
                                    {track.artist}
                                </div>
                                <div style={{
                                    fontSize: "0.75rem",
                                    color: "var(--text-muted)",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    marginTop: "2px"
                                }}>
                                    {track.album || track.title}
                                </div>
                            </div>
                        );
                    })}

                    {albums.length === 0 && (
                        <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", padding: "16px" }}>
                            No albums found yet. Sync your music folder in Settings.
                        </div>
                    )}
                </div>
            </div>

            {/* --- "POPULAR TRACKS" RANKED LIST --- */}
            <div style={{ paddingBottom: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                    <h2 style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--text-dark)", margin: 0 }}>
                        Popular Tracks
                    </h2>
                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", cursor: "pointer" }}>
                        See All
                    </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {popularTracks.map((track, idx) => {
                        const rankNum = String(idx + 1).padStart(2, "0");
                        const isCurrent = currentTrack?.path === track.path;
                        const isFav = favorites.includes(track.path);

                        return (
                            <div
                                key={track.path}
                                className={`track-row ${isCurrent ? "is-active" : ""}`}
                                onClick={() => handlePlayTrack(track)}
                                onContextMenu={e => handleContextMenu(e, track)}
                            >
                                {/* Rank Number */}
                                <span style={{
                                    width: "28px",
                                    fontSize: "0.85rem",
                                    fontWeight: "700",
                                    color: isCurrent ? "var(--primary)" : "var(--text-muted)"
                                }}>
                                    {rankNum}
                                </span>

                                {/* Mini Album Thumbnail */}
                                <Artwork
                                    src={albumArtCache[track.path.toLowerCase()] || null}
                                    alt={track.title}
                                    width={40}
                                    height={40}
                                    borderRadius={10}
                                    iconSize={18}
                                    style={{ marginRight: "14px", flexShrink: 0 }}
                                />

                                {/* Title & Artist */}
                                <div style={{ flex: 1.5, minWidth: 0 }}>
                                    <div style={{
                                        fontSize: "0.88rem",
                                        fontWeight: "600",
                                        color: isCurrent ? "var(--primary)" : "var(--text-dark)",
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis"
                                    }}>
                                        {track.title}
                                    </div>
                                    <div style={{
                                        fontSize: "0.75rem",
                                        color: "var(--text-muted)",
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis"
                                    }}>
                                        {track.artist}
                                    </div>
                                </div>

                                {/* Album Name */}
                                <div style={{
                                    flex: 1.2,
                                    fontSize: "0.78rem",
                                    color: "var(--text-muted)",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    padding: "0 10px"
                                }}>
                                    {track.album || "—"}
                                </div>

                                {/* Duration with Clock icon */}
                                <div style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "5px",
                                    fontSize: "0.76rem",
                                    color: "var(--text-muted)",
                                    width: "80px",
                                    fontVariantNumeric: "tabular-nums"
                                }}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <polyline points="12 6 12 12 16 14"></polyline>
                                    </svg>
                                    {formatTime(track.duration)}
                                </div>

                                {/* Favorite Heart Button */}
                                <button
                                    onClick={e => {
                                        e.stopPropagation();
                                        toggleFavorite(track.path);
                                    }}
                                    title={isFav ? "Unlike" : "Like"}
                                    className="icon-btn"
                                    style={{
                                        padding: "6px",
                                        color: isFav ? "var(--primary)" : "var(--text-muted)",
                                        marginRight: "10px"
                                    }}
                                >
                                    <svg viewBox="0 0 24 24" fill={isFav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" width="16" height="16">
                                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                    </svg>
                                </button>

                                {/* Row Play Button */}
                                <button
                                    onClick={e => {
                                        e.stopPropagation();
                                        if (isCurrent) {
                                            togglePause();
                                        } else {
                                            handlePlayTrack(track);
                                        }
                                    }}
                                    title={isCurrent && isPlaying ? "Pause" : "Play"}
                                    style={{
                                        width: "32px",
                                        height: "32px",
                                        borderRadius: "50%",
                                        backgroundColor: isCurrent ? "var(--primary)" : "var(--surface-solid)",
                                        color: isCurrent ? "#0c0f14" : "var(--text-dark)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        border: `1px solid ${theme.border}`,
                                        boxShadow: isCurrent ? "0 2px 8px var(--primary-glow)" : "none"
                                    }}
                                >
                                    {isCurrent && isPlaying ? (
                                        <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
                                            <rect x="6" y="4" width="4" height="16"></rect>
                                            <rect x="14" y="4" width="4" height="16"></rect>
                                        </svg>
                                    ) : (
                                        <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13" style={{ marginLeft: "2px" }}>
                                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                        </svg>
                                    )}
                                </button>
                            </div>
                        );
                    })}

                    {popularTracks.length === 0 && (
                        <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                            No tracks found matching your library. Click "Sync Library" to load your music.
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
