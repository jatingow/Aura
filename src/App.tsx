import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { register, unregisterAll } from "@tauri-apps/plugin-global-shortcut";

// Import your new modular files
import { Track, theme } from "./types";
import Sidebar from "./components/Sidebar";
import MainContent from "./components/MainContent";
// import ActivityPanel from "./components/ActivityPanel";
import PlayerDock from "./components/PlayerDock";

export default function App() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [scanPath, setScanPath] = useState("C:\\Users\\Public\\Music");
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

  // --- GLOBAL SHORTCUTS ---
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

  // --- POLLING & AUTO-PLAY ---
  useEffect(() => {
    let interval: number;
    if (isPlaying && currentTrack) {
      interval = window.setInterval(async () => {
        try {
          const pos = await invoke<number>("get_playback_position");
          setProgress(pos);
          if (currentTrack.duration > 0 && pos >= currentTrack.duration - 0.2) playNext();
        } catch (e) { }
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

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100vh", width: "100vw", overflow: "hidden",
      backgroundColor: theme.background, color: theme.textDark, fontFamily: "'Inter', sans-serif"
    }}>
      <style>{`
        body { margin: 0; padding: 0; overflow: hidden; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
      `}</style>

      {/* TOP LAYER: 3-Column Layout */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", padding: "1rem", gap: "1rem" }}>
        <Sidebar />

        <MainContent
          scanPath={scanPath} setScanPath={setScanPath}
          isScanning={isScanning} handleScan={handleScan}
          tracks={tracks} currentTrack={currentTrack} handlePlayTrack={handlePlayTrack}
        />

        {/* <ActivityPanel /> */}
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