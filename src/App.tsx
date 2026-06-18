import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { register, unregisterAll } from "@tauri-apps/plugin-global-shortcut";

import { Track, theme, lightColors, darkColors } from "./types";
import Sidebar from "./components/Sidebar";
import Library from "./components/Library";
import MainContent from "./components/MainContent";
import PlayerDock from "./components/PlayerDock";
import Settings from "./components/Settings";

export default function App() {

  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("vibe_active_tab") || "home";
  });

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem("vibe_dark_mode") === "true";
  });

  useEffect(() => { localStorage.setItem("vibe_dark_mode", String(isDarkMode)); }, [isDarkMode]);

  const [tracks, setTracks] = useState<Track[]>(() => {
    const saved = localStorage.getItem("vibe_library");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [];
  });

  const [scanPath, setScanPath] = useState(() => {
    return localStorage.getItem("vibe_scan_path") || "C:\\Users\\Public\\Music";
  });

  // Silently save to localStorage whenever these variables change
  useEffect(() => { localStorage.setItem("vibe_active_tab", activeTab); }, [activeTab]);
  useEffect(() => { localStorage.setItem("vibe_library", JSON.stringify(tracks)); }, [tracks]);
  useEffect(() => { localStorage.setItem("vibe_scan_path", scanPath); }, [scanPath]);
  // ---------------------------------


  const [isScanning, setIsScanning] = useState(false);
  const [albumArt, setAlbumArt] = useState<string | null>(null);

  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const [volume, setVolume] = useState(20);
  const [prevVolume, setPrevVolume] = useState(20);

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

  async function togglePause() {
    if (isPlaying) {
      await invoke("pause_audio");
      setIsPlaying(false);
    } else {
      await invoke("resume_audio");
      setIsPlaying(true);
    }
  }

  // --- GLOBAL & LOCAL SHORTCUTS ---
  const engineRef = useRef({ togglePause, playNext, playPrev });
  useEffect(() => {
    engineRef.current = { togglePause, playNext, playPrev };
  }, [togglePause, playNext, playPrev]);

  useEffect(() => {
    async function setupShortcuts() {
      await unregisterAll();
      try {
        await register("MediaPlayPause", () => engineRef.current.togglePause());
        await register("MediaNextTrack", () => engineRef.current.playNext());
        await register("MediaPreviousTrack", () => engineRef.current.playPrev());
      } catch (error) {
        await register("Alt+Shift+Space", () => engineRef.current.togglePause());
        await register("Alt+Shift+Right", () => engineRef.current.playNext());
        await register("Alt+Shift+Left", () => engineRef.current.playPrev());
      }
    }
    setupShortcuts();
    return () => { unregisterAll().catch(console.error); };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        if (document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
          e.preventDefault();
          engineRef.current.togglePause();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // --- AUDIO PIPELINE RECOVERY ---
  const lastPosRef = useRef(0);
  const stuckCountRef = useRef(0);

  useEffect(() => {
    let interval: number;
    if (isPlaying && currentTrack) {
      interval = window.setInterval(async () => {
        try {
          const pos = await invoke<number>("get_playback_position");
          setProgress(pos);

          if (pos > 0 && pos === lastPosRef.current) {
            stuckCountRef.current += 1;
            if (stuckCountRef.current >= 4) {
              console.log("Audio pipeline frozen. Forcing Rust reboot...");
              stuckCountRef.current = 0;
              await invoke("refresh_audio_device");
              await invoke("play_audio", { path: currentTrack.path });
              await invoke("seek_to", { position: pos });
            }
          } else {
            stuckCountRef.current = 0;
          }
          lastPosRef.current = pos;

          if (currentTrack.duration > 0 && pos >= currentTrack.duration - 0.2) {
            playNext();
          }
        } catch (e) {
          console.error("Failed to fetch position", e);
        }
      }, 250);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentTrack, tracks]);

  // --- CORE AUDIO ACTION ---
  async function handleScan() {
    setIsScanning(true);
    try {
      const result = await invoke<Track[]>("scan_directory", { path: scanPath });
      setTracks(result);
    } catch (error) {
      console.error(error);
    } finally {
      setIsScanning(false);
    }
  }

  async function handlePlayTrack(track: Track) {
    setCurrentTrack(track);
    setIsPlaying(true);
    setAlbumArt(null);
    setProgress(0);

    // --- TRACKING METRICS UPDATE ---
    setTracks(prevTracks =>
      prevTracks.map(t => {
        if (t.path === track.path) {
          return {
            ...t,
            playCount: (t.playCount || 0) + 1,
            lastPlayed: Date.now()
          };
        }
        return t;
      })
    );
    await invoke("play_audio", { path: track.path });

    try {
      const art = await invoke<string | null>("get_album_art", { path: track.path });
      if (art) setAlbumArt(art);
    } catch (e) { }
  }

  async function toggleMute() {
    if (volume > 0) {
      setPrevVolume(volume);
      setVolume(0);
      await invoke("set_volume", { volume: 0 });
    } else {
      const restoreVol = prevVolume === 0 ? 20 : prevVolume;
      setVolume(restoreVol);
      await invoke("set_volume", { volume: restoreVol / 100 });
    }
  }

  async function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newVol = parseInt(e.target.value);
    setVolume(newVol);
    if (newVol > 0) setPrevVolume(newVol);
    await invoke("set_volume", { volume: newVol / 100 });
  }

  async function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    if (!currentTrack) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const targetTime = percent * currentTrack.duration;
    setProgress(targetTime);
    await invoke("seek_to", { position: targetTime });
  }

  const activeColors = isDarkMode ? darkColors : lightColors;

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100vh", width: "100vw", overflow: "hidden",
      backgroundColor: theme.background, color: theme.textDark, fontFamily: "'Inter', sans-serif",
      transition: "background-color 0.3s ease, color 0.3s ease" // Smooth fade when switching themes
    }}>

      {/* --- INJECT THE CSS VARIABLES HERE --- */}
      <style>{`
        :root {
          --bg: ${activeColors.background};
          --surface: ${activeColors.surface};
          --surface-solid: ${activeColors.surfaceSolid};
          --primary: ${activeColors.primary};
          --text-dark: ${activeColors.textDark};
          --text-muted: ${activeColors.textMuted};
          --border: ${activeColors.border};
        }
        body { margin: 0; padding: 0; overflow: hidden; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(157, 136, 255, 0.3); border-radius: 10px; }
      `}</style>

      {/* TOP LAYER: 3-Column Layout */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", padding: "1rem", gap: "1rem" }}>

        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {activeTab === "settings" ? (
          <Settings
            scanPath={scanPath} setScanPath={setScanPath}
            isScanning={isScanning} handleScan={handleScan}
            // Add the new props here:
            isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode}
          />
        ) : activeTab === "library" ? (
          <Library
            tracks={tracks}
            handlePlayTrack={handlePlayTrack}
          />
        ) : (
          <MainContent
            tracks={tracks} currentTrack={currentTrack} currentAlbumArt={albumArt}
            handlePlayTrack={handlePlayTrack}
          />
        )}
      </div>

      <PlayerDock
        currentTrack={currentTrack} albumArt={albumArt}
        isPlaying={isPlaying} progress={progress}
        togglePause={togglePause} playNext={playNext} playPrev={playPrev}
        handleSeek={handleSeek}
        volume={volume}
        handleVolumeChange={handleVolumeChange}
        toggleMute={toggleMute}
      />
    </div>
  );
}