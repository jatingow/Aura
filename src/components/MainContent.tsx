import { Track, theme } from "../types";
import { formatTime } from "../utils";

interface MainContentProps {
    scanPath: string;
    setScanPath: (val: string) => void;
    isScanning: boolean;
    handleScan: () => void;
    tracks: Track[];
    currentTrack: Track | null;
    handlePlayTrack: (track: Track) => void;
}

export default function MainContent({ scanPath, setScanPath, isScanning, handleScan, tracks, currentTrack, handlePlayTrack }: MainContentProps) {
    return (
        <div style={{
            flex: 1, backgroundColor: theme.surface, borderRadius: "24px",
            backdropFilter: "blur(20px)", border: `1px solid ${theme.border}`,
            boxShadow: "0 8px 32px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column",
            padding: "2rem", overflowY: "auto"
        }}>
            {/* Search & Scan */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "2rem" }}>
                <input
                    type="text" value={scanPath} onChange={(e) => setScanPath(e.target.value)}
                    style={{ flexGrow: 1, padding: "12px 20px", backgroundColor: theme.surfaceSolid, color: theme.textDark, border: "none", borderRadius: "30px", outline: "none", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}
                />
                <button onClick={handleScan} disabled={isScanning} style={{ padding: "12px 25px", backgroundColor: theme.primary, color: "#fff", border: "none", borderRadius: "30px", fontWeight: "bold", cursor: "pointer", boxShadow: "0 4px 15px rgba(157, 136, 255, 0.3)" }}>
                    {isScanning ? "..." : "Scan"}
                </button>
            </div>

            <h1 style={{ fontSize: "2rem", margin: "0 0 1.5rem 0" }}>Your Library</h1>

            {/* Basic Track List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {tracks.map((track, index) => (
                    <div key={index} onClick={() => handlePlayTrack(track)}
                        style={{
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            padding: "12px 20px", borderRadius: "12px", cursor: "pointer",
                            backgroundColor: currentTrack?.path === track.path ? theme.surfaceSolid : "transparent",
                            boxShadow: currentTrack?.path === track.path ? "0 4px 15px rgba(0,0,0,0.02)" : "none",
                            border: `1px solid ${currentTrack?.path === track.path ? theme.border : "transparent"}`
                        }}
                    >
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <strong style={{ fontSize: "1rem", color: theme.textDark }}>{track.title}</strong>
                            <span style={{ fontSize: "0.85rem", color: theme.textMuted }}>{track.artist}</span>
                        </div>
                        <span style={{ fontSize: "0.85rem", color: theme.textMuted }}>{formatTime(track.duration)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}