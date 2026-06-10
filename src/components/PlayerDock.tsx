import { Track, theme } from "../types";
import { formatTime } from "../utils";

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

    // Calculate percentage for the progress bar
    const progressPercent = currentTrack && currentTrack.duration > 0
        ? (progress / currentTrack.duration) * 100
        : 0;

    return (
        <div style={{ padding: "0 1rem 1rem 1rem" }}>
            <div style={{
                position: "relative", // Required to pin the progress bar to the top
                overflow: "hidden",   // Forces the progress bar to clip to the rounded corners
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

                {/* --- 1. FULL-WIDTH TOP PROGRESS BAR --- */}
                {/* Invisible thicker area so it's easy to click/drag with the mouse */}
                <div
                    onClick={handleSeek}
                    style={{
                        position: "absolute", top: 0, left: 0, right: 0, height: "12px",
                        cursor: "pointer", zIndex: 10, display: "flex", alignItems: "flex-start"
                    }}
                >
                    {/* Faded Background Line */}
                    <div style={{ width: "100%", height: "3px", backgroundColor: "rgba(157, 136, 255, 0.15)", position: "absolute", top: 0 }} />

                    {/* Active Purple Line */}
                    <div style={{ width: `${progressPercent}%`, height: "3px", backgroundColor: theme.primary, position: "absolute", top: 0, transition: "width 0.25s linear" }} />
                </div>
                {/* -------------------------------------- */}


                {/* Left: Album Art & Info */}
                <div style={{ display: "flex", alignItems: "center", gap: "15px", width: "30%" }}>
                    {currentTrack && (
                        <>
                            {albumArt ? (
                                <img src={albumArt} alt="Art" style={{ width: "50px", height: "50px", borderRadius: "12px", objectFit: "cover" }} />
                            ) : (
                                <div style={{ width: "50px", height: "50px", backgroundColor: theme.background, borderRadius: "12px" }} />
                            )}
                            <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                <strong style={{ display: "block", fontSize: "0.95rem", color: theme.textDark }}>{currentTrack.title}</strong>
                                <span style={{ fontSize: "0.8rem", color: theme.textMuted }}>{currentTrack.artist}</span>
                            </div>
                        </>
                    )}
                </div>

                {/* Center: Controls & Timestamps */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "40%", gap: "25px" }}>

                    {/* Current Time */}
                    <span style={{ fontSize: "0.75rem", color: theme.textMuted, width: "35px", textAlign: "right", fontWeight: "500", opacity: 0.8 }}>
                        {currentTrack ? formatTime(progress) : "0:00"}
                    </span>

                    <button onClick={playPrev} style={{ background: "none", border: "none", cursor: "pointer", color: theme.textMuted }}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg>
                    </button>

                    <button onClick={togglePause} style={{
                        width: "45px", height: "45px", borderRadius: "50%", border: "none", backgroundColor: theme.primary, color: "#fff",
                        display: "flex", justifyContent: "center", alignItems: "center", cursor: "pointer", boxShadow: "0 4px 15px rgba(157, 136, 255, 0.4)"
                    }}>
                        {isPlaying ? (
                            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                        ) : (
                            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24" style={{ marginLeft: "2px" }}><path d="M8 5v14l11-7z" /></svg>
                        )}
                    </button>

                    <button onClick={playNext} style={{ background: "none", border: "none", cursor: "pointer", color: theme.textMuted }}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M8 18l8.5-6L8 6v12zM16 6v12h2V6h-2z" /></svg>
                    </button>

                    {/* Total Time */}
                    <span style={{ fontSize: "0.75rem", color: theme.textMuted, width: "35px", fontWeight: "500", opacity: 0.8 }}>
                        {currentTrack ? formatTime(currentTrack.duration) : "0:00"}
                    </span>

                </div>

                {/* Right: Volume Controls */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px", width: "30%" }}>
                    <button onClick={toggleMute} style={{ background: "transparent", border: "none", color: theme.textMuted, cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}>
                        {volume === 0 ? (
                            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" /></svg>
                        ) : volume < 50 ? (
                            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" /></svg>
                        ) : (
                            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" /></svg>
                        )}
                    </button>

                    <input
                        type="range" min="0" max="100" value={volume} onChange={handleVolumeChange}
                        style={{ width: "90px", cursor: "pointer", accentColor: theme.primary }}
                    />
                </div>

            </div>
        </div>
    );
}