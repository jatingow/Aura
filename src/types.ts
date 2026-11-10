export interface Track {
    title: string;
    artist: string;
    album: string;
    path: string;
    duration: number;
    playCount?: number;
    lastPlayed?: number;
}

export interface LyricLine {
    start: number; // in milliseconds (-1 for untimed)
    end: number;   // in milliseconds
    text: string;
}

export type LyricsSource = "embedded" | "sidecar" | "lrclib" | "imported" | "cache";

export interface SongLyrics {
    trackPath: string;
    source: LyricsSource;
    isSynced: boolean;
    rawLrc?: string;
    plainLyrics?: string;
    lines: LyricLine[];
}

export type BaseTheme = "dark" | "amoled" | "light";

export interface AccentColor {
    id: string;
    name: string;
    primary: string;
    hover: string;
    soft: string;
}

export const ACCENT_COLORS: AccentColor[] = [
    { id: "cyan", name: "Cyan", primary: "#00e5cc", hover: "#1bf5dc", soft: "rgba(0, 229, 204, 0.12)" },
    { id: "purple", name: "Neon Purple", primary: "#a855f7", hover: "#b76eff", soft: "rgba(168, 85, 247, 0.12)" },
    { id: "emerald", name: "Emerald", primary: "#10b981", hover: "#34d399", soft: "rgba(16, 185, 129, 0.12)" },
    { id: "rose", name: "Rose Pink", primary: "#f43f5e", hover: "#fb7185", soft: "rgba(244, 63, 94, 0.12)" },
    { id: "blue", name: "Electric Blue", primary: "#3b82f6", hover: "#60a5fa", soft: "rgba(59, 130, 246, 0.12)" },
    { id: "orange", name: "Sunset Orange", primary: "#f97316", hover: "#fb923c", soft: "rgba(249, 115, 22, 0.12)" },
    { id: "gold", name: "Canary Gold", primary: "#eab308", hover: "#facc15", soft: "rgba(234, 179, 8, 0.12)" },
];

export const themePalettes = {
    dark: {
        background: "#0c0f14",
        surface: "rgba(18, 23, 31, 0.85)",
        surfaceSolid: "#151b24",
        surfaceHover: "rgba(255, 255, 255, 0.05)",
        cardBg: "rgba(21, 27, 36, 0.8)",
        sidebar: "#0f131a",
        textDark: "#f1f5f9",
        textMuted: "#8694a6",
        border: "rgba(255, 255, 255, 0.07)",
        sliderTrack: "#242c38",
        scrollbar: "#242c39",
        scrollbarHover: "#394559",
        nowPlayingBg: "rgba(18, 23, 31, 0.95)",
        heroGradient: "linear-gradient(135deg, rgba(25, 33, 44, 0.95) 0%, rgba(15, 20, 27, 0.95) 100%)",
    },
    amoled: {
        background: "#000000",
        surface: "rgba(10, 10, 10, 0.9)",
        surfaceSolid: "#0a0a0a",
        surfaceHover: "rgba(255, 255, 255, 0.06)",
        cardBg: "rgba(14, 14, 16, 0.9)",
        sidebar: "#000000",
        textDark: "#ffffff",
        textMuted: "#888888",
        border: "rgba(255, 255, 255, 0.12)",
        sliderTrack: "#222222",
        scrollbar: "#222222",
        scrollbarHover: "#444444",
        nowPlayingBg: "rgba(5, 5, 5, 0.98)",
        heroGradient: "linear-gradient(135deg, #0e0e11 0%, #000000 100%)",
    },
    light: {
        background: "#f4f6f9",
        surface: "rgba(255, 255, 255, 0.9)",
        surfaceSolid: "#ffffff",
        surfaceHover: "rgba(0, 0, 0, 0.04)",
        cardBg: "rgba(255, 255, 255, 0.95)",
        sidebar: "#f8fafc",
        textDark: "#0f172a",
        textMuted: "#64748b",
        border: "rgba(0, 0, 0, 0.08)",
        sliderTrack: "#e2e8f0",
        scrollbar: "#cbd5e1",
        scrollbarHover: "#94a3b8",
        nowPlayingBg: "rgba(255, 255, 255, 0.96)",
        heroGradient: "linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)",
    }
};

export const theme = {
    background: "var(--bg)",
    surface: "var(--surface)",
    surfaceSolid: "var(--surface-solid)",
    cardBg: "var(--card-bg)",
    sidebar: "var(--sidebar)",
    primary: "var(--primary)",
    textDark: "var(--text-dark)",
    textMuted: "var(--text-muted)",
    border: "var(--border)",
};

export interface UserProfile {
    name: string;
    bio: string;
    avatarColor: string;
    joinedDate: string;
}
