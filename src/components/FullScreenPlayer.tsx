import { useState, useEffect, useRef, useMemo } from "react";
import { Track, SongLyrics } from "../types";
import { formatTime } from "../utils";
import { getTrackLyrics } from "../lyricsService";
import Seekbar from "./Seekbar";
import Artwork from "./Artwork";

interface FullScreenPlayerProps {
    currentTrack: Track | null;
    albumArt: string | null;
    isPlaying: boolean;
    progress: number;
    togglePause: () => void;
    playNext: () => void;
    playPrev: () => void;
    handleSeek: (position: number) => void;
    volume: number;
    handleVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    toggleMute: () => void;
    shuffle: boolean;
    setShuffle: (value: boolean) => void;
    repeat: "off" | "one" | "all";
    setRepeat: (value: "off" | "one" | "all") => void;
    isFavorite: boolean;
    toggleFavorite: () => void;
    onClose: () => void;
    notify?: (msg: string) => void;
    queue?: Track[];
    removeFromQueue?: (index: number) => void;
    handlePlayTrack?: (track: Track) => void;
}

export type FullScreenLayout = "artwork" | "overlay" | "split" | "lyrics";

export default function FullScreenPlayer({
    currentTrack,
    albumArt,
    isPlaying,
    progress,
    togglePause,
    playNext,
    playPrev,
    handleSeek,
    volume,
    handleVolumeChange,
    toggleMute,
    shuffle,
    setShuffle,
    repeat,
    setRepeat,
    isFavorite,
    toggleFavorite,
    onClose,
    notify,
    queue = [],
    removeFromQueue,
    handlePlayTrack
}: FullScreenPlayerProps) {
    // Layout selection (persisted in localStorage)
    const [layout, setLayout] = useState<FullScreenLayout>(() => {
        const saved = localStorage.getItem("aura_fullscreen_layout") as FullScreenLayout;
        if (saved && ["artwork", "overlay", "split", "lyrics"].includes(saved)) {
            return saved;
        }
        return "overlay";
    });

    useEffect(() => {
        localStorage.setItem("aura_fullscreen_layout", layout);
    }, [layout]);

    // Queue drawer state
    const [showQueueDrawer, setShowQueueDrawer] = useState(false);

    // Auto-hide controls state (controls & top/bottom blur fade away when idle)
    const [controlsShown, setControlsShown] = useState(true);
    const idleTimerRef = useRef<number | null>(null);

    const wakeControls = () => {
        setControlsShown(true);
        if (idleTimerRef.current) {
            window.clearTimeout(idleTimerRef.current);
        }
        if (isPlaying && !showQueueDrawer) {
            idleTimerRef.current = window.setTimeout(() => {
                setControlsShown(false);
            }, 3500);
        }
    };

    useEffect(() => {
        if (!isPlaying || showQueueDrawer) {
            setControlsShown(true);
            if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
        } else {
            wakeControls();
        }
        return () => {
            if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
        };
    }, [isPlaying, showQueueDrawer]);

    // Scrubber state
    const [scrubDisplay, setScrubDisplay] = useState<{ isScrubbing: boolean; value: number; holdUntil: number }>({
        isScrubbing: false,
        value: 0,
        holdUntil: 0
    });
    const duration = currentTrack?.duration || 0;
    const currentProgress = (scrubDisplay.isScrubbing || Date.now() < scrubDisplay.holdUntil)
        ? scrubDisplay.value
        : progress;

    // Lyrics state
    const [lyrics, setLyrics] = useState<SongLyrics | null>(null);
    const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const activeLineRef = useRef<HTMLDivElement | null>(null);
    const [following, setFollowing] = useState(true);

    // Fetch lyrics for current track
    useEffect(() => {
        if (!currentTrack) {
            setLyrics(null);
            return;
        }
        let isMounted = true;
        setIsLoadingLyrics(true);

        void (async () => {
            try {
                const res = await getTrackLyrics(currentTrack);
                if (isMounted) {
                    setLyrics(res);
                }
            } catch (e) {
                if (isMounted) setLyrics(null);
            } finally {
                if (isMounted) setIsLoadingLyrics(false);
            }
        })();

        return () => { isMounted = false; };
    }, [currentTrack?.path]);

    // Current active lyric index
    const currentMs = Math.max(0, Math.round(progress * 1000));
    const activeIndex = useMemo(() => {
        if (!lyrics || !lyrics.isSynced || lyrics.lines.length === 0) return -1;
        const lines = lyrics.lines;
        if (currentMs < lines[0].start) return -1;

        let low = 0;
        let high = lines.length - 1;
        let candidate = -1;

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            if (lines[mid].start <= currentMs) {
                candidate = mid;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
        return candidate;
    }, [lyrics, currentMs]);

    // Auto-scroll lyrics in split, overlay, and lyrics layouts
    useEffect(() => {
        if (!following || activeIndex < 0 || !activeLineRef.current || !scrollContainerRef.current) return;
        const container = scrollContainerRef.current;
        const activeEl = activeLineRef.current;
        const containerRect = container.getBoundingClientRect();
        const activeRect = activeEl.getBoundingClientRect();
        const diff = activeRect.top - containerRect.top;
        const targetScroll = container.scrollTop + diff - (container.clientHeight / 2) + (activeEl.clientHeight / 2);

        container.scrollTo({
            top: Math.max(0, targetScroll),
            behavior: "smooth"
        });
    }, [activeIndex, following, layout]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            wakeControls();
            if (e.key === "Escape") {
                e.preventDefault();
                if (showQueueDrawer) {
                    setShowQueueDrawer(false);
                } else {
                    onClose();
                }
            } else if (e.code === "Space") {
                e.preventDefault();
                togglePause();
            } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                handleSeek(Math.max(0, progress - 5));
            } else if (e.key === "ArrowRight") {
                e.preventDefault();
                handleSeek(Math.min(duration, progress + 5));
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [progress, duration, isPlaying, onClose, togglePause, handleSeek, showQueueDrawer]);

    return (
        <div
            onMouseMove={wakeControls}
            onClick={wakeControls}
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 99999,
                backgroundColor: "#020408",
                color: "#ffffff",
                overflow: "hidden",
                cursor: controlsShown ? "default" : "none",
                display: "flex",
                flexDirection: "column",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            }}
        >
            {/* ============================================================== */}
            {/* 1. FULL-SCREEN 4K ALBUM ART: Covers 100% of the screen         */}
            {/* ============================================================== */}
            {albumArt ? (
                <div style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 0,
                    overflow: "hidden",
                    backgroundColor: "#000000"
                }}>
                    <img
                        src={albumArt}
                        alt=""
                        style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            objectPosition: "center",
                            filter: layout === "split" ? "blur(32px) brightness(0.35) saturate(1.4)" : "none",
                            transition: "filter 0.5s ease"
                        }}
                    />
                </div>
            ) : (
                <div style={{
                    position: "absolute",
                    inset: 0,
                    background: "radial-gradient(circle at center, #1e293b 0%, #080b11 100%)",
                    zIndex: 0
                }} />
            )}

            {/* Subtle global gradient scrim for overall depth */}
            <div style={{
                position: "absolute",
                inset: 0,
                background: layout === "artwork"
                    ? "radial-gradient(circle at center, transparent 35%, rgba(0,0,0,0.38) 85%, rgba(0,0,0,0.65) 100%)"
                    : layout === "overlay"
                    ? "linear-gradient(to right, rgba(0,0,0,0.25) 0%, transparent 45%, rgba(0,0,0,0.3) 100%)"
                    : "rgba(0,0,0,0.5)",
                zIndex: 1,
                pointerEvents: "none"
            }} />

            {/* ============================================================== */}
            {/* 2. BLUR ABOVE ALBUM ART (TOP & BOTTOM ONLY)                    */}
            {/*    Keeps blurred areas at top & bottom, rest of art stays clean */}
            {/* ============================================================== */}

            {/* Top Blur & Frosted Scrim */}
            <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: controlsShown ? "150px" : "84px",
                backdropFilter: "blur(28px)",
                WebkitBackdropFilter: "blur(28px)",
                background: "linear-gradient(to bottom, rgba(0, 0, 0, 0.76) 0%, rgba(0, 0, 0, 0.35) 60%, transparent 100%)",
                maskImage: "linear-gradient(to bottom, black 40%, transparent 100%)",
                WebkitMaskImage: "linear-gradient(to bottom, black 40%, transparent 100%)",
                transition: "height 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                zIndex: 2,
                pointerEvents: "none"
            }} />

            {/* Bottom Blur & Frosted Scrim (Keeps song details clean & readable) */}
            <div style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: controlsShown ? "260px" : "150px",
                backdropFilter: "blur(32px)",
                WebkitBackdropFilter: "blur(32px)",
                background: "linear-gradient(to top, rgba(0, 0, 0, 0.88) 0%, rgba(0, 0, 0, 0.45) 60%, transparent 100%)",
                maskImage: "linear-gradient(to top, black 45%, transparent 100%)",
                WebkitMaskImage: "linear-gradient(to top, black 45%, transparent 100%)",
                transition: "height 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                zIndex: 2,
                pointerEvents: "none"
            }} />

            {/* ============================================================== */}
            {/* 3. SONG DETAILS: Always stays visible even when controls fade  */}
            {/* ============================================================== */}
            {(layout === "artwork" || layout === "overlay") && (
                <div style={{
                    position: "absolute",
                    bottom: controlsShown ? "130px" : "36px",
                    left: "48px",
                    maxWidth: layout === "overlay" ? "calc(100vw - 580px)" : "min(760px, 80vw)",
                    zIndex: 8,
                    transition: "bottom 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                    pointerEvents: "none"
                }}>
                    <h1 style={{
                        fontSize: "clamp(2rem, 3.2vw, 2.85rem)",
                        fontWeight: "800",
                        color: "#ffffff",
                        margin: "0 0 6px 0",
                        letterSpacing: "-0.5px",
                        textShadow: "0 4px 28px rgba(0,0,0,0.95), 0 2px 10px rgba(0,0,0,0.8)",
                        lineHeight: 1.2,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                    }}>
                        {currentTrack?.title || "No track playing"}
                    </h1>
                    <p style={{
                        fontSize: "clamp(1.1rem, 1.6vw, 1.35rem)",
                        color: "rgba(255,255,255,0.9)",
                        margin: 0,
                        textShadow: "0 2px 16px rgba(0,0,0,0.95)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                    }}>
                        {currentTrack?.artist || "Unknown Artist"} {currentTrack?.album ? `· ${currentTrack.album}` : ""}
                    </p>
                </div>
            )}

            {/* ============================================================== */}
            {/* 4. LYRICS ON ART: Seamless integrated frosted blur column      */}
            {/*    NO card outlines, borderless blur dissolving into artwork   */}
            {/*    NO 'Synchronized' or 'embedded' tags - clean pure lyrics   */}
            {/* ============================================================== */}
            {layout === "overlay" && (
                <div style={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: "min(560px, 48vw)",
                    backdropFilter: "blur(36px) saturate(1.5)",
                    WebkitBackdropFilter: "blur(36px) saturate(1.5)",
                    background: "linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.28) 22%, rgba(0, 0, 0, 0.6) 100%)",
                    maskImage: "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
                    WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 22%, black 100%)",
                    border: "none",
                    boxShadow: "none",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    zIndex: 7
                }}>
                    {/* Scrolling multi-line lyrics list without card borders */}
                    <div
                        ref={scrollContainerRef}
                        onWheel={() => setFollowing(false)}
                        onTouchMove={() => setFollowing(false)}
                        style={{
                            flex: 1,
                            overflowY: "auto",
                            padding: "140px 52px 160px 48px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "18px",
                            scrollBehavior: "smooth",
                            maskImage: "linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)",
                            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)"
                        }}
                    >
                        {isLoadingLyrics ? (
                            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "1.05rem", padding: "12px 0", textAlign: "left" }}>
                                Loading lyrics...
                            </div>
                        ) : lyrics && lyrics.lines.length > 0 ? (
                            lyrics.lines.map((line, idx) => {
                                const isCurrent = idx === activeIndex;
                                const isPast = activeIndex >= 0 && idx < activeIndex;

                                return (
                                    <div
                                        key={`overlay-line-${idx}`}
                                        ref={isCurrent ? activeLineRef : null}
                                        onClick={() => {
                                            if (line.start >= 0) handleSeek(line.start / 1000);
                                            setFollowing(true);
                                        }}
                                        style={{
                                            fontSize: isCurrent ? "1.75rem" : "1.24rem",
                                            fontWeight: isCurrent ? "800" : "600",
                                            color: isCurrent
                                                ? "var(--primary)"
                                                : isPast
                                                ? "rgba(255, 255, 255, 0.82)"
                                                : "rgba(255, 255, 255, 0.38)",
                                            cursor: "pointer",
                                            transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                                            transform: isCurrent ? "scale(1.03)" : "scale(1)",
                                            transformOrigin: "left center",
                                            lineHeight: "1.45",
                                            textShadow: isCurrent ? "0 0 28px var(--primary-soft)" : "none",
                                            padding: "4px 0",
                                            border: "none",
                                            background: "none"
                                        }}
                                        onMouseOver={(e) => {
                                            if (!isCurrent) {
                                                e.currentTarget.style.color = "rgba(255, 255, 255, 0.95)";
                                            }
                                        }}
                                        onMouseOut={(e) => {
                                            if (!isCurrent) {
                                                e.currentTarget.style.color = isPast ? "rgba(255, 255, 255, 0.82)" : "rgba(255, 255, 255, 0.38)";
                                            }
                                        }}
                                    >
                                        {line.text || "♪"}
                                    </div>
                                );
                            })
                        ) : (
                            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "1.05rem", lineHeight: "1.7", whiteSpace: "pre-wrap", textAlign: "left", padding: "40px 0" }}>
                                {lyrics?.plainLyrics || "No lyrics available for this song."}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- 5. TOP BAR (Fades with controlsShown) --- */}
            <header style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                zIndex: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "24px 36px",
                opacity: controlsShown ? 1 : 0,
                transform: controlsShown ? "translateY(0)" : "translateY(-12px)",
                transition: "opacity 0.35s ease, transform 0.35s ease",
                pointerEvents: controlsShown ? "auto" : "none"
            }}>
                {/* Exit Full Screen Button */}
                <button
                    onClick={onClose}
                    className="icon-btn"
                    title="Exit full screen (Esc)"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        backgroundColor: "rgba(0,0,0,0.35)",
                        backdropFilter: "blur(16px)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: "14px",
                        padding: "8px 16px",
                        color: "#ffffff",
                        fontSize: "0.85rem",
                        fontWeight: "600",
                        cursor: "pointer",
                        transition: "background 0.2s"
                    }}
                    onMouseOver={e => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.18)"}
                    onMouseOut={e => e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.35)"}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                    <span>Back</span>
                </button>

                {/* Layout Mode Selector (Artwork, Lyrics on Art, Split, Lyrics) */}
                <div style={{
                    display: "flex",
                    backgroundColor: "rgba(0,0,0,0.4)",
                    backdropFilter: "blur(20px)",
                    borderRadius: "16px",
                    padding: "4px",
                    border: "1px solid rgba(255,255,255,0.15)"
                }}>
                    {(
                        [
                            { id: "artwork", label: "Artwork" },
                            { id: "overlay", label: "Lyrics on Art" },
                            { id: "split", label: "Split" },
                            { id: "lyrics", label: "Lyrics" }
                        ] as { id: FullScreenLayout; label: string }[]
                    ).map(item => {
                        const active = layout === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setLayout(item.id);
                                    notify?.(`Layout: ${item.label}`);
                                }}
                                style={{
                                    padding: "6px 16px",
                                    borderRadius: "12px",
                                    fontSize: "0.8rem",
                                    fontWeight: active ? "700" : "500",
                                    backgroundColor: active ? "var(--primary)" : "transparent",
                                    color: active ? "#0c0f14" : "rgba(255,255,255,0.75)",
                                    cursor: "pointer",
                                    transition: "all 0.18s ease"
                                }}
                            >
                                {item.label}
                            </button>
                        );
                    })}
                </div>

                {/* Right Top Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {/* Up Next Queue Toggle */}
                    {queue.length > 0 && (
                        <button
                            onClick={() => setShowQueueDrawer(prev => !prev)}
                            title={`Up Next (${queue.length})`}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "8px 14px",
                                borderRadius: "14px",
                                backgroundColor: showQueueDrawer ? "var(--primary)" : "rgba(0,0,0,0.35)",
                                backdropFilter: "blur(16px)",
                                border: "1px solid rgba(255,255,255,0.15)",
                                color: showQueueDrawer ? "#0c0f14" : "rgba(255,255,255,0.8)",
                                fontSize: "0.8rem",
                                fontWeight: "700",
                                cursor: "pointer"
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
                            <span>Queue</span>
                            <span style={{
                                backgroundColor: showQueueDrawer ? "rgba(0,0,0,0.2)" : "var(--primary)",
                                color: showQueueDrawer ? "#0c0f14" : "#0c0f14",
                                borderRadius: "6px",
                                padding: "1px 6px",
                                fontSize: "0.72rem"
                            }}>
                                {queue.length}
                            </span>
                        </button>
                    )}

                    {/* Favorite Heart */}
                    <button
                        onClick={toggleFavorite}
                        title={isFavorite ? "Remove from Liked" : "Add to Liked"}
                        style={{
                            width: "42px",
                            height: "42px",
                            borderRadius: "14px",
                            backgroundColor: "rgba(0,0,0,0.35)",
                            backdropFilter: "blur(16px)",
                            border: "1px solid rgba(255,255,255,0.15)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: isFavorite ? "var(--primary)" : "rgba(255,255,255,0.75)",
                            cursor: "pointer"
                        }}
                    >
                        <svg viewBox="0 0 24 24" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" width="18" height="18">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                    </button>

                    {/* Close */}
                    <button
                        onClick={onClose}
                        title="Close Full Screen"
                        style={{
                            width: "42px",
                            height: "42px",
                            borderRadius: "14px",
                            backgroundColor: "rgba(0,0,0,0.35)",
                            backdropFilter: "blur(16px)",
                            border: "1px solid rgba(255,255,255,0.15)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "rgba(255,255,255,0.75)",
                            cursor: "pointer"
                        }}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </header>

            {/* --- 6. MAIN STAGE REGION (SPLIT & LYRICS ONLY) --- */}
            {(layout === "split" || layout === "lyrics") && (
                <main style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    padding: "90px 48px 160px 48px"
                }}>
                    {/* SPLIT LAYOUT (ALBUM ART LEFT, SYNCED LYRICS RIGHT) */}
                    {layout === "split" && (
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "64px",
                            width: "100%",
                            maxWidth: "1280px",
                            height: "100%"
                        }}>
                            {/* Left: Album Art Card */}
                            <div style={{
                                flex: "0 0 400px",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "flex-start"
                            }}>
                                <div style={{
                                    width: "min(380px, 42vh)",
                                    height: "min(380px, 42vh)",
                                    borderRadius: "24px",
                                    overflow: "hidden",
                                    boxShadow: "0 28px 70px rgba(0,0,0,0.7), 0 0 50px rgba(0, 229, 204, 0.15)",
                                    marginBottom: "24px"
                                }}>
                                    <Artwork
                                        src={albumArt}
                                        alt={currentTrack?.title || "Album Art"}
                                        borderRadius={24}
                                        iconSize={64}
                                        showLabel="No artwork available"
                                    />
                                </div>

                                <h2 style={{ fontSize: "1.75rem", fontWeight: "800", color: "#ffffff", margin: "0 0 6px 0", letterSpacing: "-0.4px" }}>
                                    {currentTrack?.title || "No track playing"}
                                </h2>
                                <p style={{ fontSize: "1.02rem", color: "rgba(255,255,255,0.72)", margin: 0 }}>
                                    {currentTrack?.artist || "Unknown Artist"}
                                </p>
                            </div>

                            {/* Right: Synced Lyrics View */}
                            <div
                                ref={scrollContainerRef}
                                style={{
                                    flex: 1,
                                    height: "100%",
                                    overflowY: "auto",
                                    padding: "60px 24px",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "16px",
                                    scrollBehavior: "smooth",
                                    maskImage: "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)",
                                    WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)"
                                }}
                            >
                                {isLoadingLyrics ? (
                                    <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "1.1rem" }}>Loading lyrics...</div>
                                ) : lyrics && lyrics.lines.length > 0 ? (
                                    lyrics.lines.map((line, idx) => {
                                        const isCurrent = idx === activeIndex;
                                        const isPast = activeIndex >= 0 && idx < activeIndex;

                                        return (
                                            <div
                                                key={`split-line-${idx}`}
                                                ref={isCurrent ? activeLineRef : null}
                                                onClick={() => {
                                                    if (line.start >= 0) handleSeek(line.start / 1000);
                                                    setFollowing(true);
                                                }}
                                                style={{
                                                    fontSize: isCurrent ? "1.85rem" : "1.35rem",
                                                    fontWeight: isCurrent ? "800" : "600",
                                                    color: isCurrent ? "var(--primary)" : isPast ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.32)",
                                                    cursor: "pointer",
                                                    transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                                                    transform: isCurrent ? "scale(1.03)" : "scale(1)",
                                                    transformOrigin: "left center",
                                                    lineHeight: "1.4",
                                                    textShadow: isCurrent ? "0 0 24px var(--primary-soft)" : "none",
                                                    padding: "6px 0"
                                                }}
                                            >
                                                {line.text || "♪"}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "1.1rem" }}>
                                        {lyrics?.plainLyrics || "No synchronized lyrics available for this song."}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* LYRICS FOCUSED VIEW */}
                    {layout === "lyrics" && (
                        <div
                            ref={scrollContainerRef}
                            style={{
                                maxWidth: "760px",
                                width: "100%",
                                height: "100%",
                                overflowY: "auto",
                                padding: "80px 32px",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                textAlign: "center",
                                gap: "24px",
                                scrollBehavior: "smooth",
                                maskImage: "linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)",
                                WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)"
                            }}
                        >
                            {isLoadingLyrics ? (
                                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "1.2rem" }}>Loading lyrics...</div>
                            ) : lyrics && lyrics.lines.length > 0 ? (
                                lyrics.lines.map((line, idx) => {
                                    const isCurrent = idx === activeIndex;
                                    const isPast = activeIndex >= 0 && idx < activeIndex;

                                    return (
                                        <div
                                            key={`focused-line-${idx}`}
                                            ref={isCurrent ? activeLineRef : null}
                                            onClick={() => {
                                                if (line.start >= 0) handleSeek(line.start / 1000);
                                                setFollowing(true);
                                            }}
                                            style={{
                                                fontSize: isCurrent ? "2.2rem" : "1.45rem",
                                                fontWeight: isCurrent ? "800" : "600",
                                                color: isCurrent ? "var(--primary)" : isPast ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.3)",
                                                cursor: "pointer",
                                                transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                                                transform: isCurrent ? "scale(1.05)" : "scale(1)",
                                                textShadow: isCurrent ? "0 0 32px var(--primary-soft)" : "none",
                                                lineHeight: "1.4",
                                                padding: "6px 12px"
                                            }}
                                        >
                                            {line.text || "♪"}
                                        </div>
                                    );
                                })
                            ) : (
                                <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "1.2rem", lineHeight: "1.8", whiteSpace: "pre-wrap" }}>
                                    {lyrics?.plainLyrics || "No lyrics available"}
                                </div>
                            )}
                        </div>
                    )}
                </main>
            )}

            {/* --- 7. BOTTOM CONTROLS & TRANSPORT BAR (Fades out when idle) --- */}
            <footer style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 10,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "0 48px 32px 48px",
                opacity: controlsShown ? 1 : 0,
                transform: controlsShown ? "translateY(0)" : "translateY(12px)",
                transition: "opacity 0.35s ease, transform 0.35s ease",
                pointerEvents: controlsShown ? "auto" : "none"
            }}>
                <div style={{ width: "100%", maxWidth: "800px", display: "flex", flexDirection: "column", gap: "16px" }}>
                    {/* Full-width Seekbar Row */}
                    <div style={{ display: "flex", alignItems: "center", width: "100%", gap: "14px" }}>
                        <span style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.75)", fontVariantNumeric: "tabular-nums", width: "42px", textAlign: "right" }}>
                            {formatTime(currentProgress)}
                        </span>

                        <Seekbar
                            progress={progress}
                            duration={duration}
                            onSeek={handleSeek}
                            disabled={!currentTrack || duration <= 0}
                            trackHeight={6}
                            thumbSize={14}
                            activeThumbSize={18}
                            trackColor="rgba(255,255,255,0.2)"
                            onScrubChange={(isScrubbing, value) => setScrubDisplay({
                                isScrubbing,
                                value,
                                holdUntil: isScrubbing ? Date.now() + 10000 : Date.now() + 1200
                            })}
                        />

                        <span style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.75)", fontVariantNumeric: "tabular-nums", width: "42px" }}>
                            {formatTime(duration)}
                        </span>
                    </div>

                    {/* Central Playback Controls + Volume Row */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                        {/* Placeholder left spacer for center balance */}
                        <div style={{ width: "200px" }} />

                        {/* Central transport buttons */}
                        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
                            {/* Shuffle */}
                            <button
                                onClick={() => setShuffle(!shuffle)}
                                title={`Shuffle: ${shuffle ? "On" : "Off"}`}
                                style={{
                                    color: shuffle ? "var(--primary)" : "rgba(255,255,255,0.5)",
                                    padding: "8px",
                                    cursor: "pointer"
                                }}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                                    <polyline points="16 3 21 3 21 8"></polyline>
                                    <line x1="4" y1="20" x2="21" y2="3"></line>
                                    <polyline points="21 16 21 21 16 21"></polyline>
                                    <line x1="15" y1="15" x2="21" y2="21"></line>
                                    <line x1="4" y1="4" x2="9" y2="9"></line>
                                </svg>
                            </button>

                            {/* Previous Track */}
                            <button
                                onClick={playPrev}
                                title="Previous Track"
                                style={{
                                    color: "rgba(255,255,255,0.85)",
                                    padding: "8px",
                                    cursor: "pointer"
                                }}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="22" height="22">
                                    <polygon points="19 20 9 12 19 4 19 20"></polygon>
                                    <line x1="5" y1="19" x2="5" y2="5"></line>
                                </svg>
                            </button>

                            {/* Big Play / Pause Button */}
                            <button
                                onClick={togglePause}
                                title={isPlaying ? "Pause" : "Play"}
                                style={{
                                    width: "56px",
                                    height: "56px",
                                    borderRadius: "50%",
                                    backgroundColor: "var(--primary)",
                                    color: "#0c0f14",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    boxShadow: "0 8px 24px rgba(0, 229, 204, 0.45)",
                                    cursor: "pointer",
                                    transition: "transform 0.15s ease"
                                }}
                                onMouseOver={e => e.currentTarget.style.transform = "scale(1.06)"}
                                onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
                            >
                                {isPlaying ? (
                                    <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                                        <rect x="6" y="4" width="4" height="16" rx="1"></rect>
                                        <rect x="14" y="4" width="4" height="16" rx="1"></rect>
                                    </svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24" style={{ marginLeft: "3px" }}>
                                        <polygon points="6 4 20 12 6 20 6 4"></polygon>
                                    </svg>
                                )}
                            </button>

                            {/* Next Track */}
                            <button
                                onClick={playNext}
                                title="Next Track"
                                style={{
                                    color: "rgba(255,255,255,0.85)",
                                    padding: "8px",
                                    cursor: "pointer"
                                }}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="22" height="22">
                                    <polygon points="5 4 15 12 5 20 5 4"></polygon>
                                    <line x1="19" y1="5" x2="19" y2="19"></line>
                                </svg>
                            </button>

                            {/* Repeat */}
                            <button
                                onClick={() => setRepeat(repeat === "off" ? "all" : repeat === "all" ? "one" : "off")}
                                title={`Repeat: ${repeat}`}
                                style={{
                                    color: repeat !== "off" ? "var(--primary)" : "rgba(255,255,255,0.5)",
                                    padding: "8px",
                                    cursor: "pointer"
                                }}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                                    <polyline points="17 1 21 5 17 9"></polyline>
                                    <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                                    <polyline points="7 23 3 19 7 15"></polyline>
                                    <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                                </svg>
                            </button>
                        </div>

                        {/* Volume slider right */}
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "200px", justifyContent: "flex-end" }}>
                            <button
                                onClick={toggleMute}
                                style={{ color: "rgba(255,255,255,0.75)", padding: "6px", cursor: "pointer" }}
                                title={volume === 0 ? "Unmute" : "Mute"}
                            >
                                {volume === 0 ? (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                        <line x1="23" y1="9" x2="17" y2="15"></line>
                                        <line x1="17" y1="9" x2="23" y2="15"></line>
                                    </svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                                    </svg>
                                )}
                            </button>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={volume}
                                onChange={handleVolumeChange}
                                className="scrubber-slider"
                                style={{
                                    width: "90px",
                                    height: "4px",
                                    background: `linear-gradient(to right, var(--primary) ${volume}%, rgba(255,255,255,0.2) ${volume}%)`
                                }}
                            />
                        </div>
                    </div>
                </div>
            </footer>

            {/* --- 8. UP NEXT QUEUE SLIDING DRAWER --- */}
            {showQueueDrawer && (
                <div style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    bottom: 0,
                    width: "360px",
                    maxWidth: "85vw",
                    backgroundColor: "rgba(10, 14, 20, 0.88)",
                    backdropFilter: "blur(28px)",
                    WebkitBackdropFilter: "blur(28px)",
                    borderLeft: "1px solid rgba(255,255,255,0.14)",
                    zIndex: 100,
                    display: "flex",
                    flexDirection: "column",
                    padding: "24px 20px",
                    boxShadow: "-12px 0 40px rgba(0,0,0,0.6)"
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <h3 style={{ fontSize: "1.1rem", fontWeight: "700", color: "#ffffff", margin: 0 }}>
                                Up Next
                            </h3>
                            <span style={{ fontSize: "0.76rem", color: "var(--primary)", fontWeight: "700" }}>
                                ({queue.length})
                            </span>
                        </div>
                        <button
                            onClick={() => setShowQueueDrawer(false)}
                            style={{ color: "rgba(255,255,255,0.6)", padding: "4px", cursor: "pointer" }}
                        >
                            ✕
                        </button>
                    </div>

                    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
                        {queue.map((track, idx) => (
                            <div
                                key={`${track.path}-${idx}`}
                                onClick={() => {
                                    handlePlayTrack?.(track);
                                    setShowQueueDrawer(false);
                                }}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: "8px 12px",
                                    borderRadius: "10px",
                                    backgroundColor: "rgba(255,255,255,0.05)",
                                    border: "1px solid rgba(255,255,255,0.08)",
                                    cursor: "pointer",
                                    transition: "background 0.15s ease"
                                }}
                                onMouseOver={e => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.12)"}
                                onMouseOut={e => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)"}
                            >
                                <div style={{ overflow: "hidden", minWidth: 0, flex: 1, paddingRight: "8px" }}>
                                    <div style={{ fontSize: "0.88rem", fontWeight: "600", color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {track.title}
                                    </div>
                                    <div style={{ fontSize: "0.76rem", color: "rgba(255,255,255,0.6)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {track.artist}
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeFromQueue?.(idx);
                                    }}
                                    style={{ color: "rgba(255,255,255,0.5)", padding: "4px", cursor: "pointer" }}
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
