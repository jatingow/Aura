import { useState } from "react";
import { Track } from "../types";
import { formatTime } from "../utils";

interface GenresViewProps {
    tracks: Track[];
    currentTrack: Track | null;
    isPlaying: boolean;
    handlePlayTrack: (track: Track) => void;
    togglePause: () => void;
    toggleFavorite: (path: string) => void;
    favorites: string[];
}

const DEFAULT_GENRES = [
    {
        name: "Hip hop",
        color: "linear-gradient(135deg, #f97316, #ea580c)",
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
        )
    },
    {
        name: "Pop",
        color: "linear-gradient(135deg, #ec4899, #d946ef)",
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
        )
    },
    {
        name: "Rock",
        color: "linear-gradient(135deg, #ef4444, #b91c1c)",
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
                <path d="M9 18V5l12-2v13"></path>
                <circle cx="6" cy="18" r="3"></circle>
                <circle cx="18" cy="16" r="3"></circle>
            </svg>
        )
    },
    {
        name: "Electronic",
        color: "linear-gradient(135deg, #06b6d4, #00e5cc)",
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
        )
    },
    {
        name: "Jazz",
        color: "linear-gradient(135deg, #f59e0b, #d97706)",
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
                <circle cx="12" cy="12" r="10"></circle>
                <circle cx="12" cy="12" r="3"></circle>
            </svg>
        )
    },
    {
        name: "Classical",
        color: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
        )
    },
    {
        name: "Metal",
        color: "linear-gradient(135deg, #64748b, #334155)",
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
        )
    },
    {
        name: "Country",
        color: "linear-gradient(135deg, #84cc16, #4d7c0f)",
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            </svg>
        )
    },
    {
        name: "House",
        color: "linear-gradient(135deg, #10b981, #059669)",
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
                <path d="M3 18v-6a9 9 0 0 1 18 0v6"></path>
                <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path>
            </svg>
        )
    },
    {
        name: "Blues",
        color: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
        )
    }
];

export default function GenresView({
    tracks,
    currentTrack,
    isPlaying,
    handlePlayTrack,
    togglePause,
    toggleFavorite,
    favorites
}: GenresViewProps) {
    const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

    // Filter tracks for selected genre
    const genreTracks = selectedGenre
        ? tracks.filter(t => `${t.title} ${t.artist} ${t.album}`.toLowerCase().includes(selectedGenre.toLowerCase()))
        : [];

    return (
        <main className="glass-panel" style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            overflowY: "auto",
            padding: "26px 30px",
            borderRadius: "24px",
            gap: "24px"
        }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h2 style={{ fontSize: "1.8rem", fontWeight: "800", color: "var(--text-dark)", margin: "0 0 4px 0" }}>
                        Genres & Moods
                    </h2>
                    <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        Explore your collection through genres, beats, and atmospheres.
                    </p>
                </div>
                {selectedGenre && (
                    <button
                        onClick={() => setSelectedGenre(null)}
                        style={{
                            padding: "8px 16px",
                            borderRadius: "14px",
                            backgroundColor: "var(--surface-solid)",
                            color: "var(--text-dark)",
                            border: "1px solid var(--border)",
                            fontSize: "0.82rem",
                            fontWeight: "600"
                        }}
                    >
                        ← Back to all genres
                    </button>
                )}
            </div>

            {/* Genre Cards Grid */}
            {!selectedGenre ? (
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                    gap: "18px"
                }}>
                    {DEFAULT_GENRES.map(genre => {
                        const count = tracks.filter(t => `${t.title} ${t.artist} ${t.album}`.toLowerCase().includes(genre.name.toLowerCase())).length;

                        return (
                            <div
                                key={genre.name}
                                onClick={() => setSelectedGenre(genre.name)}
                                className="glass-card"
                                style={{
                                    height: "120px",
                                    borderRadius: "18px",
                                    padding: "18px",
                                    cursor: "pointer",
                                    position: "relative",
                                    overflow: "hidden",
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "space-between",
                                    background: genre.color,
                                    border: "none",
                                    boxShadow: "0 6px 20px rgba(0,0,0,0.15)"
                                }}
                            >
                                <span style={{ fontSize: "1.8rem", alignSelf: "flex-end" }}>{genre.icon}</span>
                                <div>
                                    <h3 style={{ fontSize: "1.2rem", fontWeight: "800", color: "#ffffff", margin: "0 0 2px 0" }}>
                                        {genre.name}
                                    </h3>
                                    <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.85)", fontWeight: "600" }}>
                                        {count > 0 ? `${count} tracks` : "Tap to explore"}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* Selected Genre Songs List */
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                        <h3 style={{ fontSize: "1.2rem", fontWeight: "700", color: "var(--text-dark)", margin: 0 }}>
                            {selectedGenre} Tracks ({genreTracks.length})
                        </h3>
                    </div>

                    {genreTracks.map((track, idx) => {
                        const isCurrent = currentTrack?.path === track.path;
                        const isFav = favorites.includes(track.path);

                        return (
                            <div
                                key={track.path}
                                className={`track-row ${isCurrent ? "is-active" : ""}`}
                                onClick={() => handlePlayTrack(track)}
                            >
                                <span style={{ width: "30px", fontSize: "0.85rem", color: isCurrent ? "var(--primary)" : "var(--text-muted)", fontWeight: "600" }}>
                                    {String(idx + 1).padStart(2, "0")}
                                </span>

                                <div style={{ flex: 1.5, minWidth: 0 }}>
                                    <div style={{ fontSize: "0.88rem", fontWeight: "600", color: isCurrent ? "var(--primary)" : "var(--text-dark)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {track.title}
                                    </div>
                                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {track.artist}
                                    </div>
                                </div>

                                <div style={{ flex: 1, fontSize: "0.8rem", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {track.album || "—"}
                                </div>

                                <div style={{ width: "65px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                                    {formatTime(track.duration)}
                                </div>

                                <button
                                    onClick={e => {
                                        e.stopPropagation();
                                        toggleFavorite(track.path);
                                    }}
                                    className="icon-btn"
                                    style={{ padding: "6px", color: isFav ? "var(--primary)" : "var(--text-muted)", marginRight: "8px" }}
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
                                        width: "30px",
                                        height: "30px",
                                        borderRadius: "50%",
                                        backgroundColor: isCurrent ? "var(--primary)" : "var(--surface-solid)",
                                        color: isCurrent ? "#0c0f14" : "var(--text-dark)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        border: "1px solid var(--border)"
                                    }}
                                >
                                    {isCurrent && isPlaying ? "⏸" : "▶"}
                                </button>
                            </div>
                        );
                    })}

                    {genreTracks.length === 0 && (
                        <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                            No tracks tagged with "{selectedGenre}" found in your current library.
                        </div>
                    )}
                </div>
            )}
        </main>
    );
}
