export interface Track {
    title: string;
    artist: string;
    album: string;
    path: string;
    duration: number;
}

export const lightColors = {
    background: "#e2e6efff",
    surface: "rgba(241, 245, 249, 0.65)",
    surfaceSolid: "#f1f5f9",
    primary: "#795cfaff",
    textDark: "#1e293b",
    textMuted: "#64748b",
    border: "rgba(255, 255, 255, 0.4)",
};

// The new deep slate dark mode colors
export const darkColors = {
    background: "#050505",
    surface: "rgba(20, 20, 20, 0.75)",
    surfaceSolid: "#141414",
    primary: "#795cfaff",
    textDark: "#f8fafc",
    textMuted: "#8b949e",
    border: "rgba(255, 255, 255, 0.06)",
};

// All components will magically read from the active CSS variables!
export const theme = {
    background: "var(--bg)",
    surface: "var(--surface)",
    surfaceSolid: "var(--surface-solid)",
    primary: "var(--primary)",
    textDark: "var(--text-dark)",
    textMuted: "var(--text-muted)",
    border: "var(--border)",
};