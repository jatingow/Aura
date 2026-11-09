import { Track } from "../types";
import { formatTime } from "../utils";

interface AnalyticsViewProps {
    tracks: Track[];
    handlePlayTrack: (track: Track) => void;
}

export default function AnalyticsView({ tracks, handlePlayTrack }: AnalyticsViewProps) {
    const totalPlays = tracks.reduce((acc, t) => acc + (t.playCount || 0), 0);
    const totalDurationSecs = tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
    const totalHours = (totalDurationSecs / 3600).toFixed(1);

    // Ranked songs by play count
    const mostPlayedSongs = [...tracks]
        .filter(t => (t.playCount || 0) > 0)
        .sort((a, b) => (b.playCount || 0) - (a.playCount || 0));

    // Ranked artists by play count
    const artistStats = tracks.reduce((acc, t) => {
        const name = t.artist || "Unknown Artist";
        if (!acc[name]) {
            acc[name] = { plays: 0, tracksCount: 0, sampleTrack: t };
        }
        acc[name].plays += (t.playCount || 0);
        acc[name].tracksCount += 1;
        return acc;
    }, {} as Record<string, { plays: number; tracksCount: number; sampleTrack: Track }>);

    const sortedArtists = Object.entries(artistStats)
        .filter(([_, data]) => data.plays > 0)
        .sort((a, b) => b[1].plays - a[1].plays);

    const topTrack = mostPlayedSongs[0] || null;
    const topArtist = sortedArtists[0] || null;

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
            <div>
                <h2 style={{ fontSize: "1.8rem", fontWeight: "800", color: "var(--text-dark)", margin: "0 0 4px 0" }}>
                    Listening Analytics
                </h2>
                <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.85rem" }}>
                    In-depth statistics, play counts, and your all-time favorite music habits.
                </p>
            </div>

            {/* Overview Stat Cards */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "14px"
            }}>
                <div className="glass-card" style={{ padding: "16px", borderRadius: "16px" }}>
                    <span style={{ fontSize: "0.74rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Total Plays
                    </span>
                    <div style={{ fontSize: "1.8rem", fontWeight: "800", color: "var(--primary)", marginTop: "4px" }}>
                        {totalPlays}
                    </div>
                    <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                        across {tracks.length} tracks
                    </span>
                </div>

                <div className="glass-card" style={{ padding: "16px", borderRadius: "16px" }}>
                    <span style={{ fontSize: "0.74rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Hours Streamed
                    </span>
                    <div style={{ fontSize: "1.8rem", fontWeight: "800", color: "var(--text-dark)", marginTop: "4px" }}>
                        {totalHours}h
                    </div>
                    <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                        total library runtime
                    </span>
                </div>

                <div className="glass-card" style={{ padding: "16px", borderRadius: "16px" }}>
                    <span style={{ fontSize: "0.74rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        #1 Most Played Song
                    </span>
                    <div style={{ fontSize: "1.1rem", fontWeight: "800", color: "var(--text-dark)", marginTop: "6px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {topTrack ? topTrack.title : "None yet"}
                    </div>
                    <span style={{ fontSize: "0.74rem", color: "var(--primary)", fontWeight: "600" }}>
                        {topTrack ? `${topTrack.playCount} plays` : "Start listening"}
                    </span>
                </div>

                <div className="glass-card" style={{ padding: "16px", borderRadius: "16px" }}>
                    <span style={{ fontSize: "0.74rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        #1 Top Artist
                    </span>
                    <div style={{ fontSize: "1.1rem", fontWeight: "800", color: "var(--text-dark)", marginTop: "6px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {topArtist ? topArtist[0] : "None yet"}
                    </div>
                    <span style={{ fontSize: "0.74rem", color: "var(--primary)", fontWeight: "600" }}>
                        {topArtist ? `${topArtist[1].plays} plays` : "Start listening"}
                    </span>
                </div>
            </div>

            {/* Split: Most Played Songs (Left) & Top Artists (Right) */}
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "20px" }}>
                {/* Most Played Songs Table */}
                <div className="glass-card" style={{ padding: "18px", borderRadius: "18px" }}>
                    <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "var(--text-dark)", margin: "0 0 14px 0" }}>
                        Most Played Songs
                    </h3>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {mostPlayedSongs.slice(0, 15).map((track, idx) => (
                            <div
                                key={track.path}
                                onClick={() => handlePlayTrack(track)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    padding: "8px 10px",
                                    borderRadius: "10px",
                                    cursor: "pointer",
                                    transition: "background 0.15s ease"
                                }}
                                onMouseOver={e => e.currentTarget.style.backgroundColor = "var(--surface-hover)"}
                                onMouseOut={e => e.currentTarget.style.backgroundColor = "transparent"}
                            >
                                <span style={{ width: "28px", fontSize: "0.85rem", fontWeight: "700", color: "var(--primary)" }}>
                                    {String(idx + 1).padStart(2, "0")}
                                </span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: "0.86rem", fontWeight: "600", color: "var(--text-dark)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {track.title}
                                    </div>
                                    <div style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                                        {track.artist}
                                    </div>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                    <div style={{ fontSize: "0.86rem", fontWeight: "700", color: "var(--primary)" }}>
                                        {track.playCount} plays
                                    </div>
                                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                                        {formatTime(track.duration)}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {mostPlayedSongs.length === 0 && (
                            <div style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                                Play some music to generate your play count analytics.
                            </div>
                        )}
                    </div>
                </div>

                {/* Top Artists Ranking */}
                <div className="glass-card" style={{ padding: "18px", borderRadius: "18px" }}>
                    <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "var(--text-dark)", margin: "0 0 14px 0" }}>
                        Top Artists
                    </h3>

                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {sortedArtists.slice(0, 10).map(([name, data], idx) => (
                            <div
                                key={name}
                                onClick={() => handlePlayTrack(data.sampleTrack)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: "8px 10px",
                                    borderRadius: "10px",
                                    cursor: "pointer",
                                    transition: "background 0.15s ease"
                                }}
                                onMouseOver={e => e.currentTarget.style.backgroundColor = "var(--surface-hover)"}
                                onMouseOut={e => e.currentTarget.style.backgroundColor = "transparent"}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
                                    <span style={{ width: "24px", fontSize: "0.85rem", fontWeight: "700", color: "var(--primary)" }}>
                                        #{idx + 1}
                                    </span>
                                    <div style={{ overflow: "hidden" }}>
                                        <div style={{ fontSize: "0.86rem", fontWeight: "600", color: "var(--text-dark)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {name}
                                        </div>
                                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                                            {data.tracksCount} {data.tracksCount === 1 ? "track" : "tracks"} in library
                                        </div>
                                    </div>
                                </div>
                                <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text-dark)" }}>
                                    {data.plays} plays
                                </div>
                            </div>
                        ))}

                        {sortedArtists.length === 0 && (
                            <div style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                                Play counts will calculate your top artists automatically.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
