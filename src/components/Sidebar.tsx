import { theme } from "../types";

export default function Sidebar() {
    return (
        <div style={{ width: "240px", display: "flex", flexDirection: "column", padding: "1rem", gap: "2rem" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: "bold", margin: 0 }}>Vibe</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ padding: "10px 15px", backgroundColor: theme.surfaceSolid, borderRadius: "12px", color: theme.primary, fontWeight: "bold", boxShadow: "0 4px 15px rgba(0,0,0,0.02)" }}>For You</div>
                <div style={{ padding: "10px 15px", color: theme.textMuted, cursor: "pointer", fontWeight: "500" }}>Library</div>
            </div>
        </div>
    );
}