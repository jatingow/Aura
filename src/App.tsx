import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { register, unregisterAll } from "@tauri-apps/plugin-global-shortcut";

// Import your new modular files
import { Track, theme } from "./types";
import Sidebar from "./components/Sidebar";
import MainContent from "./components/MainContent";
import Settings from "./components/settings";
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
  const [activeTab, setActiveTab] = useState("home");

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

  // --- LOCAL KEYBOARD SHORTCUTS (Space to Play/Pause) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Check if the key pressed was Space
      if (e.code === "Space") {

        // 2. Make sure the user isn't currently typing in the search/input box
        if (document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {

          e.preventDefault(); // Stop the spacebar from scrolling the page down
          engineRef.current.togglePause();

        }
      }
    };

    // Attach the listener to the whole window
    window.addEventListener("keydown", handleKeyDown);

    // Clean up the listener when the component unmounts
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const stateRef = useRef({ currentTrack, progress, isPlaying });
  // --- PROGRESS POLLING & BULLETPROOF AUTO-RECOVERY ---
  const lastPosRef = useRef(0);
  const stuckCountRef = useRef(0);

  useEffect(() => {
    let interval: number;
    if (isPlaying && currentTrack) {
      interval = window.setInterval(async () => {
        try {
          const pos = await invoke<number>("get_playback_position");
          setProgress(pos);

          // THE HEARTBEAT MONITOR:
          // If the song is playing but the timestamp hasn't moved...
          if (pos > 0 && pos === lastPosRef.current) {
            stuckCountRef.current += 1;

            // If it's been frozen for 1 full second (4 ticks), the stream is dead.
            if (stuckCountRef.current >= 4) {
              console.log("Audio pipeline frozen. Forcing Rust reboot...");
              stuckCountRef.current = 0; // Reset counter

              // Nuke the dead stream and connect to the new default speakers
              await invoke("refresh_audio_device");

              // Force the new stream to pick up exactly where we left off
              await invoke("play_audio", { path: currentTrack.path });
              await invoke("seek_to", { position: pos });
            }
          } else {
            // Timestamp is moving normally, reset the stuck counter
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

  useEffect(() => {
    const handleDeviceChange = async () => {
      console.log("Device change detected. Rebooting audio engine...");

      // Tell Rust to hook into the new headphones/speakers
      await invoke("refresh_audio_device");

      const { currentTrack, progress, isPlaying } = stateRef.current;

      // If a song was playing when the headphones unplugged, seamlessly resume it
      if (isPlaying && currentTrack) {
        await invoke("play_audio", { path: currentTrack.path });
        await invoke("seek_to", { position: progress });
      }
    };
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);

    return () => navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
  }, []);

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
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Conditionally render the MainContent OR Settings based on activeTab */}
        {activeTab === "settings" ? (
          <Settings
            scanPath={scanPath} setScanPath={setScanPath}
            isScanning={isScanning} handleScan={handleScan}
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