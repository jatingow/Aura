import { Track, theme } from "../types";

interface PlayerDockProps {
    currentTrack: Track | null;
    albumArt: string | null;
    isPlaying: boolean;
    progress: number;
    togglePause: () => void;
    playNext: () => void;
    playPrev: () => void;
    handleSeek: (e: React.MouseEvent<HTMLDivElement>) => void;
    volume: number;
    handleVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    toggleMute: () => void;
}

export default function PlayerDock({ currentTrack, albumArt, isPlaying, progress, togglePause, playNext, playPrev, handleSeek, volume, handleVolumeChange, toggleMute }: PlayerDockProps) {

    const progressPercent = currentTrack && currentTrack.duration > 0
        ? (progress / currentTrack.duration) * 100
        : 0;

    return (
        <div style={{ padding: "0 1rem 1rem 1rem" }}>

            {/* Custom CSS to hide the bulky HTML range slider thumb */}
            <style>{`
                .slim-slider {
                    -webkit-appearance: none;
                    height: 3px;
                    border-radius: 2px;
                    outline: none;
                    transition: opacity 0.2s;
                }
                .slim-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 0px; 
                    height: 0px;
                }
                .icon-btn {
                    background: none;
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: opacity 0.2s, transform 0.1s;
                }
                .icon-btn:active { transform: scale(0.9); }
            `}</style>

            <div style={{
                position: "relative",
                overflow: "hidden",
                height: "85px",
                backgroundColor: theme.surfaceSolid,
                borderRadius: "24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0 2rem",
                boxShadow: "0 10px 40px rgba(0,0,0,0.05)",
                border: `1px solid ${theme.border}`
            }}>

                {/* --- TOP EDGE PROGRESS BAR --- */}
                <div
                    onClick={handleSeek}
                    style={{ position: "absolute", top: 0, left: 0, right: 0, height: "12px", cursor: "pointer", zIndex: 10, display: "flex", alignItems: "flex-start" }}
                >
                    <div style={{ width: "100%", height: "3px", backgroundColor: "rgba(157, 136, 255, 0.15)", position: "absolute", top: 0 }} />
                    <div style={{ width: `${progressPercent}%`, height: "3px", backgroundColor: theme.primary, position: "absolute", top: 0, transition: "width 0.25s linear" }} />
                </div>


                {/* LEFT: Album Art & Info */}
                <div style={{ display: "flex", alignItems: "center", gap: "15px", flex: 1, minWidth: 0 }}>
                    {currentTrack && (
                        <>
                            {albumArt ? (
                                <img src={albumArt} alt="Art" style={{ width: "50px", height: "50px", borderRadius: "12px", objectFit: "cover" }} />
                            ) : (
                                <div style={{ width: "50px", height: "50px", backgroundColor: theme.background, borderRadius: "12px" }} />
                            )}
                            <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                                <strong style={{ fontSize: "0.95rem", color: theme.textDark, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentTrack.title}</strong>
                                <span style={{ fontSize: "0.8rem", color: theme.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentTrack.artist}</span>
                            </div>
                        </>
                    )}
                </div>

                {/* CENTER: Transport Controls (Outline Style) */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, gap: "30px" }}>

                    {/* Shuffle */}
                    <button className="icon-btn" style={{ color: theme.textMuted }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                            <polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line>
                        </svg>
                    </button>

                    {/* Previous */}
                    <button onClick={playPrev} className="icon-btn" style={{ color: theme.textMuted }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                            <polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="19" x2="5" y2="5"></line>
                        </svg>
                    </button>

                    {/* Play/Pause (Circular Outline) */}
                    <button onClick={togglePause} className="icon-btn" style={{
                        width: "45px", height: "45px", borderRadius: "50%",
                        backgroundColor: theme.primary, color: "#fff", border: "none",
                        boxShadow: "0 4px 15px rgba(157, 136, 255, 0.4)"
                    }}>
                        {isPlaying ? (
                            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                                <rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" style={{ marginLeft: "3px" }}>
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                        )}
                    </button>

                    <button onClick={playNext} className="icon-btn" style={{ color: theme.textMuted }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                            <polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line>
                        </svg>
                    </button>

                    <button className="icon-btn" style={{ color: theme.textMuted }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                            <polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                        </svg>
                    </button>

                    {/* Next */}
                    <button onClick={playNext} className="icon-btn" style={{ color: theme.textMuted }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                            <polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line>
                        </svg>
                    </button>

                    {/* Repeat */}
                    <button className="icon-btn" style={{ color: theme.textMuted }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                            <polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                        </svg>
                    </button>

                </div>

                {/* RIGHT: Volume & Extras */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "20px", flex: 1 }}>

                    {/* Volume Group */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <button onClick={toggleMute} className="icon-btn" style={{ color: theme.textMuted }}>
                            {volume === 0 ? (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line>
                                </svg>
                            ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                                </svg>
                            )}
                        </button>

                        <input
                            type="range" min="0" max="100" value={volume} onChange={handleVolumeChange}
                            className="slim-slider"
                            style={{
                                width: "70px", cursor: "pointer",
                                // This background dynamically fills the slider line with purple vs gray
                                background: `linear-gradient(to right, ${theme.primary} ${volume}%, rgba(0,0,0,0.1) ${volume}%)`
                            }}
                        />
                    </div>

                    {/* Heart */}
                    <button className="icon-btn" style={{ color: theme.textMuted }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                    </button>

                    {/* More (...) */}
                    <button className="icon-btn" style={{ color: theme.textMuted }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                            <circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle>
                        </svg>
                    </button>

                </div>

            </div>
        </div>
    );
}