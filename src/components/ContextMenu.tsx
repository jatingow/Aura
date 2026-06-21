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
}

export default function ContextMenu({ x, y, track, closeMenu, handlePlayTrack, insertNext, addToQueue }: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                closeMenu();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [closeMenu]);

    const handleShowInExplorer = async () => {
        await invoke("show_in_explorer", { path: track.path });
        closeMenu();
    };

    const menuItems = [
        { label: "Play", action: () => { handlePlayTrack(track); closeMenu(); } },
        { label: "Play next", action: () => { insertNext(track); closeMenu(); } },
        { label: "Add to queue", action: () => { addToQueue(track); closeMenu(); } },
        { label: "Add to favorites", action: () => { console.log("Fav", track); closeMenu(); } },
        { label: "Add to playlist(s)", action: () => { console.log("Playlist", track); closeMenu(); } },
        { label: "Select", action: () => { console.log("Select", track); closeMenu(); } },
        { divider: true },
        { label: "Show in File Explorer", action: handleShowInExplorer },
        { label: "Info", action: () => { console.log("Info", track); closeMenu(); } },
        { label: "Go to album", action: () => { console.log("Go to album", track); closeMenu(); } },
        { label: "Edit song tags", action: () => { console.log("Edit tags", track); closeMenu(); } },
        { label: "Re-parse song", action: () => { console.log("Re-parse", track); closeMenu(); } },
    ];

    // Keep the menu from going off the screen
    const menuX = x + 250 > window.innerWidth ? window.innerWidth - 250 : x;
    const menuY = y + 400 > window.innerHeight ? window.innerHeight - 400 : y;

    return (
        <div
            ref={menuRef}
            style={{
                position: "fixed", top: menuY, left: menuX, width: "220px", zIndex: 9999,
                backgroundColor: theme.surfaceSolid, borderRadius: "12px", padding: "8px 0",
                boxShadow: "0 10px 40px rgba(0,0,0,0.2)", border: `1px solid ${theme.border}`,
                display: "flex", flexDirection: "column", fontSize: "0.85rem", color: theme.textDark
            }}
        >
            {/* Mini Header with Track Info
            <div style={{ display: "flex", alignItems: "center", padding: "8px 16px", marginBottom: "8px", borderBottom: `1px solid ${theme.border}` }}>
                <div style={{ flex: 1, overflow: "hidden" }}>
                    <strong style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.title}</strong>
                    <span style={{ fontSize: "0.75rem", color: theme.textMuted }}>{track.artist}</span>
                </div>
            </div> */}

            {/* Menu Options */}
            {menuItems.map((item, idx) => {
                if (item.divider) {
                    return <div key={idx} style={{ height: "1px", backgroundColor: theme.border, margin: "4px 0" }} />;
                }
                return (
                    <div
                        key={idx}
                        onClick={item.action}
                        style={{
                            padding: "8px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px",
                            transition: "background 0.2s"
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = "rgba(157, 136, 255, 0.1)"}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                    >
                        {item.label}
                    </div>
                );
            })}
        </div>
    );
}