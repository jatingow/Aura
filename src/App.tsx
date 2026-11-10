import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { register, unregisterAll } from "@tauri-apps/plugin-global-shortcut";

import {
  Track,
  BaseTheme,
  AccentColor,
  ACCENT_COLORS,
  themePalettes,
  UserProfile
} from "./types";
import { getAlbumArtCached } from "./utils";
import TitleBar from "./components/TitleBar";
import Sidebar from "./components/Sidebar";
import Library from "./components/Library";
import MainContent from "./components/MainContent";
import PlayerDock from "./components/PlayerDock";
import Settings from "./components/Settings";
import TopArtistsPanel from "./components/TopArtistsPanel";
import ContextMenu from "./components/ContextMenu";
import GenresView from "./components/GenresView";
import ArtistsView from "./components/ArtistsView";
import AlbumsView from "./components/AlbumsView";
import AnalyticsView from "./components/AnalyticsView";
import ProfileModal from "./components/ProfileModal";
import FullScreenPlayer from "./components/FullScreenPlayer";

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("vibe_active_tab") || "home";
  });

  // Base Theme: dark | amoled | light
  const [baseTheme, setBaseTheme] = useState<BaseTheme>(() => {
    const saved = localStorage.getItem("aura_base_theme") as BaseTheme;
    if (saved === "dark" || saved === "amoled" || saved === "light") return saved;
    const oldDark = localStorage.getItem("vibe_dark_mode");
    return oldDark === "false" ? "light" : "dark";
  });

  // Accent Color (Only accent changes!)
  const [accentColor, setAccentColor] = useState<AccentColor>(() => {
    const savedId = localStorage.getItem("aura_accent_color") || "cyan";
    return ACCENT_COLORS.find(c => c.id === savedId) || ACCENT_COLORS[0];
  });

  // Fade Duration (ms)
  const [fadeDuration, setFadeDuration] = useState<number>(() => {
    const saved = localStorage.getItem("aura_fade_duration");
    return saved ? parseInt(saved) : 280;
  });

  // User Profile
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem("aura_user_profile");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      name: "Alex",
      bio: "Audiophile & Music Explorer",
      avatarColor: "#00e5cc",
      joinedDate: "November 2026"
    };
  });
  const [showProfileModal, setShowProfileModal] = useState(false);

  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem("vibe_favorites");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [];
  });

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

  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [albumArt, setAlbumArt] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(25);
  const [prevVolume, setPrevVolume] = useState(25);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<"off" | "one" | "all">("off");
  const [queue, setQueue] = useState<Track[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Sleep timer state (remaining seconds)
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null);

  // Lyrics panel visibility in right sidebar
  const [showLyrics, setShowLyrics] = useState(false);

  // Full Screen immersive player
  const [isFullScreenPlayer, setIsFullScreenPlayer] = useState(false);

  const [menuState, setMenuState] = useState<{
    visible: boolean;
    x: number;
    y: number;
    track: Track | null;
  }>({ visible: false, x: 0, y: 0, track: null });

  // Persistence
  useEffect(() => { localStorage.setItem("vibe_active_tab", activeTab); }, [activeTab]);
  useEffect(() => { localStorage.setItem("aura_base_theme", baseTheme); }, [baseTheme]);
  useEffect(() => { localStorage.setItem("aura_accent_color", accentColor.id); }, [accentColor.id]);
  useEffect(() => { localStorage.setItem("aura_fade_duration", String(fadeDuration)); }, [fadeDuration]);
  useEffect(() => { localStorage.setItem("aura_user_profile", JSON.stringify(profile)); }, [profile]);
  useEffect(() => { localStorage.setItem("vibe_favorites", JSON.stringify(favorites)); }, [favorites]);
  useEffect(() => { localStorage.setItem("vibe_library", JSON.stringify(tracks)); }, [tracks]);
  useEffect(() => { localStorage.setItem("vibe_scan_path", scanPath); }, [scanPath]);

  function notify(msg: string) {
    setNotification(msg);
    window.setTimeout(() => setNotification(curr => curr === msg ? null : curr), 4000);
  }

  function toggleFavorite(path: string) {
    setFavorites(prev => {
      const isFav = prev.includes(path);
      const updated = isFav ? prev.filter(p => p !== path) : [...prev, path];
      notify(isFav ? "Removed from Liked Songs" : "Added to Liked Songs ♥");
      return updated;
    });
  }

  // --- AUDIO FADE IN / FADE OUT HELPER ---
  const isFadingRef = useRef(false);
  async function fadeAudio(fromVol: number, toVol: number, durationMs: number = 280) {
    if (durationMs <= 0) {
      try {
        await invoke("set_volume", { volume: Math.max(0, Math.min(1, toVol / 100)) });
      } catch (e) {}
      return;
    }
    if (isFadingRef.current) return;
    isFadingRef.current = true;
    const steps = 5;
    const stepTime = durationMs / steps;
    const delta = toVol - fromVol;
    for (let i = 1; i <= steps; i++) {
      const val = fromVol + (delta * (i / steps));
      try {
        await invoke("set_volume", { volume: Math.max(0, Math.min(1, val / 100)) });
      } catch (e) {}
      await new Promise(res => setTimeout(res, stepTime));
    }
    isFadingRef.current = false;
  }

  // Refs for audio engine
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;
  const currentTrackRef = useRef(currentTrack);
  currentTrackRef.current = currentTrack;
  const queueRef = useRef(queue);
  queueRef.current = queue;
  const shuffleRef = useRef(shuffle);
  shuffleRef.current = shuffle;
  const repeatRef = useRef(repeat);
  repeatRef.current = repeat;
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const fadeDurationRef = useRef(fadeDuration);
  fadeDurationRef.current = fadeDuration;

  // --- CORE AUDIO PLAY WITH FADE ---
  async function handlePlayTrack(track: Track) {
    try {
      const targetVol = volumeRef.current;
      const fDuration = fadeDurationRef.current;

      if (isPlayingRef.current && fDuration > 0) {
        await fadeAudio(targetVol, 0, Math.round(fDuration * 0.75));
      }

      await invoke("play_audio", { path: track.path });
      setCurrentTrack(track);
      setIsPlaying(true);
      setProgress(0);

      setAlbumArt(null);
      void getAlbumArtCached(track.path).then(art => {
        if (currentTrackRef.current?.path === track.path) {
          setAlbumArt(art);
        }
      });

      if (fDuration > 0) {
        void fadeAudio(0, targetVol, fDuration);
      } else {
        try { await invoke("set_volume", { volume: targetVol / 100 }); } catch (e) {}
      }

      setTracks(prev => prev.map(t => t.path === track.path
        ? { ...t, playCount: (t.playCount || 0) + 1, lastPlayed: Date.now() }
        : t));
    } catch (error) {
      setIsPlaying(false);
      notify(`Playback error: ${String(error)}`);
    }
  }

  async function togglePause() {
    if (!currentTrack) {
      if (tracks.length > 0) {
        const first = tracks.find(t => t.lastPlayed) || tracks[0];
        await handlePlayTrack(first);
      } else {
        notify("No tracks found. Sync your music folder in Settings.");
      }
      return;
    }

    const currentVol = volumeRef.current;
    const fDuration = fadeDurationRef.current;

    if (isPlaying) {
      if (fDuration > 0) {
        await fadeAudio(currentVol, 0, Math.round(fDuration * 0.75));
      }
      try {
        await invoke("pause_audio");
        setIsPlaying(false);
      } catch (err) {
        notify(`Pause failed: ${String(err)}`);
      }
    } else {
      try {
        if (fDuration > 0) {
          await invoke("set_volume", { volume: 0 });
          await invoke("resume_audio");
          setIsPlaying(true);
          void fadeAudio(0, currentVol, fDuration);
        } else {
          await invoke("set_volume", { volume: currentVol / 100 });
          await invoke("resume_audio");
          setIsPlaying(true);
        }
      } catch (err) {
        notify(`Resume failed: ${String(err)}`);
      }
    }
  }

  function playNext() {
    const allTracks = tracksRef.current;
    if (allTracks.length === 0) return;

    const curr = currentTrackRef.current;
    if (!curr) {
      void handlePlayTrack(allTracks[0]);
      return;
    }

    if (repeatRef.current === "one") {
      void handlePlayTrack(curr);
      return;
    }

    if (queueRef.current.length > 0) {
      const nextTrack = queueRef.current[0];
      setQueue(prev => prev.slice(1));
      void handlePlayTrack(nextTrack);
      return;
    }

    if (shuffleRef.current) {
      const candidates = allTracks.filter(t => t.path !== curr.path);
      if (candidates.length > 0) {
        void handlePlayTrack(candidates[Math.floor(Math.random() * candidates.length)]);
      } else {
        void handlePlayTrack(allTracks[0]);
      }
      return;
    }

    const currentIndex = allTracks.findIndex(t => t.path === curr.path);
    if (currentIndex >= 0 && currentIndex < allTracks.length - 1) {
      void handlePlayTrack(allTracks[currentIndex + 1]);
    } else {
      void handlePlayTrack(allTracks[0]);
    }
  }

  function playPrev() {
    const allTracks = tracksRef.current;
    if (allTracks.length === 0) return;

    const curr = currentTrackRef.current;
    if (!curr) {
      void handlePlayTrack(allTracks[0]);
      return;
    }

    if (progress > 3) {
      void invoke("seek_to", { position: 0 });
      setProgress(0);
      return;
    }

    const currentIndex = allTracks.findIndex(t => t.path === curr.path);
    if (currentIndex > 0) {
      void handlePlayTrack(allTracks[currentIndex - 1]);
    } else {
      void handlePlayTrack(allTracks[allTracks.length - 1]);
    }
  }

  async function handleSeek(targetTime: number) {
    if (!currentTrack) return;
    setProgress(targetTime);
    try {
      await invoke("seek_to", { position: targetTime });
    } catch (err) {
      notify(`Seek failed: ${String(err)}`);
    }
  }

  async function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newVol = parseInt(e.target.value);
    setVolume(newVol);
    if (newVol > 0) setPrevVolume(newVol);
    try {
      await invoke("set_volume", { volume: newVol / 100 });
    } catch (err) {
      notify(`Volume error: ${String(err)}`);
    }
  }

  async function toggleMute() {
    if (volume > 0) {
      setPrevVolume(volume);
      setVolume(0);
      try { await invoke("set_volume", { volume: 0 }); } catch (e) {}
    } else {
      const restored = prevVolume === 0 ? 25 : prevVolume;
      setVolume(restored);
      try { await invoke("set_volume", { volume: restored / 100 }); } catch (e) {}
    }
  }

  // --- SLEEP TIMER ---
  const setSleepTimer = (minutes: number | null) => {
    if (minutes === null) {
      setSleepTimerRemaining(null);
      notify("Sleep timer turned off.");
    } else {
      setSleepTimerRemaining(minutes * 60);
      notify(`Sleep timer set: ${minutes} minutes 🌙`);
    }
  };

  useEffect(() => {
    if (sleepTimerRemaining === null) return;
    const interval = setInterval(async () => {
      setSleepTimerRemaining(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
          void (async () => {
            await fadeAudio(volumeRef.current, 0, 1800);
            try { await invoke("pause_audio"); } catch (e) {}
            setIsPlaying(false);
            notify("Sleep timer finished. Sweet dreams! 🌙");
          })();
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sleepTimerRemaining]);

  async function handleScan() {
    if (!scanPath.trim()) {
      notify("Select a valid music folder first.");
      return;
    }
    setIsScanning(true);
    try {
      const newTracks = await invoke<Track[]>("scan_directory", { path: scanPath });
      setTracks(prevTracks => {
        const prevMap = new Map(prevTracks.map(t => [t.path.toLowerCase(), t]));
        return newTracks.map(t => ({
          ...t,
          ...(prevMap.get(t.path.toLowerCase()) ?? {})
        }));
      });
      notify(`Scanned ${newTracks.length} track${newTracks.length === 1 ? "" : "s"}.`);
    } catch (error) {
      notify(`Library scan error: ${String(error)}`);
    } finally {
      setIsScanning(false);
    }
  }

  // Global & Local Shortcuts + Fullscreen F11
  const engineRef = useRef({ togglePause, playNext, playPrev });
  engineRef.current = { togglePause, playNext, playPrev };

  useEffect(() => {
    async function setupShortcuts() {
      await unregisterAll();
      try {
        await register("MediaPlayPause", () => engineRef.current.togglePause());
        await register("MediaNextTrack", () => engineRef.current.playNext());
        await register("MediaPreviousTrack", () => engineRef.current.playPrev());
      } catch (e) {
        try {
          await register("Alt+Shift+Space", () => engineRef.current.togglePause());
          await register("Alt+Shift+Right", () => engineRef.current.playNext());
          await register("Alt+Shift+Left", () => engineRef.current.playPrev());
        } catch (err) {}
      }
    }
    setupShortcuts();
    return () => { unregisterAll().catch(() => {}); };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F11") {
        e.preventDefault();
        setIsFullScreenPlayer(prev => !prev);
        void invoke("toggle_fullscreen");
        return;
      }
      if (e.code === "Space") {
        const tag = document.activeElement?.tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          e.preventDefault();
          engineRef.current.togglePause();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Playback timer loop
  const endedTrackRef = useRef<string | null>(null);
  useEffect(() => {
    let interval: number;
    if (isPlaying && currentTrack) {
      interval = window.setInterval(async () => {
        try {
          const pos = await invoke<number>("get_playback_position");
          setProgress(pos);

          if (currentTrack.duration > 0 && pos >= currentTrack.duration - 0.4 && endedTrackRef.current !== currentTrack.path) {
            endedTrackRef.current = currentTrack.path;
            playNext();
          }
        } catch (err) {}
      }, 250);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentTrack?.path]);

  const activeBase = themePalettes[baseTheme];
  const isCurrentFavorite = currentTrack ? favorites.includes(currentTrack.path) : false;

  const handleContextMenu = (e: React.MouseEvent, track: Track) => {
    e.preventDefault();
    setMenuState({ visible: true, x: e.clientX, y: e.clientY, track });
  };

  const handleShowInExplorer = async () => {
    if (!currentTrack) return;
    try {
      await invoke("show_in_explorer", { path: currentTrack.path });
    } catch (e) {}
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      width: "100vw",
      overflow: "hidden",
      backgroundColor: "var(--bg)",
      color: "var(--text-dark)",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      {/* Dynamic CSS variables: Base Palette + ONLY Accent Color changes! */}
      <style>{`
        :root {
          --bg: ${activeBase.background};
          --surface: ${activeBase.surface};
          --surface-solid: ${activeBase.surfaceSolid};
          --surface-hover: ${activeBase.surfaceHover};
          --card-bg: ${activeBase.cardBg};
          --sidebar: ${activeBase.sidebar};
          --primary: ${accentColor.primary};
          --primary-hover: ${accentColor.hover};
          --primary-soft: ${accentColor.soft};
          --text-dark: ${activeBase.textDark};
          --text-muted: ${activeBase.textMuted};
          --border: ${activeBase.border};
          --slider-track: ${activeBase.sliderTrack};
          --scrollbar: ${activeBase.scrollbar};
          --scrollbar-hover: ${activeBase.scrollbarHover};
          --now-playing-bg: ${activeBase.nowPlayingBg};
          --heroGradient: ${activeBase.heroGradient};
        }
      `}</style>

      {/* 0. CUSTOM TITLEBAR (Hides ugly default OS titlebar, provides drag & window controls) */}
      <TitleBar />

      {/* TOP REGION: SIDEBAR + MAIN VIEWS */}
      <div style={{
        display: "flex",
        flex: 1,
        overflow: "hidden"
      }}>
        {/* 1. SIDEBAR MENU */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          sleepTimerRemaining={sleepTimerRemaining}
          onOpenSleepTimer={() => setSleepTimer(sleepTimerRemaining ? null : 30)}
          profile={profile}
          onOpenProfile={() => setShowProfileModal(true)}
        />

        {/* 2. MAIN CENTER & RIGHT VIEWS */}
        <div style={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
          padding: "16px 22px",
          gap: "20px"
        }}>
          {activeTab === "settings" ? (
            <Settings
              scanPath={scanPath}
              setScanPath={setScanPath}
              isScanning={isScanning}
              handleScan={handleScan}
              baseTheme={baseTheme}
              setBaseTheme={setBaseTheme}
              accentColor={accentColor}
              setAccentColor={setAccentColor}
              fadeDuration={fadeDuration}
              setFadeDuration={setFadeDuration}
              tracks={tracks}
              notify={notify}
            />
          ) : activeTab === "analytics" ? (
            <AnalyticsView
              tracks={tracks}
              handlePlayTrack={handlePlayTrack}
            />
          ) : activeTab === "genres" ? (
            <GenresView
              tracks={tracks}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              handlePlayTrack={handlePlayTrack}
              togglePause={togglePause}
              toggleFavorite={toggleFavorite}
              favorites={favorites}
            />
          ) : activeTab === "artists" ? (
            <ArtistsView
              tracks={tracks}
              handlePlayTrack={handlePlayTrack}
            />
          ) : activeTab === "albums" ? (
            <AlbumsView
              tracks={tracks}
              handlePlayTrack={handlePlayTrack}
            />
          ) : activeTab === "library" ? (
            <Library
              tracks={tracks}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              handlePlayTrack={handlePlayTrack}
              togglePause={togglePause}
              handleContextMenu={handleContextMenu}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              favorites={favorites}
              toggleFavorite={toggleFavorite}
              filterOnlyFavorites={false}
            />
          ) : activeTab === "favorites" ? (
            <Library
              tracks={tracks}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              handlePlayTrack={handlePlayTrack}
              togglePause={togglePause}
              handleContextMenu={handleContextMenu}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              favorites={favorites}
              toggleFavorite={toggleFavorite}
              filterOnlyFavorites={true}
            />
          ) : (
            <MainContent
              tracks={tracks}
              currentTrack={currentTrack}
              currentAlbumArt={albumArt}
              isPlaying={isPlaying}
              handlePlayTrack={handlePlayTrack}
              togglePause={togglePause}
              handleContextMenu={handleContextMenu}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              favorites={favorites}
              toggleFavorite={toggleFavorite}
              onSyncLibrary={handleScan}
              isScanning={isScanning}
              onOpenSettings={() => setActiveTab("settings")}
            />
          )}

          {/* RIGHT PANEL: NOW PLAYING COVER ART & TRENDING ARTISTS (or LYRICS) */}
          {(activeTab === "home" || showLyrics) && (
            <TopArtistsPanel
              tracks={tracks}
              currentTrack={currentTrack}
              currentAlbumArt={albumArt}
              handlePlayTrack={handlePlayTrack}
              queue={queue}
              removeFromQueue={idx => setQueue(prev => prev.filter((_, i) => i !== idx))}
              showLyrics={showLyrics}
              setShowLyrics={setShowLyrics}
              progress={progress}
              isPlaying={isPlaying}
              handleSeek={handleSeek}
              notify={notify}
              onOpenFullScreen={() => {
                setIsFullScreenPlayer(true);
                void invoke("toggle_fullscreen");
              }}
            />
          )}
        </div>
      </div>

      {/* 3. PROPER BOTTOM PLAYER DOCK WITH FULL-WIDTH SEEKBAR & SLEEP TIMER */}
      <PlayerDock
        currentTrack={currentTrack}
        albumArt={albumArt}
        isPlaying={isPlaying}
        progress={progress}
        togglePause={togglePause}
        playNext={playNext}
        playPrev={playPrev}
        handleSeek={handleSeek}
        volume={volume}
        handleVolumeChange={handleVolumeChange}
        toggleMute={toggleMute}
        shuffle={shuffle}
        setShuffle={setShuffle}
        repeat={repeat}
        setRepeat={setRepeat}
        isFavorite={isCurrentFavorite}
        toggleFavorite={() => currentTrack && toggleFavorite(currentTrack.path)}
        handleShowInExplorer={handleShowInExplorer}
        sleepTimerRemaining={sleepTimerRemaining}
        setSleepTimer={setSleepTimer}
        showLyrics={showLyrics}
        toggleLyrics={() => setShowLyrics(prev => !prev)}
        isFullScreen={isFullScreenPlayer}
        toggleFullScreen={() => {
          setIsFullScreenPlayer(prev => {
            const next = !prev;
            void invoke("toggle_fullscreen");
            return next;
          });
        }}
      />

      {/* 4. FULL SCREEN IMMERSIVE PLAYER (IDENTICAL TO SUNG) */}
      {isFullScreenPlayer && (
        <FullScreenPlayer
          currentTrack={currentTrack}
          albumArt={albumArt}
          isPlaying={isPlaying}
          progress={progress}
          togglePause={togglePause}
          playNext={playNext}
          playPrev={playPrev}
          handleSeek={handleSeek}
          volume={volume}
          handleVolumeChange={handleVolumeChange}
          toggleMute={toggleMute}
          shuffle={shuffle}
          setShuffle={setShuffle}
          repeat={repeat}
          setRepeat={setRepeat}
          isFavorite={isCurrentFavorite}
          toggleFavorite={() => currentTrack && toggleFavorite(currentTrack.path)}
          onClose={() => {
            setIsFullScreenPlayer(false);
            void invoke("toggle_fullscreen");
          }}
          notify={notify}
          queue={queue}
          removeFromQueue={idx => setQueue(prev => prev.filter((_, i) => i !== idx))}
          handlePlayTrack={handlePlayTrack}
        />
      )}

      {/* USER PROFILE MODAL */}
      {showProfileModal && (
        <ProfileModal
          profile={profile}
          onSaveProfile={updated => {
            setProfile(updated);
            notify("Profile updated successfully!");
          }}
          onClose={() => setShowProfileModal(false)}
          tracks={tracks}
        />
      )}

      {/* CONTEXT MENU */}
      {menuState.visible && menuState.track && (
        <ContextMenu
          x={menuState.x}
          y={menuState.y}
          track={menuState.track}
          closeMenu={() => setMenuState(prev => ({ ...prev, visible: false }))}
          handlePlayTrack={handlePlayTrack}
          insertNext={track => setQueue(prev => [track, ...prev])}
          addToQueue={track => setQueue(prev => [...prev, track])}
          isFavorite={favorites.includes(menuState.track.path)}
          toggleFavorite={toggleFavorite}
          onViewLyrics={track => {
            if (currentTrack?.path !== track.path) {
              void handlePlayTrack(track);
            }
            setShowLyrics(true);
          }}
        />
      )}

      {/* TOAST NOTIFICATION */}
      {notification && (
        <div style={{
          position: "fixed",
          bottom: "105px",
          right: "24px",
          zIndex: 10000,
          backgroundColor: "var(--surface-solid)",
          color: "var(--text-dark)",
          padding: "12px 18px",
          borderRadius: "14px",
          border: "1px solid var(--border)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          fontSize: "0.85rem",
          fontWeight: "600"
        }}>
          {notification}
        </div>
      )}
    </div>
  );
}
