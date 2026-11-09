import { useState } from "react";
import { UserProfile, Track } from "../types";

interface ProfileModalProps {
    profile: UserProfile;
    onSaveProfile: (updated: UserProfile) => void;
    onClose: () => void;
    tracks: Track[];
}

const AVATAR_COLORS = ["#00e5cc", "#a855f7", "#3b82f6", "#ec4899", "#f59e0b", "#10b981", "#ef4444"];

export default function ProfileModal({ profile, onSaveProfile, onClose, tracks }: ProfileModalProps) {
    const [name, setName] = useState(profile.name);
    const [bio, setBio] = useState(profile.bio);
    const [avatarColor, setAvatarColor] = useState(profile.avatarColor);

    const totalPlays = tracks.reduce((sum, t) => sum + (t.playCount || 0), 0);
    const totalDurationSecs = tracks.reduce((sum, t) => sum + (t.duration || 0), 0);
    const totalHours = (totalDurationSecs / 3600).toFixed(1);

    const artistCounts = tracks.reduce((acc, t) => {
        const a = t.artist || "Unknown";
        acc[a] = (acc[a] || 0) + (t.playCount || 0);
        return acc;
    }, {} as Record<string, number>);

    const topArtist = Object.entries(artistCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "None";

    const handleSave = () => {
        onSaveProfile({
            ...profile,
            name: name.trim() || "Music Explorer",
            bio: bio.trim(),
            avatarColor
        });
        onClose();
    };

    return (
        <div style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            backgroundColor: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
        }}>
            <div className="glass-panel" style={{
                width: "440px",
                padding: "28px",
                borderRadius: "22px",
                backgroundColor: "var(--surface-solid)",
                boxShadow: "0 16px 40px rgba(0,0,0,0.4)",
                display: "flex",
                flexDirection: "column",
                gap: "20px"
            }}>
                {/* Header with Close */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ fontSize: "1.2rem", fontWeight: "800", color: "var(--text-dark)", margin: 0 }}>
                        User Profile
                    </h3>
                    <button onClick={onClose} className="icon-btn" style={{ padding: "4px" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {/* Avatar & Colors */}
                <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
                    <div style={{
                        width: "64px",
                        height: "64px",
                        borderRadius: "50%",
                        backgroundColor: avatarColor,
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.6rem",
                        fontWeight: "800",
                        boxShadow: "0 4px 14px rgba(0,0,0,0.25)"
                    }}>
                        {name ? name.charAt(0).toUpperCase() : "A"}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: "600" }}>
                            Choose Avatar Accent
                        </span>
                        <div style={{ display: "flex", gap: "8px" }}>
                            {AVATAR_COLORS.map(c => (
                                <div
                                    key={c}
                                    onClick={() => setAvatarColor(c)}
                                    style={{
                                        width: "22px",
                                        height: "22px",
                                        borderRadius: "50%",
                                        backgroundColor: c,
                                        cursor: "pointer",
                                        border: avatarColor === c ? "2px solid #ffffff" : "2px solid transparent",
                                        transform: avatarColor === c ? "scale(1.15)" : "scale(1)",
                                        transition: "all 0.15s ease"
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Edit Form */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div>
                        <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: "600", display: "block", marginBottom: "4px" }}>
                            Display Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "9px 14px",
                                borderRadius: "12px",
                                backgroundColor: "var(--surface)",
                                color: "var(--text-dark)",
                                border: "1px solid var(--border)",
                                fontSize: "0.9rem",
                                outline: "none"
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: "600", display: "block", marginBottom: "4px" }}>
                            Status / Bio
                        </label>
                        <input
                            type="text"
                            value={bio}
                            onChange={e => setBio(e.target.value)}
                            placeholder="Listening to high quality audio..."
                            style={{
                                width: "100%",
                                padding: "9px 14px",
                                borderRadius: "12px",
                                backgroundColor: "var(--surface)",
                                color: "var(--text-dark)",
                                border: "1px solid var(--border)",
                                fontSize: "0.85rem",
                                outline: "none"
                            }}
                        />
                    </div>
                </div>

                {/* Listening Stats */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                    padding: "12px",
                    borderRadius: "14px",
                    backgroundColor: "var(--surface)",
                    border: "1px solid var(--border)"
                }}>
                    <div>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block" }}>Total Listens</span>
                        <strong style={{ fontSize: "1.05rem", color: "var(--text-dark)" }}>{totalPlays}</strong>
                    </div>
                    <div>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block" }}>Library Size</span>
                        <strong style={{ fontSize: "1.05rem", color: "var(--text-dark)" }}>{tracks.length} tracks</strong>
                    </div>
                    <div>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block" }}>Total Hours</span>
                        <strong style={{ fontSize: "1.05rem", color: "var(--text-dark)" }}>{totalHours} hrs</strong>
                    </div>
                    <div>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block" }}>Favorite Artist</span>
                        <strong style={{ fontSize: "0.92rem", color: "var(--text-dark)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>
                            {topArtist}
                        </strong>
                    </div>
                </div>

                {/* Save Button */}
                <button
                    onClick={handleSave}
                    style={{
                        padding: "11px 0",
                        borderRadius: "14px",
                        backgroundColor: "var(--primary)",
                        color: "#0c0f14",
                        fontWeight: "700",
                        fontSize: "0.9rem",
                        cursor: "pointer",
                        transition: "transform 0.15s ease"
                    }}
                    onMouseOver={e => e.currentTarget.style.transform = "scale(1.02)"}
                    onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
                >
                    Save Changes
                </button>
            </div>
        </div>
    );
}
