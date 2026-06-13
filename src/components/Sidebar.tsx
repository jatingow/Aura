import { theme } from "../types";

interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {

    // Helper to style buttons based on whether they are active
    const getTabStyle = (tabName: string) => ({
        padding: "10px 15px",
        borderRadius: "12px",
        cursor: "pointer",
        fontWeight: activeTab === tabName ? "bold" : "500",
        backgroundColor: activeTab === tabName ? theme.surfaceSolid : "transparent",
        color: activeTab === tabName ? theme.primary : theme.textMuted,
        boxShadow: activeTab === tabName ? "0 4px 15px rgba(0,0,0,0.02)" : "none",
        transition: "all 0.2s ease"
    });

    return (
        <div style={{ width: "240px", display: "flex", flexDirection: "column", padding: "1.5rem 1rem", gap: "2.5rem" }}>

            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0, padding: "0 15px", color: theme.textDark }}>
                Aura
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "0.75rem", color: theme.textMuted, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "10px", padding: "0 15px", fontWeight: "600" }}>
                    Menu
                </span>

                <div style={getTabStyle("home")} onClick={() => setActiveTab("home")}>
                    For You
                </div>
                <div style={getTabStyle("library")} onClick={() => setActiveTab("library")}>
                    Library
                </div>
                <div style={getTabStyle("settings")} onClick={() => setActiveTab("settings")}>
                    Settings
                </div>
            </div>

        </div>
    );
}