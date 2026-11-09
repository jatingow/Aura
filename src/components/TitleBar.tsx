import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export default function TitleBar() {
    const [isFullscreen, setIsFullscreen] = useState(false);

    const handleMinimize = async () => {
        try { await invoke("minimize_window"); } catch (e) {}
    };

    const handleMaximize = async () => {
        try { await invoke("maximize_window"); } catch (e) {}
    };

    const handleClose = async () => {
        try { await invoke("close_window"); } catch (e) {}
    };

    const handleToggleFullscreen = async () => {
        try {
            const fs = await invoke<boolean>("toggle_fullscreen");
            setIsFullscreen(fs);
        } catch (e) {}
    };

    return (
        <header
            data-tauri-drag-region
            style={{
                height: "32px",
                backgroundColor: "var(--bg)",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 10px 0 16px",
                userSelect: "none",
                zIndex: 99999
            }}
        >
            {/* Left brand indicator */}
            <div data-tauri-drag-region style={{ display: "flex", alignItems: "center", gap: "8px", pointerEvents: "none" }}>
                <div style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    backgroundColor: "var(--primary)"
                }} />
                <span style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--text-muted)", letterSpacing: "1px", textTransform: "uppercase" }}>
                    Aura
                </span>
            </div>

            {/* Draggable center area */}
            <div data-tauri-drag-region style={{ flex: 1, height: "100%" }} />

            {/* Right window control buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                {/* Fullscreen Toggle */}
                <button
                    onClick={handleToggleFullscreen}
                    title={isFullscreen ? "Exit Fullscreen (F11)" : "Enter Fullscreen (F11)"}
                    className="icon-btn"
                    style={{ width: "28px", height: "24px", borderRadius: "4px" }}
                >
                    {isFullscreen ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                            <polyline points="4 14 10 14 10 20"></polyline>
                            <polyline points="20 10 14 10 14 4"></polyline>
                            <line x1="14" y1="10" x2="21" y2="3"></line>
                            <line x1="3" y1="21" x2="10" y2="14"></line>
                        </svg>
                    ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <polyline points="9 21 3 21 3 15"></polyline>
                            <line x1="21" y1="3" x2="14" y2="10"></line>
                            <line x1="3" y1="21" x2="10" y2="14"></line>
                        </svg>
                    )}
                </button>

                {/* Minimize */}
                <button
                    onClick={handleMinimize}
                    title="Minimize"
                    className="icon-btn"
                    style={{ width: "28px", height: "24px", borderRadius: "4px" }}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                </button>

                {/* Maximize */}
                <button
                    onClick={handleMaximize}
                    title="Maximize / Restore"
                    className="icon-btn"
                    style={{ width: "28px", height: "24px", borderRadius: "4px" }}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11">
                        <rect x="3" y="3" width="18" height="18" rx="2"></rect>
                    </svg>
                </button>

                {/* Close */}
                <button
                    onClick={handleClose}
                    title="Close"
                    className="icon-btn"
                    style={{
                        width: "28px",
                        height: "24px",
                        borderRadius: "4px",
                        color: "var(--text-muted)"
                    }}
                    onMouseOver={e => {
                        e.currentTarget.style.backgroundColor = "#ef4444";
                        e.currentTarget.style.color = "#ffffff";
                    }}
                    onMouseOut={e => {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.color = "var(--text-muted)";
                    }}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        </header>
    );
}
