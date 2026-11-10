import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { BaseTheme, AccentColor, ACCENT_COLORS, Track } from "../types";
import { isLrclibFallbackEnabled, setLrclibFallbackEnabled, clearLyricsCache, getCachedLyricsCount } from "../lyricsService";

interface SettingsProps {
    scanPath: string;
    setScanPath: (val: string) => void;
    isScanning: boolean;
    handleScan: () => void;
    baseTheme: BaseTheme;
    setBaseTheme: (theme: BaseTheme) => void;
    accentColor: AccentColor;
    setAccentColor: (accent: AccentColor) => void;
    fadeDuration: number;
    setFadeDuration: (ms: number) => void;
    tracks: Track[];
    notify: (msg: string) => void;
}

export default function Settings({
    scanPath,
    setScanPath,
    isScanning,
    handleScan,
    baseTheme,
    setBaseTheme,
    accentColor,
    setAccentColor,
    fadeDuration,
    setFadeDuration,
    tracks,
    notify
}: SettingsProps) {
    async function handleBrowse() {
        try {
            const selectedPath = await open({
                directory: true,
                multiple: false,
                title: "Select Music Folder",
                defaultPath: scanPath
            });

            if (selectedPath && typeof selectedPath === "string") {
                setScanPath(selectedPath);
            }
        } catch (error) {
            console.error("Failed to open dialog:", error);
        }
    }

    const handleRefreshAudio = async () => {
        try {
            await invoke("refresh_audio_device");
            notify("Audio output device refreshed successfully.");
        } catch (err) {
            notify(`Audio refresh error: ${String(err)}`);
        }
    };

    const totalSeconds = tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
    const totalHours = (totalSeconds / 3600).toFixed(1);
    const uniqueArtists = new Set(tracks.map(t => t.artist)).size;
    const uniqueAlbums = new Set(tracks.map(t => t.album)).size;

    const [lrclibEnabled, setLrclibEnabled] = useState(() => isLrclibFallbackEnabled());
    const [cachedCount, setCachedCount] = useState(() => getCachedLyricsCount());

    return (
        <main className="glass-panel" style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            overflowY: "auto",
            padding: "28px 34px",
            borderRadius: "24px",
            gap: "24px"
        }}>
            <div>
                <h2 style={{ fontSize: "1.8rem", fontWeight: "800", color: "var(--text-dark)", margin: "0 0 4px 0" }}>
                    Preferences & Engine
                </h2>
                <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.85rem" }}>
                    Customize interface styling, audio transitions, and your music library.
                </p>
            </div>

            {/* 1. APPEARANCE & ACCENT COLOR CARD */}
            <div className="glass-card" style={{ padding: "22px", borderRadius: "18px", display: "flex", flexDirection: "column", gap: "18px" }}>
                <div>
                    <h3 style={{ margin: "0 0 4px 0", fontSize: "1.05rem", color: "var(--text-dark)" }}>
                        Theme & Color Accent
                    </h3>
                    <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.82rem" }}>
                        Select your base backdrop and your personalized accent color.
                    </p>
                </div>

                {/* Base Themes: Dark, AMOLED, Light */}
                <div>
                    <span style={{ fontSize: "0.78rem", fontWeight: "700", color: "var(--text-muted)", display: "block", marginBottom: "8px" }}>
                        Base Theme
                    </span>
                    <div style={{ display: "flex", gap: "12px" }}>
                        {[
                            { id: "dark", label: "Dark Slate", icon: "🌙" },
                            { id: "amoled", label: "AMOLED Black", icon: "🖤" },
                            { id: "light", label: "Alabaster Light", icon: "☀️" },
                        ].map(t => {
                            const isSelected = baseTheme === t.id;
                            return (
                                <button
                                    key={t.id}
                                    onClick={() => setBaseTheme(t.id as BaseTheme)}
                                    style={{
                                        padding: "10px 18px",
                                        borderRadius: "14px",
                                        backgroundColor: isSelected ? "var(--surface)" : "var(--surface-solid)",
                                        color: isSelected ? "var(--primary)" : "var(--text-dark)",
                                        border: isSelected ? "2px solid var(--primary)" : "1px solid var(--border)",
                                        fontWeight: isSelected ? "700" : "500",
                                        fontSize: "0.85rem",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        cursor: "pointer",
                                        transition: "all 0.18s ease"
                                    }}
                                >
                                    <span>{t.icon}</span>
                                    <span>{t.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Accent Color Chooser */}
                <div>
                    <span style={{ fontSize: "0.78rem", fontWeight: "700", color: "var(--text-muted)", display: "block", marginBottom: "8px" }}>
                        Accent Color (Changes Highlights & Buttons)
                    </span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
                        {ACCENT_COLORS.map(acc => {
                            const isSelected = accentColor.id === acc.id;
                            return (
                                <button
                                    key={acc.id}
                                    onClick={() => setAccentColor(acc)}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        padding: "8px 14px",
                                        borderRadius: "20px",
                                        backgroundColor: "var(--surface-solid)",
                                        border: isSelected ? `2px solid ${acc.primary}` : "1px solid var(--border)",
                                        color: "var(--text-dark)",
                                        fontSize: "0.82rem",
                                        fontWeight: isSelected ? "700" : "500",
                                        cursor: "pointer",
                                        transition: "all 0.15s ease"
                                    }}
                                >
                                    <div style={{
                                        width: "14px",
                                        height: "14px",
                                        borderRadius: "50%",
                                        backgroundColor: acc.primary
                                    }} />
                                    <span>{acc.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* 2. AUDIO ENGINE & FADE DURATION */}
            <div className="glass-card" style={{ padding: "22px", borderRadius: "18px", display: "flex", flexDirection: "column", gap: "18px" }}>
                <div>
                    <h3 style={{ margin: "0 0 4px 0", fontSize: "1.05rem", color: "var(--text-dark)" }}>
                        Audio Engine & Transitions
                    </h3>
                    <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.82rem" }}>
                        Configure crossfades, volume fading, and device connections.
                    </p>
                </div>

                {/* Crossfade Selector */}
                <div>
                    <span style={{ fontSize: "0.78rem", fontWeight: "700", color: "var(--text-muted)", display: "block", marginBottom: "8px" }}>
                        Music Change Fade Duration
                    </span>
                    <div style={{ display: "flex", gap: "10px" }}>
                        {[
                            { label: "Instant (0ms)", value: 0 },
                            { label: "Fast (200ms)", value: 200 },
                            { label: "Smooth (350ms)", value: 350 },
                            { label: "Studio (600ms)", value: 600 },
                        ].map(f => {
                            const isSelected = fadeDuration === f.value;
                            return (
                                <button
                                    key={f.value}
                                    onClick={() => setFadeDuration(f.value)}
                                    style={{
                                        padding: "8px 16px",
                                        borderRadius: "12px",
                                        backgroundColor: isSelected ? "var(--primary)" : "var(--surface-solid)",
                                        color: isSelected ? "#0c0f14" : "var(--text-dark)",
                                        border: isSelected ? "none" : "1px solid var(--border)",
                                        fontWeight: isSelected ? "700" : "500",
                                        fontSize: "0.82rem",
                                        cursor: "pointer"
                                    }}
                                >
                                    {f.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Device Refresh */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "8px", borderTop: "1px solid var(--border)" }}>
                    <div>
                        <span style={{ fontSize: "0.88rem", fontWeight: "600", color: "var(--text-dark)", display: "block" }}>
                            Audio Device Hotplug
                        </span>
                        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                            Plugged in new headphones or Bluetooth speakers? Refresh the driver connection.
                        </span>
                    </div>
                    <button
                        onClick={handleRefreshAudio}
                        style={{
                            padding: "8px 16px",
                            borderRadius: "12px",
                            backgroundColor: "var(--surface-solid)",
                            color: "var(--text-dark)",
                            border: "1px solid var(--border)",
                            fontSize: "0.82rem",
                            fontWeight: "600",
                            cursor: "pointer"
                        }}
                    >
                        Refresh Device
                    </button>
                </div>
            </div>

            {/* 3. LIBRARY MANAGEMENT & STATS */}
            <div className="glass-card" style={{ padding: "22px", borderRadius: "18px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                    <h3 style={{ margin: "0 0 4px 0", fontSize: "1.05rem", color: "var(--text-dark)" }}>
                        Local Music Library
                    </h3>
                    <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.82rem" }}>
                        Manage the folder location of your offline music files.
                    </p>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                    <input
                        type="text"
                        value={scanPath}
                        onChange={(e) => setScanPath(e.target.value)}
                        placeholder="C:\Users\...\Music"
                        style={{
                            flex: 1,
                            padding: "10px 14px",
                            backgroundColor: "var(--surface)",
                            color: "var(--text-dark)",
                            border: "1px solid var(--border)",
                            borderRadius: "12px",
                            fontSize: "0.85rem",
                            outline: "none"
                        }}
                    />
                    <button
                        onClick={handleBrowse}
                        style={{
                            padding: "10px 18px",
                            backgroundColor: "var(--surface-solid)",
                            color: "var(--text-dark)",
                            border: "1px solid var(--border)",
                            borderRadius: "12px",
                            fontSize: "0.85rem",
                            fontWeight: "600",
                            cursor: "pointer"
                        }}
                    >
                        Browse Folder
                    </button>
                    <button
                        onClick={handleScan}
                        disabled={isScanning}
                        style={{
                            padding: "10px 22px",
                            backgroundColor: "var(--primary)",
                            color: "#0c0f14",
                            border: "none",
                            borderRadius: "12px",
                            fontSize: "0.85rem",
                            fontWeight: "700",
                            cursor: "pointer"
                        }}
                    >
                        {isScanning ? "Scanning..." : "Sync Library"}
                    </button>
                </div>

                {/* Library Stats Grid */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: "10px",
                    paddingTop: "12px",
                    borderTop: "1px solid var(--border)"
                }}>
                    <div style={{ padding: "8px", borderRadius: "10px", backgroundColor: "var(--surface)", textAlign: "center" }}>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block" }}>Tracks</span>
                        <strong style={{ fontSize: "1.1rem", color: "var(--text-dark)" }}>{tracks.length}</strong>
                    </div>
                    <div style={{ padding: "8px", borderRadius: "10px", backgroundColor: "var(--surface)", textAlign: "center" }}>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block" }}>Artists</span>
                        <strong style={{ fontSize: "1.1rem", color: "var(--text-dark)" }}>{uniqueArtists}</strong>
                    </div>
                    <div style={{ padding: "8px", borderRadius: "10px", backgroundColor: "var(--surface)", textAlign: "center" }}>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block" }}>Albums</span>
                        <strong style={{ fontSize: "1.1rem", color: "var(--text-dark)" }}>{uniqueAlbums}</strong>
                    </div>
                    <div style={{ padding: "8px", borderRadius: "10px", backgroundColor: "var(--surface)", textAlign: "center" }}>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block" }}>Total Hours</span>
                        <strong style={{ fontSize: "1.1rem", color: "var(--text-dark)" }}>{totalHours} hrs</strong>
                    </div>
                </div>
            </div>

            {/* 4. LYRICS & METADATA CARD */}
            <div className="glass-card" style={{ padding: "22px", borderRadius: "18px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                    <h3 style={{ margin: "0 0 4px 0", fontSize: "1.05rem", color: "var(--text-dark)" }}>
                        Lyrics & Providers
                    </h3>
                    <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.82rem" }}>
                        Aura is offline-first. It prioritizes embedded audio tags and local sidecar .lrc files.
                    </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", borderRadius: "12px", backgroundColor: "var(--surface)" }}>
                    <div>
                        <div style={{ fontSize: "0.88rem", fontWeight: "600", color: "var(--text-dark)" }}>
                            Online LRCLIB Fallback
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
                            Automatically query LRCLIB for synchronized and plain lyrics when local lyrics are absent.
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            const next = !lrclibEnabled;
                            setLrclibEnabled(next);
                            setLrclibFallbackEnabled(next);
                            notify(next ? "LRCLIB fallback enabled" : "LRCLIB fallback disabled (Strict offline)");
                        }}
                        style={{
                            padding: "8px 18px",
                            borderRadius: "10px",
                            border: "none",
                            backgroundColor: lrclibEnabled ? "var(--primary)" : "var(--surface-solid)",
                            color: lrclibEnabled ? "#0c0f14" : "var(--text-muted)",
                            fontWeight: "700",
                            fontSize: "0.82rem",
                            cursor: "pointer",
                            transition: "all 0.2s ease"
                        }}
                    >
                        {lrclibEnabled ? "Enabled" : "Disabled"}
                    </button>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", borderRadius: "12px", backgroundColor: "var(--surface)" }}>
                    <div>
                        <div style={{ fontSize: "0.88rem", fontWeight: "600", color: "var(--text-dark)" }}>
                            Lyrics Cache
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
                            Currently cached offline: <strong style={{ color: "var(--text-dark)" }}>{cachedCount}</strong> songs
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            clearLyricsCache();
                            setCachedCount(0);
                            notify("Lyrics cache cleared successfully.");
                        }}
                        disabled={cachedCount === 0}
                        style={{
                            padding: "8px 16px",
                            borderRadius: "10px",
                            border: "1px solid var(--border)",
                            backgroundColor: "var(--surface-solid)",
                            color: cachedCount === 0 ? "var(--text-muted)" : "#f87171",
                            fontWeight: "600",
                            fontSize: "0.82rem",
                            cursor: cachedCount === 0 ? "default" : "pointer",
                            opacity: cachedCount === 0 ? 0.5 : 1
                        }}
                    >
                        Clear Cache
                    </button>
                </div>
            </div>

            {/* 5. KEYBOARD SHORTCUTS REFERENCE */}
            <div className="glass-card" style={{ padding: "22px", borderRadius: "18px" }}>
                <h3 style={{ margin: "0 0 10px 0", fontSize: "1.05rem", color: "var(--text-dark)" }}>
                    Keyboard Shortcuts
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "0.82rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                        <span style={{ color: "var(--text-muted)" }}>Play / Pause</span>
                        <kbd style={{ padding: "2px 8px", borderRadius: "6px", backgroundColor: "var(--surface)", color: "var(--text-dark)" }}>Space</kbd>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                        <span style={{ color: "var(--text-muted)" }}>Next Track</span>
                        <kbd style={{ padding: "2px 8px", borderRadius: "6px", backgroundColor: "var(--surface)", color: "var(--text-dark)" }}>Alt + Shift + →</kbd>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                        <span style={{ color: "var(--text-muted)" }}>Previous Track</span>
                        <kbd style={{ padding: "2px 8px", borderRadius: "6px", backgroundColor: "var(--surface)", color: "var(--text-dark)" }}>Alt + Shift + ←</kbd>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                        <span style={{ color: "var(--text-muted)" }}>Full Screen Player</span>
                        <kbd style={{ padding: "2px 8px", borderRadius: "6px", backgroundColor: "var(--surface)", color: "var(--text-dark)" }}>F11 / Esc</kbd>
                    </div>
                </div>
            </div>
        </main>
    );
}
