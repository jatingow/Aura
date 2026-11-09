import { useState, useEffect } from "react";
import { Track } from "../types";
import { getAlbumArtCached } from "../utils";

interface AlbumsViewProps {
    tracks: Track[];
    handlePlayTrack: (track: Track) => void;
}

export default function AlbumsView({ tracks, handlePlayTrack }: AlbumsViewProps) {
    const [albumArt, setAlbumArt] = useState<Record<string, string>>({});

    const albumMap = tracks.reduce((acc, t) => {
        const albumName = t.album || "Unknown Album";
        if (!acc[albumName]) {
            acc[albumName] = { tracks: [], artist: t.artist, sampleTrack: t };
        }
        acc[albumName].tracks.push(t);
        return acc;
    }, {} as Record<string, { tracks: Track[]; artist: string; sampleTrack: Track }>);

    const albumList = Object.entries(albumMap);

    useEffect(() => {
        let isMounted = true;
        async function loadArt() {
            const loaded: Record<string, string> = {};
            for (const [name, data] of albumList.slice(0, 30)) {
                if (!albumArt[name]) {
                    const art = await getAlbumArtCached(data.sampleTrack.path);
                    if (art) loaded[name] = art;
                }
            }
            if (isMounted && Object.keys(loaded).length > 0) {
                setAlbumArt(prev => ({ ...prev, ...loaded }));
            }
        }
        if (albumList.length > 0) void loadArt();
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
                    Albums
                </h2>
                <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.85rem" }}>
                    {albumList.length} {albumList.length === 1 ? "album" : "albums"} discovered
                </p>
            </div>

            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: "20px"
            }}>
                {albumList.map(([name, data]) => {
                    const art = albumArt[name];
                    return (
                        <div
                            key={name}
                            onClick={() => handlePlayTrack(data.sampleTrack)}
                            className="glass-card"
                            style={{
                                padding: "12px",
                                cursor: "pointer",
                                borderRadius: "18px"
                            }}
                        >
                            <div style={{
                                width: "100%",
                                aspectRatio: "1 / 1",
                                borderRadius: "14px",
                                overflow: "hidden",
                                backgroundColor: "var(--surface-solid)",
                                marginBottom: "10px",
                                boxShadow: "0 8px 24px rgba(0,0,0,0.18)"
                            }}>
                                {art ? (
                                    <img src={art} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                ) : (
                                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40" style={{ opacity: 0.5 }}>
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <circle cx="12" cy="12" r="3"></circle>
                                        </svg>
                                    </div>
                                )}
                            </div>
                            <strong style={{ display: "block", fontSize: "0.9rem", color: "var(--text-dark)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {name}
                            </strong>
                            <span style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "2px", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {data.artist} · {data.tracks.length} tracks
                            </span>
                        </div>
                    );
                })}
            </div>
        </main>
    );
}
