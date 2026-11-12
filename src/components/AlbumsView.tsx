import { useState, useEffect } from "react";
import { Track } from "../types";
import { getAlbumArtCached, getAlbumArtSynchronous } from "../utils";
import Artwork from "./Artwork";

interface AlbumsViewProps {
    tracks: Track[];
    handlePlayTrack: (track: Track) => void;
}

export default function AlbumsView({ tracks, handlePlayTrack }: AlbumsViewProps) {
    const [albumArt, setAlbumArt] = useState<Record<string, string>>({});

    // Group tracks by Artist + Album so identical album titles by different artists remain distinct
    const albumMap = tracks.reduce((acc, t) => {
        const artistName = t.artist || "Unknown Artist";
        const albumName = t.album || "Unknown Album";
        const key = `${artistName} - ${albumName}`.toLowerCase();
        if (!acc[key]) {
            acc[key] = {
                albumTitle: albumName,
                artist: artistName,
                tracks: [],
                sampleTrack: t
            };
        }
        acc[key].tracks.push(t);
        return acc;
    }, {} as Record<string, { albumTitle: string; artist: string; tracks: Track[]; sampleTrack: Track }>);

    const albumList = Object.entries(albumMap);

    useEffect(() => {
        let isMounted = true;
        async function loadArt() {
            const loaded: Record<string, string> = {};
            const fetchPromises: Promise<void>[] = [];

            for (const [key, data] of albumList.slice(0, 40)) {
                if (!albumArt[key]) {
                    const syncHit = getAlbumArtSynchronous(data.sampleTrack.path);
                    if (syncHit !== undefined) {
                        if (syncHit) loaded[key] = syncHit;
                    } else {
                        fetchPromises.push(
                            getAlbumArtCached(data.sampleTrack.path).then(art => {
                                if (art && isMounted) {
                                    setAlbumArt(prev => ({ ...prev, [key]: art }));
                                }
                            })
                        );
                    }
                }
            }

            if (isMounted && Object.keys(loaded).length > 0) {
                setAlbumArt(prev => ({ ...prev, ...loaded }));
            }

            if (fetchPromises.length > 0) {
                await Promise.all(fetchPromises);
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
                {albumList.map(([key, data]) => {
                    const art = albumArt[key];
                    return (
                        <div
                            key={key}
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
                                <Artwork
                                    src={art || null}
                                    alt={data.albumTitle}
                                    width="100%"
                                    height="100%"
                                    borderRadius={14}
                                    iconSize={40}
                                />
                            </div>
                            <strong style={{ display: "block", fontSize: "0.9rem", color: "var(--text-dark)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {data.albumTitle}
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
