import { useState, useEffect, useRef, useMemo } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { Track, SongLyrics } from "../types";
import { formatTime } from "../utils";
import { getTrackLyrics, importLyricsForTrack } from "../lyricsService";

interface LyricsViewProps {
    currentTrack: Track | null;
    currentAlbumArt: string | null;
    progress: number;
    isPlaying: boolean;
    handleSeek: (position: number) => void;
    onClose?: () => void;
    notify?: (msg: string) => void;
}

export default function LyricsView({
    currentTrack,
    currentAlbumArt,
    progress,
    isPlaying,
    handleSeek,
    onClose,
    notify
}: LyricsViewProps) {
    const [lyrics, setLyrics] = useState<SongLyrics | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Timing offset in milliseconds (saved per track path in localStorage)
    const [lyricOffset, setLyricOffset] = useState<number>(0);
    const [showOffsetControls, setShowOffsetControls] = useState(false);

    // Search inside lyrics
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Auto-scroll follow state
    const [following, setFollowing] = useState(true);
    const autoScrollTimeoutRef = useRef<number | null>(null);

    // Display mode: "synced" (if available) or "plain"
    const [viewMode, setViewMode] = useState<"synced" | "plain">("synced");

    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const activeLineRef = useRef<HTMLDivElement | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Load track offset from localStorage when track changes
    useEffect(() => {
        if (!currentTrack) {
            setLyricOffset(0);
            return;
        }
        const key = `aura_lyric_offset_${currentTrack.path}`;
        const saved = localStorage.getItem(key);
        setLyricOffset(saved ? parseInt(saved, 10) : 0);
        setSearchOpen(false);
        setSearchQuery("");
        setFollowing(true);
    }, [currentTrack?.path]);

    // Save offset to localStorage
    const updateOffset = (newOffset: number) => {
        setLyricOffset(newOffset);
        if (currentTrack) {
            localStorage.setItem(`aura_lyric_offset_${currentTrack.path}`, String(newOffset));
        }
    };

    // Load lyrics whenever currentTrack changes
    useEffect(() => {
        if (!currentTrack) {
            setLyrics(null);
            setIsLoading(false);
            setError(null);
            return;
        }

        abortControllerRef.current?.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setIsLoading(true);
        setError(null);

        void (async () => {
            try {
                const result = await getTrackLyrics(currentTrack, false, controller.signal);
                if (controller.signal.aborted) return;

                if (result) {
                    setLyrics(result);
                    setViewMode(result.isSynced ? "synced" : "plain");
                } else {
                    setLyrics(null);
                }
            } catch (err: any) {
                if (err?.name === "AbortError") return;
                setError(String(err?.message || "Failed to load lyrics"));
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        })();

        return () => {
            controller.abort();
        };
    }, [currentTrack?.path]);

    // Force reload / online search
    const handleReload = async (forceOnline = false) => {
        if (!currentTrack) return;
        setIsLoading(true);
        setError(null);
        try {
            const result = await getTrackLyrics(currentTrack, forceOnline);
            setLyrics(result);
            if (result) {
                setViewMode(result.isSynced ? "synced" : "plain");
                notify?.(`Loaded lyrics (${formatSource(result.source)})`);
            } else {
                notify?.("No lyrics found for this song.");
            }
        } catch (err: any) {
            setError(String(err?.message || "Error fetching lyrics"));
        } finally {
            setIsLoading(false);
        }
    };

    // Import local .lrc file
    const handleImportLrc = async () => {
        if (!currentTrack) return;
        try {
            const selected = await open({
                multiple: false,
                filters: [{ name: "LRC Lyrics File", extensions: ["lrc", "txt"] }]
            });

            if (selected && typeof selected === "string") {
                // Tauri 2 gives the path or file string
                const response = await fetch(selected.startsWith("file://") ? selected : `file://${selected}`);
                const text = await response.text();

                if (text && text.trim()) {
                    const imported = await importLyricsForTrack(currentTrack, text);
                    setLyrics(imported);
                    setViewMode(imported.isSynced ? "synced" : "plain");
                    notify?.("Lyrics imported and saved as sidecar .lrc!");
                }
            }
        } catch (e) {
            // Fallback: create hidden input element for webview file picker
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".lrc,.txt";
            input.onchange = async () => {
                const file = input.files?.[0];
                if (!file) return;
                const text = await file.text();
                if (text && text.trim()) {
                    const imported = await importLyricsForTrack(currentTrack, text);
                    setLyrics(imported);
                    setViewMode(imported.isSynced ? "synced" : "plain");
                    notify?.("Lyrics imported and saved!");
                }
            };
            input.click();
        }
    };

    // Copy lyrics to clipboard
    const handleCopyLyrics = () => {
        if (!lyrics) return;
        const text = lyrics.plainLyrics || lyrics.lines.map(l => l.text).join("\n");
        navigator.clipboard.writeText(text);
        notify?.("Lyrics copied to clipboard!");
    };

    // Format human-friendly source name
    const formatSource = (source: string) => {
        switch (source) {
            case "embedded":
                return "Metadata Tag";
            case "sidecar":
                return "Sidecar .LRC";
            case "lrclib":
                return "LRCLIB";
            case "imported":
                return "Imported LRC";
            default:
                return "Offline Cache";
        }
    };

    // Active lyric line calculation
    const currentMs = Math.max(0, Math.round(progress * 1000) + lyricOffset);

    const activeIndex = useMemo(() => {
        if (!lyrics || !lyrics.isSynced || lyrics.lines.length === 0) return -1;
        const lines = lyrics.lines;

        // If before the first line
        if (currentMs < lines[0].start) return -1;

        // Binary search for efficiency
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

    // Auto-scroll effect
    useEffect(() => {
        if (!following || activeIndex < 0 || !activeLineRef.current || !scrollContainerRef.current) return;
        const container = scrollContainerRef.current;
        const activeEl = activeLineRef.current;

        const containerTop = container.offsetTop;
        const activeTop = activeEl.offsetTop;
        const targetScroll = activeTop - containerTop - (container.clientHeight / 2) + (activeEl.clientHeight / 2);

        container.scrollTo({
            top: Math.max(0, targetScroll),
            behavior: "smooth"
        });
    }, [activeIndex, following]);

    // Handle manual user scrolling
    const handleScroll = () => {
        if (following) {
            setFollowing(false);
        }
        if (autoScrollTimeoutRef.current) {
            window.clearTimeout(autoScrollTimeoutRef.current);
        }
        // Automatically resume follow after 8 seconds of inactivity
        autoScrollTimeoutRef.current = window.setTimeout(() => {
            setFollowing(true);
        }, 8000);
    };

    // Filtered search matches
    const searchMatches = useMemo(() => {
        if (!searchQuery.trim() || !lyrics) return [];
        const q = searchQuery.toLowerCase();
        return lyrics.lines
            .map((line, idx) => ({ line, idx }))
            .filter(({ line }) => line.text.toLowerCase().includes(q));
    }, [lyrics, searchQuery]);

    return (
        <div style={{
            width: "300px",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            overflow: "hidden",
            position: "relative"
        }}>
            {/* --- TOP HEADER & CONTROLS --- */}
            <div className="glass-panel" style={{
                padding: "14px 16px",
                borderRadius: "18px",
                marginBottom: "12px",
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                gap: "10px"
            }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                            <path d="M9 18V5l12-2v13"></path>
                            <circle cx="6" cy="18" r="3"></circle>
                            <circle cx="18" cy="16" r="3"></circle>
                        </svg>
                        <span style={{
                            fontSize: "0.85rem",
                            fontWeight: "800",
                            color: "var(--text-dark)",
                            letterSpacing: "0.5px"
                        }}>
                            Lyrics
                        </span>
                        {lyrics && (
                            <span style={{
                                fontSize: "0.68rem",
                                padding: "2px 7px",
                                borderRadius: "6px",
                                backgroundColor: "var(--surface-solid)",
                                border: "1px solid var(--border)",
                                color: "var(--primary)",
                                fontWeight: "600"
                            }}>
                                {formatSource(lyrics.source)}
                            </span>
                        )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        {/* Search toggle */}
                        <button
                            onClick={() => setSearchOpen(prev => !prev)}
                            className="icon-btn"
                            title="Find in lyrics"
                            style={{
                                color: searchOpen ? "var(--primary)" : "var(--text-muted)",
                                padding: "4px"
                            }}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                        </button>

                        {/* Timing offset controls */}
                        {lyrics?.isSynced && (
                            <button
                                onClick={() => setShowOffsetControls(prev => !prev)}
                                className="icon-btn"
                                title="Adjust lyrics timing"
                                style={{
                                    color: lyricOffset !== 0 || showOffsetControls ? "var(--primary)" : "var(--text-muted)",
                                    padding: "4px"
                                }}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                            </button>
                        )}

                        {/* Copy lyrics */}
                        {lyrics && (
                            <button
                                onClick={handleCopyLyrics}
                                className="icon-btn"
                                title="Copy lyrics"
                                style={{ color: "var(--text-muted)", padding: "4px" }}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                            </button>
                        )}

                        {/* Close / return to overview */}
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="icon-btn"
                                title="Close lyrics"
                                style={{ color: "var(--text-muted)", padding: "4px", marginLeft: "2px" }}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                {/* Inline search box */}
                {searchOpen && (
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        backgroundColor: "var(--surface-solid)",
                        padding: "4px 8px",
                        borderRadius: "8px",
                        border: "1px solid var(--border)"
                    }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" width="13" height="13">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        <input
                            type="text"
                            placeholder="Search in lyrics..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{
                                flex: 1,
                                background: "transparent",
                                border: "none",
                                outline: "none",
                                fontSize: "0.78rem",
                                color: "var(--text-dark)"
                            }}
                            autoFocus
                        />
                        {searchQuery && (
                            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                                {searchMatches.length}
                            </span>
                        )}
                        <button
                            onClick={() => { setSearchQuery(""); setSearchOpen(false); }}
                            style={{ color: "var(--text-muted)", fontSize: "0.75rem", padding: "0 2px" }}
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* Timing offset adjustment panel */}
                {showOffsetControls && lyrics?.isSynced && (
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "6px 8px",
                        borderRadius: "8px",
                        backgroundColor: "var(--surface-solid)",
                        border: "1px solid var(--border)",
                        fontSize: "0.75rem"
                    }}>
                        <span style={{ color: "var(--text-muted)" }}>
                            Offset: <strong style={{ color: "var(--text-dark)" }}>{lyricOffset > 0 ? `+${lyricOffset}` : lyricOffset}ms</strong>
                        </span>
                        <div style={{ display: "flex", gap: "4px" }}>
                            <button
                                onClick={() => updateOffset(lyricOffset - 500)}
                                style={{ padding: "2px 6px", borderRadius: "4px", backgroundColor: "var(--surface-hover)", color: "var(--text-dark)" }}
                                title="Delay lyrics by 0.5s"
                            >
                                -0.5s
                            </button>
                            <button
                                onClick={() => updateOffset(lyricOffset - 100)}
                                style={{ padding: "2px 6px", borderRadius: "4px", backgroundColor: "var(--surface-hover)", color: "var(--text-dark)" }}
                                title="Delay lyrics by 0.1s"
                            >
                                -0.1s
                            </button>
                            <button
                                onClick={() => updateOffset(0)}
                                style={{ padding: "2px 6px", borderRadius: "4px", backgroundColor: "var(--surface-hover)", color: "var(--text-muted)" }}
                                title="Reset timing"
                            >
                                Reset
                            </button>
                            <button
                                onClick={() => updateOffset(lyricOffset + 100)}
                                style={{ padding: "2px 6px", borderRadius: "4px", backgroundColor: "var(--surface-hover)", color: "var(--text-dark)" }}
                                title="Advance lyrics by 0.1s"
                            >
                                +0.1s
                            </button>
                            <button
                                onClick={() => updateOffset(lyricOffset + 500)}
                                style={{ padding: "2px 6px", borderRadius: "4px", backgroundColor: "var(--surface-hover)", color: "var(--text-dark)" }}
                                title="Advance lyrics by 0.5s"
                            >
                                +0.5s
                            </button>
                        </div>
                    </div>
                )}

                {/* Mini track info row */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "8px",
                        overflow: "hidden",
                        backgroundColor: "var(--surface-solid)",
                        flexShrink: 0,
                        border: "1px solid var(--border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                    }}>
                        {currentAlbumArt ? (
                            <img src={currentAlbumArt} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" width="18" height="18">
                                <circle cx="12" cy="12" r="10"></circle>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        )}
                    </div>
                    <div style={{ overflow: "hidden", flex: 1, minWidth: 0 }}>
                        <div style={{
                            fontSize: "0.82rem",
                            fontWeight: "700",
                            color: "var(--text-dark)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis"
                        }}>
                            {currentTrack?.title || "No track"}
                        </div>
                        <div style={{
                            fontSize: "0.72rem",
                            color: "var(--text-muted)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis"
                        }}>
                            {currentTrack?.artist || "Unknown artist"}
                        </div>
                    </div>

                    {/* Mode toggle if synced */}
                    {lyrics?.isSynced && (
                        <div style={{ display: "flex", backgroundColor: "var(--surface-solid)", borderRadius: "6px", padding: "2px", border: "1px solid var(--border)" }}>
                            <button
                                onClick={() => setViewMode("synced")}
                                style={{
                                    padding: "2px 6px",
                                    fontSize: "0.68rem",
                                    borderRadius: "4px",
                                    fontWeight: "600",
                                    backgroundColor: viewMode === "synced" ? "var(--primary)" : "transparent",
                                    color: viewMode === "synced" ? "#0c0f14" : "var(--text-muted)"
                                }}
                            >
                                Synced
                            </button>
                            <button
                                onClick={() => setViewMode("plain")}
                                style={{
                                    padding: "2px 6px",
                                    fontSize: "0.68rem",
                                    borderRadius: "4px",
                                    fontWeight: "600",
                                    backgroundColor: viewMode === "plain" ? "var(--primary)" : "transparent",
                                    color: viewMode === "plain" ? "#0c0f14" : "var(--text-muted)"
                                }}
                            >
                                Plain
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* --- MAIN LYRICS CONTENT AREA --- */}
            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="glass-panel"
                style={{
                    flex: 1,
                    overflowY: "auto",
                    borderRadius: "18px",
                    padding: "18px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    position: "relative",
                    scrollBehavior: "smooth"
                }}
            >
                {/* 1. Loading State */}
                {isLoading && (
                    <div style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "100%",
                        gap: "12px",
                        color: "var(--text-muted)"
                    }}>
                        <div style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            border: "3px solid var(--border)",
                            borderTopColor: "var(--primary)",
                            animation: "spin 0.8s linear infinite"
                        }} />
                        <span style={{ fontSize: "0.82rem", fontWeight: "600" }}>Searching lyrics...</span>
                        <span style={{ fontSize: "0.72rem", opacity: 0.7 }}>Checking metadata & LRCLIB</span>
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                )}

                {/* 2. Error or Empty State */}
                {!isLoading && (!lyrics || (lyrics.lines.length === 0 && !lyrics.plainLyrics)) && (
                    <div style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "100%",
                        textAlign: "center",
                        gap: "12px",
                        padding: "16px"
                    }}>
                        <div style={{
                            width: "56px",
                            height: "56px",
                            borderRadius: "50%",
                            backgroundColor: "var(--surface-solid)",
                            border: "1px solid var(--border)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--text-muted)"
                        }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28">
                                <path d="M9 18V5l12-2v13"></path>
                                <circle cx="6" cy="18" r="3"></circle>
                                <circle cx="18" cy="16" r="3"></circle>
                                <line x1="2" y1="2" x2="22" y2="22" stroke="var(--primary)" strokeWidth="2"></line>
                            </svg>
                        </div>

                        <div>
                            <div style={{ fontSize: "0.95rem", fontWeight: "700", color: "var(--text-dark)", marginBottom: "4px" }}>
                                {error ? "Could not load lyrics" : "No lyrics found"}
                            </div>
                            <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", lineHeight: "1.4" }}>
                                {error
                                    ? error
                                    : currentTrack
                                    ? "This track doesn't contain embedded lyrics and wasn't found online."
                                    : "Play a song to view its lyrics."}
                            </div>
                        </div>

                        {currentTrack && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%", marginTop: "8px" }}>
                                <button
                                    onClick={() => handleReload(true)}
                                    style={{
                                        padding: "8px 14px",
                                        borderRadius: "10px",
                                        backgroundColor: "var(--primary)",
                                        color: "#0c0f14",
                                        fontWeight: "700",
                                        fontSize: "0.8rem",
                                        cursor: "pointer"
                                    }}
                                >
                                    Retry Online Search
                                </button>
                                <button
                                    onClick={handleImportLrc}
                                    style={{
                                        padding: "8px 14px",
                                        borderRadius: "10px",
                                        backgroundColor: "var(--surface-solid)",
                                        border: "1px solid var(--border)",
                                        color: "var(--text-dark)",
                                        fontWeight: "600",
                                        fontSize: "0.8rem",
                                        cursor: "pointer"
                                    }}
                                >
                                    Import .LRC File
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* 3. Search Results Overlay (if searching) */}
                {!isLoading && lyrics && searchQuery.trim() && (
                    <div style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px"
                    }}>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: "600", marginBottom: "4px" }}>
                            Matches ({searchMatches.length}):
                        </div>
                        {searchMatches.length === 0 ? (
                            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", padding: "12px 0" }}>
                                No lines found matching "{searchQuery}"
                            </div>
                        ) : (
                            searchMatches.map(({ line, idx }) => (
                                <div
                                    key={`search-${idx}`}
                                    onClick={() => {
                                        if (line.start >= 0) {
                                            handleSeek(line.start / 1000);
                                        }
                                        setSearchOpen(false);
                                        setFollowing(true);
                                    }}
                                    style={{
                                        padding: "8px 10px",
                                        borderRadius: "8px",
                                        backgroundColor: "var(--surface-solid)",
                                        border: "1px solid var(--border)",
                                        cursor: "pointer",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center"
                                    }}
                                >
                                    <span style={{ fontSize: "0.85rem", color: "var(--text-dark)" }}>
                                        {line.text}
                                    </span>
                                    {line.start >= 0 && (
                                        <span style={{ fontSize: "0.72rem", color: "var(--primary)", fontWeight: "600" }}>
                                            {formatTime(line.start / 1000)}
                                        </span>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* 4. Synced Lyrics List */}
                {!isLoading && lyrics && !searchQuery.trim() && viewMode === "synced" && lyrics.isSynced && (
                    <>
                        {lyrics.lines.map((line, index) => {
                            const isCurrent = index === activeIndex;
                            const isPast = activeIndex >= 0 && index < activeIndex;

                            return (
                                <div
                                    key={`line-${index}`}
                                    ref={isCurrent ? activeLineRef : null}
                                    onClick={() => {
                                        handleSeek(line.start / 1000);
                                        setFollowing(true);
                                    }}
                                    style={{
                                        padding: isCurrent ? "12px 14px" : "8px 12px",
                                        borderRadius: "12px",
                                        cursor: "pointer",
                                        transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                                        backgroundColor: isCurrent ? "var(--primary-soft)" : "transparent",
                                        borderLeft: isCurrent ? "3px solid var(--primary)" : "3px solid transparent",
                                        transform: isCurrent ? "scale(1.02)" : "scale(1)",
                                        transformOrigin: "left center"
                                    }}
                                    onMouseEnter={e => {
                                        if (!isCurrent) e.currentTarget.style.backgroundColor = "var(--surface-hover)";
                                    }}
                                    onMouseLeave={e => {
                                        if (!isCurrent) e.currentTarget.style.backgroundColor = "transparent";
                                    }}
                                >
                                    <div style={{
                                        fontSize: isCurrent ? "1.06rem" : "0.92rem",
                                        fontWeight: isCurrent ? "800" : isPast ? "500" : "400",
                                        color: isCurrent
                                            ? "var(--text-dark)"
                                            : isPast
                                            ? "var(--text-dark)"
                                            : "var(--text-muted)",
                                        opacity: isCurrent ? 1 : isPast ? 0.72 : 0.38,
                                        lineHeight: "1.4",
                                        whiteSpace: "pre-wrap",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center"
                                    }}>
                                        <span>{line.text || "♪"}</span>
                                        {isCurrent && isPlaying && (
                                            <span style={{
                                                display: "inline-block",
                                                width: "6px",
                                                height: "6px",
                                                borderRadius: "50%",
                                                backgroundColor: "var(--primary)",
                                                boxShadow: "0 0 8px var(--primary)",
                                                marginLeft: "8px",
                                                flexShrink: 0
                                            }} />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </>
                )}

                {/* 5. Plain Lyrics View */}
                {!isLoading && lyrics && !searchQuery.trim() && (viewMode === "plain" || !lyrics.isSynced) && (
                    <div style={{
                        fontSize: "0.92rem",
                        lineHeight: "1.75",
                        color: "var(--text-dark)",
                        whiteSpace: "pre-wrap",
                        padding: "8px 4px",
                        userSelect: "text"
                    }}>
                        {lyrics.plainLyrics || lyrics.lines.map(l => l.text).join("\n") || "No text available"}
                    </div>
                )}
            </div>

            {/* Floating "Follow lyrics" button when manual scrolling occurs */}
            {lyrics?.isSynced && !following && viewMode === "synced" && (
                <button
                    onClick={() => {
                        setFollowing(true);
                        if (activeLineRef.current && scrollContainerRef.current) {
                            activeLineRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                    }}
                    style={{
                        position: "absolute",
                        bottom: "16px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        padding: "6px 14px",
                        borderRadius: "20px",
                        backgroundColor: "var(--primary)",
                        color: "#0c0f14",
                        fontSize: "0.78rem",
                        fontWeight: "700",
                        boxShadow: "0 6px 18px rgba(0,0,0,0.35)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        zIndex: 10
                    }}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                    Follow lyrics
                </button>
            )}
        </div>
    );
}
