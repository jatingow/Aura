export interface Track {
    title: string;
    artist: string;
    album: string;
    path: string;
    duration: number;
}

// Your existing glassmorphic light colors
export const lightColors = {
    background: "#e2e8f0",
    surface: "rgba(241, 245, 249, 0.65)",
    surfaceSolid: "#f1f5f9",
    primary: "#9d88ff",
    textDark: "#1e293b",
    textMuted: "#64748b",
    border: "rgba(255, 255, 255, 0.4)",
};

// The new deep slate dark mode colors
export const darkColors = {
    background: "#050505", // Almost pure OLED black for maximum contrast
    surface: "rgba(20, 20, 20, 0.75)", // Deep dark glass
    surfaceSolid: "#141414",
    primary: "#a855f7", // Vibrant purple accent for a modern pop
    textDark: "#f8fafc", // Crisp off-white text
    textMuted: "#8b949e", // Elegant muted grey
    border: "rgba(255, 255, 255, 0.06)", // Barely-there border for a premium feel
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