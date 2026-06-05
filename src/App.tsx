import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface Track {
  title: string;
  artist: string;
  album: string;
  path: string;
}

function App() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [scanPath, setScanPath] = useState("C:\\Users\\Public\\Music");
  const [isScanning, setIsScanning] = useState(false);

  // New state for the transport controls
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

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
    await invoke("play_audio", { path: track.path });
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

  async function stopAudio() {
    await invoke("stop_audio");
    setIsPlaying(false);
    setCurrentTrack(null);
  }

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto", paddingBottom: "100px" }}>
      <h1>Vibe Player Engine</h1>

      {/* Search Bar... */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "2rem" }}>
        <input
          type="text"
          value={scanPath}
          onChange={(e) => setScanPath(e.target.value)}
          style={{ flexGrow: 1, padding: "8px" }}
          placeholder="Enter folder path..."
        />
        <button onClick={handleScan} disabled={isScanning} style={{ padding: "8px 16px" }}>
          {isScanning ? "Scanning..." : "Scan Directory"}
        </button>
      </div>

      {/* Track List... */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {tracks.map((track, index) => (
          <div
            key={index}
            onClick={() => handlePlayTrack(track)}
            style={{
              padding: "1rem", border: "1px solid #ccc", borderRadius: "8px",
              cursor: "pointer", transition: "background 0.2s",
              backgroundColor: currentTrack?.path === track.path ? "#e0f7fa" : "transparent"
            }}
          >
            <strong>{track.title}</strong><br />
            <span style={{ color: "#666" }}>{track.artist} • {track.album}</span>
          </div>
        ))}
      </div>

      {/* NEW: Sticky Transport Control Bar */}
      {currentTrack && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          backgroundColor: "#333", color: "white",
          padding: "1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <div>
            <strong style={{ display: "block" }}>{currentTrack.title}</strong>
            <span style={{ fontSize: "0.8rem", color: "#aaa" }}>{currentTrack.artist}</span>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={togglePause} style={{ padding: "8px 16px", cursor: "pointer" }}>
              {isPlaying ? "Pause" : "Play"}
            </button>
            <button onClick={stopAudio} style={{ padding: "8px 16px", cursor: "pointer" }}>
              Stop
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;