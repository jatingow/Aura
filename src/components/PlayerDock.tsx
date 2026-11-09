import { useState, useEffect } from "react";
import { Track } from "../types";
import { formatTime } from "../utils";

interface PlayerDockProps {
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
    handleShowInExplorer?: () => void;
    sleepTimerRemaining: number | null;
    setSleepTimer: (minutes: number | null) => void;
}

export default function PlayerDock({
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
    handleShowInExplorer,
    sleepTimerRemaining,
    setSleepTimer
}: PlayerDockProps) {
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [scrubValue, setScrubValue] = useState(0);
    const [showSleepMenu, setShowSleepMenu] = useState(false);
    const [customMinutes, setCustomMinutes] = useState("");

    const duration = currentTrack?.duration || 0;
    const currentProgress = isScrubbing ? scrubValue : progress;
    const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentProgress / duration) * 100)) : 0;

    useEffect(() => {
        if (!isScrubbing) {
            setScrubValue(progress);
        }
    }, [progress, isScrubbing]);

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setScrubValue(val);
    };

    const handleSliderCommit = () => {
        setIsScrubbing(false);
        handleSeek(scrubValue);
    };

    const formatTimer = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s < 10 ? "0" : ""}${s}`;
    };

    return (
        <footer style={{
            height: "90px",
            backgroundColor: "var(--now-playing-bg)",
            backdropFilter: "blur(24px)",
            borderTop: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 28px",
            zIndex: 100,
            position: "relative"
        }}>
            {/* --- LEFT: TRACK INFO & COVER ART --- */}
            <div style={{ display: "flex", alignItems: "center", gap: "14px", width: "280px", minWidth: 0 }}>
                <div style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "12px",
                    overflow: "hidden",
                    backgroundColor: "var(--surface-solid)",
                    flexShrink: 0,
                    boxShadow: "0 6px 16px rgba(0,0,0,0.22)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                }}>
                    {albumArt ? (
                        <img src={albumArt} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="24" height="24" style={{ opacity: 0.5 }}>
                            <path d="M9 18V5l12-2v13"></path>
                            <circle cx="6" cy="18" r="3"></circle>
                            <circle cx="18" cy="16" r="3"></circle>
                        </svg>
                    )}
                </div>

                <div style={{ overflow: "hidden", flex: 1 }}>
                    <div style={{
                        fontSize: "0.92rem",
                        fontWeight: "700",
                        color: "var(--text-dark)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                    }}>
                        {currentTrack?.title || "No Track Selected"}
                    </div>
                    <div style={{
                        fontSize: "0.78rem",
                        color: "var(--text-muted)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        marginTop: "2px"
                    }}>
                        {currentTrack?.artist || "Choose a song to start"}
                    </div>
                </div>

                {/* Favorite Heart Button */}
                <button
                    onClick={toggleFavorite}
                    title={isFavorite ? "Remove from Liked" : "Add to Liked"}
                    className="icon-btn"
                    style={{
                        padding: "6px",
                        color: isFavorite ? "var(--primary)" : "var(--text-muted)",
                        transform: isFavorite ? "scale(1.15)" : "scale(1)"
                    }}
                >
                    <svg viewBox="0 0 24 24" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" width="20" height="20">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                </button>
            </div>

            {/* --- CENTER: CONTROLS & WIDE PROPER SEEKBAR --- */}
            <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                flex: 1,
                maxWidth: "640px",
                gap: "6px"
            }}>
                {/* Media Buttons */}
                <div style={{ display: "flex", alignItems: "center", gap: "22px" }}>
                    {/* Shuffle */}
                    <button
                        onClick={() => setShuffle(!shuffle)}
                        title={shuffle ? "Shuffle: On" : "Shuffle: Off"}
                        className="icon-btn"
                        style={{ color: shuffle ? "var(--primary)" : "var(--text-muted)" }}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="16 3 21 3 21 8"></polyline>
                            <line x1="4" y1="20" x2="21" y2="3"></line>
                            <polyline points="21 16 21 21 16 21"></polyline>
                            <line x1="15" y1="15" x2="21" y2="21"></line>
                            <line x1="4" y1="4" x2="9" y2="9"></line>
                        </svg>
                    </button>

                    {/* Previous */}
                    <button
                        onClick={playPrev}
                        title="Previous Track"
                        className="icon-btn"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="20" height="20">
                            <polygon points="19 20 9 12 19 4 19 20"></polygon>
                            <line x1="5" y1="19" x2="5" y2="5"></line>
                        </svg>
                    </button>

                    {/* Big Circular Cyan Play/Pause Button */}
                    <button
                        onClick={togglePause}
                        title={isPlaying ? "Pause" : "Play"}
                        style={{
                            width: "44px",
                            height: "44px",
                            borderRadius: "50%",
                            backgroundColor: "var(--primary)",
                            color: "#0c0f14",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 4px 18px var(--primary-glow)",
                            transition: "transform 0.15s ease"
                        }}
                        onMouseOver={e => e.currentTarget.style.transform = "scale(1.08)"}
                        onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
                    >
                        {isPlaying ? (
                            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                                <rect x="6" y="4" width="4" height="16" rx="1"></rect>
                                <rect x="14" y="4" width="4" height="16" rx="1"></rect>
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" style={{ marginLeft: "2px" }}>
                                <polygon points="6 4 20 12 6 20 6 4"></polygon>
                            </svg>
                        )}
                    </button>

                    {/* Next */}
                    <button
                        onClick={playNext}
                        title="Next Track"
                        className="icon-btn"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="20" height="20">
                            <polygon points="5 4 15 12 5 20 5 4"></polygon>
                            <line x1="19" y1="5" x2="19" y2="19"></line>
                        </svg>
                    </button>

                    {/* Repeat */}
                    <button
                        onClick={() => setRepeat(repeat === "off" ? "all" : repeat === "all" ? "one" : "off")}
                        title={`Repeat: ${repeat}`}
                        className="icon-btn"
                        style={{ color: repeat !== "off" ? "var(--primary)" : "var(--text-muted)" }}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="17 1 21 5 17 9"></polyline>
                            <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                            <polyline points="7 23 3 19 7 15"></polyline>
                            <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                        </svg>
                    </button>
                </div>

                {/* SEEKBAR ROW (PROPER POSITION) */}
                <div style={{ display: "flex", alignItems: "center", width: "100%", gap: "12px" }}>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums", width: "36px", textAlign: "right" }}>
                        {formatTime(currentProgress)}
                    </span>
                    <input
                        type="range"
                        min={0}
                        max={duration || 100}
                        step={0.1}
                        value={currentProgress}
                        onMouseDown={() => setIsScrubbing(true)}
                        onTouchStart={() => setIsScrubbing(true)}
                        onChange={handleSliderChange}
                        onMouseUp={handleSliderCommit}
                        onTouchEnd={handleSliderCommit}
                        className="scrubber-slider"
                        style={{
                            flex: 1,
                            background: `linear-gradient(to right, var(--primary) ${progressPercent}%, var(--slider-track) ${progressPercent}%)`
                        }}
                    />
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums", width: "36px" }}>
                        {formatTime(duration)}
                    </span>
                </div>
            </div>

            {/* --- RIGHT: SLEEP TIMER, VOLUME & EXPLORER --- */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "18px", width: "280px" }}>
                {/* Sleep Timer Button with Popover */}
                <div style={{ position: "relative" }}>
                    <button
                        onClick={() => setShowSleepMenu(!showSleepMenu)}
                        title={sleepTimerRemaining ? `Sleep Timer: ${formatTimer(sleepTimerRemaining)} remaining` : "Set Sleep Timer"}
                        className="icon-btn"
                        style={{
                            padding: "6px 10px",
                            borderRadius: "16px",
                            backgroundColor: sleepTimerRemaining ? "var(--primary-soft)" : "transparent",
                            color: sleepTimerRemaining ? "var(--primary)" : "var(--text-muted)",
                            border: sleepTimerRemaining ? "1px solid var(--border)" : "1px solid transparent",
                            fontSize: "0.75rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px"
                        }}
                    >
                        {/* Crisp Clock / Sleep Timer SVG */}
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        {sleepTimerRemaining && <span>{formatTimer(sleepTimerRemaining)}</span>}
                    </button>

                    {/* Sleep Timer Dropdown Popover */}
                    {showSleepMenu && (
                        <div
                            className="glass-card"
                            style={{
                                position: "absolute",
                                bottom: "46px",
                                right: 0,
                                width: "200px",
                                padding: "12px",
                                borderRadius: "16px",
                                backgroundColor: "var(--surface-solid)",
                                boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
                                display: "flex",
                                flexDirection: "column",
                                gap: "6px",
                                zIndex: 1000,
                                border: "1px solid var(--border)"
                            }}
                        >
                            <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--text-muted)", padding: "2px 4px" }}>
                                Sleep Timer
                            </span>

                            {/* Preset Buttons Grid */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                                {[15, 30, 45, 60].map(mins => (
                                    <button
                                        key={mins}
                                        onClick={() => {
                                            setSleepTimer(mins);
                                            setShowSleepMenu(false);
                                        }}
                                        style={{
                                            padding: "6px 8px",
                                            borderRadius: "8px",
                                            textAlign: "center",
                                            fontSize: "0.8rem",
                                            color: "var(--text-dark)",
                                            backgroundColor: "var(--surface)",
                                            border: "1px solid var(--border)",
                                            cursor: "pointer"
                                        }}
                                        onMouseOver={e => e.currentTarget.style.backgroundColor = "var(--surface-hover)"}
                                        onMouseOut={e => e.currentTarget.style.backgroundColor = "var(--surface)"}
                                    >
                                        {mins}m
                                    </button>
                                ))}
                            </div>

                            {/* Custom Minutes Input */}
                            <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                                <input
                                    type="number"
                                    min="1"
                                    max="720"
                                    placeholder="Custom mins"
                                    value={customMinutes}
                                    onChange={e => setCustomMinutes(e.target.value)}
                                    style={{
                                        flex: 1,
                                        padding: "6px 8px",
                                        borderRadius: "8px",
                                        backgroundColor: "var(--surface)",
                                        color: "var(--text-dark)",
                                        border: "1px solid var(--border)",
                                        fontSize: "0.78rem",
                                        outline: "none"
                                    }}
                                />
                                <button
                                    onClick={() => {
                                        const mins = parseInt(customMinutes);
                                        if (mins > 0) {
                                            setSleepTimer(mins);
                                            setCustomMinutes("");
                                            setShowSleepMenu(false);
                                        }
                                    }}
                                    style={{
                                        padding: "6px 10px",
                                        borderRadius: "8px",
                                        backgroundColor: "var(--primary)",
                                        color: "#0c0f14",
                                        fontWeight: "700",
                                        fontSize: "0.78rem",
                                        cursor: "pointer"
                                    }}
                                >
                                    Set
                                </button>
                            </div>

                            {sleepTimerRemaining && (
                                <button
                                    onClick={() => {
                                        setSleepTimer(null);
                                        setShowSleepMenu(false);
                                    }}
                                    style={{
                                        padding: "6px 8px",
                                        borderRadius: "8px",
                                        textAlign: "center",
                                        fontSize: "0.78rem",
                                        color: "#ef4444",
                                        cursor: "pointer",
                                        borderTop: "1px solid var(--border)",
                                        marginTop: "4px"
                                    }}
                                >
                                    Turn off timer
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Explorer */}
                {handleShowInExplorer && (
                    <button onClick={handleShowInExplorer} title="Show file in explorer" className="icon-btn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                    </button>
                )}

                {/* Volume Slider Group */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button onClick={toggleMute} className="icon-btn" title={volume === 0 ? "Unmute" : "Mute"}>
                        {volume === 0 ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                <line x1="23" y1="9" x2="17" y2="15"></line>
                                <line x1="17" y1="9" x2="23" y2="15"></line>
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
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
                            width: "80px",
                            background: `linear-gradient(to right, var(--primary) ${volume}%, var(--slider-track) ${volume}%)`
                        }}
                    />
                </div>
            </div>
        </footer>
    );
}
