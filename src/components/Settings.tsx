import { theme } from "../types";

interface SettingsProps {
    scanPath: string;
    setScanPath: (val: string) => void;
    isScanning: boolean;
    handleScan: () => void;
    isDarkMode: boolean;
    setIsDarkMode: (val: boolean) => void;
}

export default function Settings({ scanPath, setScanPath, isScanning, handleScan, isDarkMode, setIsDarkMode }: SettingsProps) {
    return (
        <div style={{
            flex: 1, backgroundColor: theme.surface, borderRadius: "24px",
            backdropFilter: "blur(20px)", border: `1px solid ${theme.border}`,
            boxShadow: "0 8px 32px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column",
            padding: "2rem", overflowY: "auto"
        }}>
            <h2 style={{ fontSize: "1.8rem", fontWeight: "bold", margin: "0 0 2rem 0", color: theme.textDark }}>
                Settings
            </h2>

            {/* --- APPEARANCE CARD --- */}
            <div style={{
                backgroundColor: theme.surfaceSolid, padding: "1.5rem", borderRadius: "16px",
                boxShadow: "0 4px 15px rgba(0,0,0,0.02)", border: `1px solid ${theme.border}`, marginBottom: "2rem"
            }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.1rem", color: theme.textDark }}>Appearance</h3>
                        <p style={{ margin: 0, color: theme.textMuted, fontSize: "0.9rem" }}>
                            Switch between the light and dark interface themes.
                        </p>
                    </div>

                    {/* Animated Toggle Switch */}
                    <div
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        style={{
                            width: "50px", height: "26px", backgroundColor: isDarkMode ? theme.primary : "#cbd5e1",
                            borderRadius: "26px", position: "relative", cursor: "pointer", transition: "background 0.3s"
                        }}
                    >
                        <div style={{
                            width: "20px", height: "20px", backgroundColor: "#fff", borderRadius: "50%",
                            position: "absolute", top: "3px", left: isDarkMode ? "27px" : "3px",
                            transition: "left 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)", boxShadow: "0 2px 5px rgba(0,0,0,0.2)"
                        }} />
                    </div>
                </div>
            </div>

            {/* --- LIBRARY MANAGEMENT CARD --- */}
            <div style={{
                backgroundColor: theme.surfaceSolid, padding: "1.5rem", borderRadius: "16px",
                boxShadow: "0 4px 15px rgba(0,0,0,0.02)", border: `1px solid ${theme.border}`
            }}>
                <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.1rem", color: theme.textDark }}>Library Management</h3>
                <p style={{ color: theme.textMuted, fontSize: "0.9rem", marginBottom: "1.5rem" }}>
                    Choose the local directory where your music files are stored.
                </p>

                <div style={{ display: "flex", gap: "10px" }}>
                    <input
                        type="text" value={scanPath} onChange={(e) => setScanPath(e.target.value)}
                        placeholder="Enter folder path (e.g., C:\Users\Public\Music)..."
                        style={{ flexGrow: 1, padding: "12px 18px", backgroundColor: "transparent", color: theme.textDark, border: `1px solid ${theme.border}`, borderRadius: "12px", outline: "none" }}
                    />
                    <button
                        onClick={handleScan} disabled={isScanning}
                        style={{ padding: "12px 25px", backgroundColor: theme.primary, color: "#fff", border: "none", borderRadius: "12px", fontSize: "0.95rem", fontWeight: "bold", cursor: "pointer", boxShadow: "0 4px 15px rgba(157, 136, 255, 0.3)" }}
                    >
                        {isScanning ? "Scanning..." : "Sync Library"}
                    </button>
                </div>
            </div>

        </div>
    );
}