import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { sourceColorFromImage, themeFromSourceColor, hexFromArgb } from "@material/material-color-utilities";

interface Track {
  title: string;
  artist: string;
  album: string;
  path: string;
  duration: number;
}

interface AppTheme {
  background: string;
  surface: string;
  primary: string;
  onPrimary: string;
  text: string;
}

export default function App() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [scanPath, setScanPath] = useState("C:\\Users\\Public\\Music");
  const [isScanning, setIsScanning] = useState(false);
  const [albumArt, setAlbumArt] = useState<string | null>(null);

  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const [volume, setVolume] = useState(100);
  const [prevVolume, setPrevVolume] = useState(100);

  const [theme, setTheme] = useState<AppTheme>({
    background: "#121212",
    surface: "#1f1f1f",
    primary: "#bb86fc",
    onPrimary: "#000000",
    text: "#ffffff"
  });

  // --- QUEUE LOGIC ---
  function playNext() {
    if (!currentTrack || tracks.length === 0) return;
    const currentIndex = tracks.findIndex(t => t.path === currentTrack.path);
    if (currentIndex < tracks.length - 1) handlePlayTrack(tracks[currentIndex + 1]);
  }

  function playPrev() {
    if (!currentTrack || tracks.length === 0) return;
    const currentIndex = tracks.findIndex(t => t.path === currentTrack.path);
    if (currentIndex > 0) handlePlayTrack(tracks[currentIndex - 1]);
  }

  // --- PROGRESS POLLING & AUTO-PLAY FIX ---
  useEffect(() => {
    let interval: number;
    if (isPlaying && currentTrack) {
      interval = window.setInterval(async () => {
        try {
          const pos = await invoke<number>("get_playback_position");
          setProgress(pos);

          // Auto-Play Next Track when within 1 second of the end
          if (pos >= currentTrack.duration - 1 && currentTrack.duration > 0) {
            playNext();
          }
        } catch (e) {
          console.error("Failed to fetch position", e);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentTrack, tracks]);

  // --- VOLUME & MUTE LOGIC ---
  async function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newVol = parseInt(e.target.value);
    setVolume(newVol);
    if (newVol > 0) setPrevVolume(newVol);
    await invoke("set_volume", { volume: newVol / 100 });
  }

  async function toggleMute() {
    if (volume > 0) {
      setPrevVolume(volume);
      setVolume(0);
      await invoke("set_volume", { volume: 0 });
    } else {
      const restoreVol = prevVolume === 0 ? 100 : prevVolume;
      setVolume(restoreVol);
      await invoke("set_volume", { volume: restoreVol / 100 });
    }
  }

  // --- THEME LOGIC ---
  async function applyDynamicTheme(base64Image: string) {
    const img = new Image();
    img.src = base64Image;
    await new Promise((resolve) => { img.onload = resolve; });

    const sourceColor = await sourceColorFromImage(img);
    const generatedTheme = themeFromSourceColor(sourceColor);

    setTheme({
      background: hexFromArgb(generatedTheme.schemes.dark.background),
      surface: hexFromArgb(generatedTheme.schemes.dark.surfaceVariant),
      primary: hexFromArgb(generatedTheme.schemes.dark.primary),
      onPrimary: hexFromArgb(generatedTheme.schemes.dark.onPrimary),
      text: hexFromArgb(generatedTheme.schemes.dark.onBackground)
    });
  }

  // --- CORE AUDIO LOGIC ---
  async function handleScan() {
    setIsScanning(true);
    try {
      const result = await invoke<Track[]>("scan_directory", { path: scanPath });
      setTracks(result);
    } catch (error) {
      console.error("Failed to scan directory:", error);
    } finally {
      setIsScanning(false);
    }
  }

  async function handlePlayTrack(track: Track) {
    setCurrentTrack(track);
    setIsPlaying(true);
    setAlbumArt(null);
    setProgress(0);
    setTheme({ background: "#121212", surface: "#1f1f1f", primary: "#bb86fc", onPrimary: "#000000", text: "#ffffff" });

    await invoke("play_audio", { path: track.path });

    try {
      const art = await invoke<string | null>("get_album_art", { path: track.path });
      if (art) {
        setAlbumArt(art);
        await applyDynamicTheme(art);
      }
    } catch (error) {
      console.error("Failed to load album art");
    }
  }

  async function togglePause() {
    if (isPlaying) {
      await invoke("pause_audio");
      setIsPlaying(false);
    } else {
      await invoke("resume_audio");
      setIsPlaying(true);
    }
  }

  // --- TIME & SEEK LOGIC ---
  function formatTime(seconds: number) {
    if (!seconds || isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  async function skipForward() { await invoke("seek_by", { offset: 10.0 }); }
  async function skipBackward() { await invoke("seek_by", { offset: -10.0 }); }

  async function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    if (!currentTrack) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const targetTime = percent * currentTrack.duration;
    setProgress(targetTime);
    await invoke("seek_to", { position: targetTime });
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100vh", width: "100vw", overflow: "hidden",
      backgroundColor: theme.background, color: theme.text, fontFamily: "sans-serif", transition: "background-color 0.5s ease"
    }}>

      <style>{`
        body { margin: 0; padding: 0; overflow: hidden; }
        * { box-sizing: border-box; }
        /* Optional: Makes the scrollbar look sleek and dark */
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>

      {/* MAIN LAYOUT: Sidebar + Content Area */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* SIDEBAR */}
        <div style={{
          width: "240px", backgroundColor: "rgba(0,0,0,0.2)", padding: "2rem 1.5rem",
          display: "flex", flexDirection: "column", gap: "20px"
        }}>
          <h2 style={{ margin: "0 0 1rem 0", fontSize: "1.5rem", fontWeight: "bold" }}>Vibe Engine</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", opacity: 0.8 }}>
            <span style={{ padding: "8px 12px", borderRadius: "8px", backgroundColor: theme.surface, cursor: "pointer", fontWeight: "bold" }}>Library</span>
            <span style={{ padding: "8px 12px", borderRadius: "8px", cursor: "pointer" }}>explore</span>
            <span style={{ padding: "8px 12px", borderRadius: "8px", cursor: "pointer" }}>settings</span>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", padding: "2rem", position: "relative" }}>

          {/* Top Bar (Search/Scan) */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "2rem", maxWidth: "600px" }}>
            <input
              type="text"
              value={scanPath}
              onChange={(e) => setScanPath(e.target.value)}
              style={{ flexGrow: 1, padding: "10px 15px", backgroundColor: theme.surface, color: theme.text, border: "none", borderRadius: "20px", outline: "none" }}
              placeholder="Enter folder path..."
            />
            <button onClick={handleScan} disabled={isScanning} style={{ padding: "10px 20px", backgroundColor: theme.primary, color: theme.onPrimary, border: "none", borderRadius: "20px", fontWeight: "bold", cursor: "pointer" }}>
              {isScanning ? "Scanning..." : "Scan Directory"}
            </button>
          </div>

          {/* Hero Banner */}
          <div style={{
            padding: "3rem", borderRadius: "16px", marginBottom: "2rem", flexShrink: 0,
            background: `linear-gradient(135deg, ${theme.surface}, ${theme.background})`,
            boxShadow: "0 4px 20px rgba(0,0,0,0.2)"
          }}>
            <h1 style={{ fontSize: "3rem", margin: 0 }}>All Tracks</h1>
            <p style={{ opacity: 0.7, marginTop: "10px" }}>{tracks.length} songs found in library</p>
          </div>

          {/* FIX #2: THE CSS GRID DATA TABLE */}
          <div style={{ display: "flex", flexDirection: "column", minWidth: "600px" }}>

            {/* Sticky Table Header */}
            <div style={{
              display: "grid", gridTemplateColumns: "40px 2fr 1.5fr 1.5fr 60px", gap: "10px",
              padding: "10px 16px", borderBottom: `1px solid rgba(255,255,255,0.1)`,
              position: "sticky", top: "-2rem", backgroundColor: theme.background, zIndex: 5,
              fontSize: "0.85rem", opacity: 0.7, textTransform: "uppercase", letterSpacing: "1px",
              marginBottom: "10px", paddingTop: "2rem"
            }}>
              <span style={{ textAlign: "center" }}>#</span>
              <span>Title</span>
              <span>Artist</span>
              <span>Album</span>
              <span style={{ textAlign: "right" }}>🕒</span>
            </div>

            {/* Table Rows */}
            {tracks.map((track, index) => (
              <div
                key={index}
                onClick={() => handlePlayTrack(track)}
                style={{
                  display: "grid", gridTemplateColumns: "40px 2fr 1.5fr 1.5fr 60px", gap: "10px", alignItems: "center",
                  padding: "10px 16px", borderRadius: "8px",
                  cursor: "pointer", transition: "background-color 0.2s ease",
                  backgroundColor: currentTrack?.path === track.path ? theme.surface : "transparent"
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = theme.surface}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = currentTrack?.path === track.path ? theme.surface : "transparent"}
              >
                {/* Index / Play Indicator */}
                <span style={{ textAlign: "center", opacity: 0.5, fontSize: "0.9rem" }}>
                  {currentTrack?.path === track.path ? "▶" : index + 1}
                </span>

                {/* Track Metadata (Truncated with Ellipsis) */}
                <strong style={{ fontSize: "1rem", color: currentTrack?.path === track.path ? theme.primary : theme.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {track.title}
                </strong>
                <span style={{ fontSize: "0.9rem", opacity: 0.8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {track.artist}
                </span>
                <span style={{ fontSize: "0.9rem", opacity: 0.6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {track.album}
                </span>
                <span style={{ fontSize: "0.9rem", opacity: 0.5, textAlign: "right" }}>
                  {formatTime(track.duration)}
                </span>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* FIXED BOTTOM PLAYER */}
      <div style={{
        height: "90px", backgroundColor: theme.surface, color: theme.text,
        display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 2rem",
        zIndex: 10
      }}>

        {/* Left: Album Art & Info */}
        <div style={{ display: "flex", alignItems: "center", gap: "15px", width: "30%" }}>
          {currentTrack && (
            <>
              {albumArt ? (
                <img src={albumArt} alt="Album Art" style={{ width: "56px", height: "56px", borderRadius: "6px", objectFit: "cover", boxShadow: "0 4px 8px rgba(0,0,0,0.3)" }} />
              ) : (
                <div style={{ width: "56px", height: "56px", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: "6px" }} />
              )}
              <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                <strong style={{ display: "block", fontSize: "1rem", textOverflow: "ellipsis", overflow: "hidden" }}>{currentTrack.title}</strong>
                <span style={{ fontSize: "0.8rem", opacity: 0.7, textOverflow: "ellipsis", overflow: "hidden" }}>{currentTrack.artist}</span>
              </div>
            </>
          )}
        </div>

        {/* Center: Transport & Progress */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "40%" }}>
          <div style={{ display: "flex", gap: "25px", alignItems: "center", marginBottom: "8px" }}>
            <button onClick={playPrev} style={{ background: "transparent", border: "none", color: theme.text, cursor: "pointer", fontSize: "1.5rem", opacity: 0.9, padding: 0 }}>|◀</button>
            <button onClick={skipBackward} style={{ background: "transparent", border: "none", color: theme.text, cursor: "pointer", fontSize: "1rem", opacity: 0.7, padding: 0 }}>◄◄</button>
            <button onClick={togglePause} style={{
              width: "42px", height: "42px", borderRadius: "50%", border: "none",
              backgroundColor: theme.text, color: theme.background,
              fontSize: "1.2rem", display: "flex", justifyContent: "center", alignItems: "center", cursor: "pointer",
              transition: "transform 0.1s"
            }}>
              {isPlaying ? "⏸" : "▶"}
            </button>
            <button onClick={skipForward} style={{ background: "transparent", border: "none", color: theme.text, cursor: "pointer", fontSize: "1rem", opacity: 0.7, padding: 0 }}>►►</button>
            <button onClick={playNext} style={{ background: "transparent", border: "none", color: theme.text, cursor: "pointer", fontSize: "1.5rem", opacity: 0.9, padding: 0 }}>▶|</button>
          </div>

          {/* Progress Bar Container */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
            <span style={{ fontSize: "0.75rem", opacity: 0.6, width: "35px", textAlign: "right" }}>{currentTrack ? formatTime(progress) : "0:00"}</span>
            <div
              onClick={handleSeek}
              style={{ flex: 1, height: "4px", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: "2px", cursor: "pointer", position: "relative" }}
            >
              <div style={{
                width: currentTrack ? `${(progress / currentTrack.duration) * 100}%` : "0%",
                height: "100%", backgroundColor: theme.primary, borderRadius: "2px", transition: "width 1s linear"
              }} />
            </div>
            <span style={{ fontSize: "0.75rem", opacity: 0.6, width: "35px" }}>{currentTrack ? formatTime(currentTrack.duration) : "0:00"}</span>
          </div>
        </div>

        {/* Right: Volume Controls */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px", width: "30%" }}>
          <button onClick={toggleMute} style={{ background: "transparent", border: "none", color: theme.text, cursor: "pointer", fontSize: "1.2rem", padding: 0, opacity: 0.8 }}>
            {volume === 0 ? "🔇" : volume < 50 ? "🔉" : "🔊"}
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