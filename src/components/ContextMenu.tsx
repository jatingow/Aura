import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Track, theme } from "../types";

interface ContextMenuProps {
    x: number;
    y: number;
    track: Track;
    closeMenu: () => void;
    handlePlayTrack: (track: Track) => void;
    insertNext: (track: Track) => void;
    addToQueue: (track: Track) => void;
    isFavorite: boolean;
    toggleFavorite: (path: string) => void;
}

export default function ContextMenu({
    x,
    y,
    track,
    closeMenu,
    handlePlayTrack,
    insertNext,
    addToQueue,
    isFavorite,
    toggleFavorite
}: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                closeMenu();
            }
        };
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") closeMenu();
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, [closeMenu]);

    const handleShowInExplorer = async () => {
        try {
            await invoke("show_in_explorer", { path: track.path });
            closeMenu();
        } catch (error) {
            console.error("Could not open File Explorer:", error);
        }
    };

    const menuItems = [
        { label: "Play Now", action: () => { handlePlayTrack(track); closeMenu(); } },
        { label: "Play Next", action: () => { insertNext(track); closeMenu(); } },
        { label: "Add to Queue", action: () => { addToQueue(track); closeMenu(); } },
        {
            label: isFavorite ? "Remove from Liked" : "Add to Liked",
            action: () => { toggleFavorite(track.path); closeMenu(); }
        },
        { divider: true },
        { label: "Show in File Explorer", action: handleShowInExplorer },
    ];

    const menuX = Math.min(x, window.innerWidth - 220);
    const menuY = Math.min(y, window.innerHeight - 260);

    return (
        <div
            ref={menuRef}
            className="glass-card"
            style={{
                position: "fixed",
                top: menuY,
                left: menuX,
                width: "210px",
                zIndex: 9999,
                backgroundColor: "var(--surface-solid)",
                borderRadius: "14px",
                padding: "6px 0",
                boxShadow: "0 12px 36px rgba(0,0,0,0.3)",
                border: `1px solid ${theme.border}`,
                display: "flex",
                flexDirection: "column",
                fontSize: "0.85rem",
                color: "var(--text-dark)"
            }}
        >
            <div style={{ padding: "8px 14px", borderBottom: `1px solid ${theme.border}`, marginBottom: "4px" }}>
                <div style={{ fontWeight: "700", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {track.title}
                </div>
                <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {track.artist}
                </div>
            </div>

            {menuItems.map((item, idx) => {
                if (item.divider) {
                    return <div key={idx} style={{ height: "1px", backgroundColor: theme.border, margin: "4px 0" }} />;
                }
                return (
                    <div
                        key={idx}
                        onClick={item.action}
                        style={{
                            padding: "8px 14px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            transition: "background 0.15s ease"
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = "var(--surface-hover)"}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                    >
                        {item.label}
                    </div>
                );
            })}
        </div>
    );
}
