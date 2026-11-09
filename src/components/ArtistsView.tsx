import { useState, useEffect } from "react";
import { Track } from "../types";
import { getAlbumArtCached } from "../utils";

interface ArtistsViewProps {
    tracks: Track[];
    handlePlayTrack: (track: Track) => void;
}

export default function ArtistsView({ tracks, handlePlayTrack }: ArtistsViewProps) {
    const [avatars, setAvatars] = useState<Record<string, string>>({});

    const artistMap = tracks.reduce((acc, t) => {
        const name = t.artist || "Unknown Artist";
        if (!acc[name]) {
            acc[name] = { count: 0, tracks: [], sampleTrack: t };
        }
        acc[name].count += (t.playCount || 0);
        acc[name].tracks.push(t);
        return acc;
    }, {} as Record<string, { count: number; tracks: Track[]; sampleTrack: Track }>);

    const sortedArtists = Object.entries(artistMap).sort((a, b) => b[1].tracks.length - a[1].tracks.length);

    useEffect(() => {
        let isMounted = true;
        async function loadAvatars() {
            const loaded: Record<string, string> = {};
            for (const [name, data] of sortedArtists.slice(0, 30)) {
                if (!avatars[name]) {
                    const art = await getAlbumArtCached(data.sampleTrack.path);
                    if (art) loaded[name] = art;
                }
            }
            if (isMounted && Object.keys(loaded).length > 0) {
                setAvatars(prev => ({ ...prev, ...loaded }));
            }
        }
        if (sortedArtists.length > 0) void loadAvatars();
        return () => { isMounted = false; };
    }, [tracks]);

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
            <div>
                <h2 style={{ fontSize: "1.8rem", fontWeight: "800", color: "var(--text-dark)", margin: "0 0 4px 0" }}>
                    Artists
                </h2>
                <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.85rem" }}>
                    {sortedArtists.length} {sortedArtists.length === 1 ? "artist" : "artists"} in your library
                </p>
            </div>

            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: "20px"
            }}>
                {sortedArtists.map(([name, data]) => {
                    const art = avatars[name];
                    return (
                        <div
                            key={name}
                            onClick={() => handlePlayTrack(data.sampleTrack)}
                            className="glass-card"
                            style={{
                                padding: "16px",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                textAlign: "center",
                                cursor: "pointer",
                                borderRadius: "18px"
                            }}
                        >
                            <div style={{
                                width: "96px",
                                height: "96px",
                                borderRadius: "50%",
                                overflow: "hidden",
                                backgroundColor: "var(--surface-solid)",
                                marginBottom: "12px",
                                border: "2px solid var(--border)",
                                boxShadow: "0 8px 20px rgba(0,0,0,0.18)"
                            }}>
                                {art ? (
                                    <img src={art} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                ) : (
                                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                            <circle cx="12" cy="7" r="4"></circle>
                                        </svg>
                                    </div>
                                )}
                            </div>
                            <strong style={{ fontSize: "0.92rem", color: "var(--text-dark)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>
                                {name}
                            </strong>
                            <span style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "4px" }}>
                                {data.tracks.length} {data.tracks.length === 1 ? "track" : "tracks"}
                            </span>
                        </div>
                    );
                })}
            </div>
        </main>
    );
}
