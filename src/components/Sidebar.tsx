import { theme, UserProfile } from "../types";

interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    sleepTimerRemaining: number | null;
    onOpenSleepTimer: () => void;
    profile: UserProfile;
    onOpenProfile: () => void;
}

export default function Sidebar({
    activeTab,
    setActiveTab,
    sleepTimerRemaining,
    onOpenSleepTimer,
    profile,
    onOpenProfile
}: SidebarProps) {
    const menuItems = [
        {
            id: "home",
            label: "Explore",
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
            )
        },
        {
            id: "analytics",
            label: "Analytics",
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                    <line x1="18" y1="20" x2="18" y2="10"></line>
                    <line x1="12" y1="20" x2="12" y2="4"></line>
                    <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
            )
        },
        {
            id: "genres",
            label: "Genres",
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                    <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                    <circle cx="8" cy="10" r="2"></circle>
                    <circle cx="16" cy="10" r="2"></circle>
                    <path d="M6 16h12"></path>
                </svg>
            )
        },
        {
            id: "artists",
            label: "Artist",
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                </svg>
            )
        },
        {
            id: "albums",
            label: "Album",
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                    <circle cx="12" cy="12" r="10"></circle>
                    <circle cx="12" cy="12" r="3"></circle>
                </svg>
            )
        }
    ];

    const libraryItems = [
        {
            id: "favorites",
            label: "My favorite",
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
            )
        },
        {
            id: "library",
            label: "All Tracks",
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                    <line x1="8" y1="6" x2="21" y2="6"></line>
                    <line x1="8" y1="12" x2="21" y2="12"></line>
                    <line x1="8" y1="18" x2="21" y2="18"></line>
                    <line x1="3" y1="6" x2="3.01" y2="6"></line>
                    <line x1="3" y1="12" x2="3.01" y2="12"></line>
                    <line x1="3" y1="18" x2="3.01" y2="18"></line>
                </svg>
            )
        },
        {
            id: "settings",
            label: "Settings",
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
            )
        }
    ];

    const formatTimer = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s < 10 ? "0" : ""}${s}`;
    };

    return (
        <aside style={{
            width: "210px",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            padding: "20px 14px",
            backgroundColor: theme.sidebar,
            borderRight: "1px solid var(--border)",
            zIndex: 20
        }}>
            {/* Brand Logo Header */}
            <div
                onClick={() => setActiveTab("home")}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    cursor: "pointer",
                    padding: "0 10px",
                    marginBottom: "26px"
                }}
            >
                <div style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    backgroundColor: "var(--primary-soft)",
                    border: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--primary)"
                }}>
                    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                    </svg>
                </div>
                <span style={{
                    fontSize: "1.15rem",
                    fontWeight: "800",
                    letterSpacing: "-0.5px",
                    color: "var(--text-dark)"
                }}>
                    Aura
                </span>
            </div>

            {/* --- SECTION 1: MENU --- */}
            <div style={{ marginBottom: "20px" }}>
                <span style={{
                    fontSize: "0.82rem",
                    fontWeight: "700",
                    color: "var(--text-muted)",
                    padding: "0 12px",
                    display: "block",
                    marginBottom: "10px",
                    letterSpacing: "0.3px"
                }}>
                    Menu
                </span>

                <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    {menuItems.map(item => {
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "12px",
                                    padding: "9px 12px",
                                    borderRadius: "10px",
                                    backgroundColor: isActive ? "var(--surface-hover)" : "transparent",
                                    color: isActive ? "var(--primary)" : "var(--text-dark)",
                                    fontWeight: isActive ? "700" : "500",
                                    fontSize: "0.88rem",
                                    border: "none",
                                    textAlign: "left",
                                    cursor: "pointer",
                                    transition: "all 0.15s ease"
                                }}
                            >
                                <span style={{ color: isActive ? "var(--primary)" : "var(--text-muted)", display: "flex" }}>
                                    {item.icon}
                                </span>
                                <span>{item.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* --- SECTION 2: LIBRARY --- */}
            <div style={{ marginBottom: "auto" }}>
                <span style={{
                    fontSize: "0.82rem",
                    fontWeight: "700",
                    color: "var(--text-muted)",
                    padding: "0 12px",
                    display: "block",
                    marginBottom: "10px",
                    letterSpacing: "0.3px"
                }}>
                    Library
                </span>

                <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    {libraryItems.map(item => {
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "12px",
                                    padding: "9px 12px",
                                    borderRadius: "10px",
                                    backgroundColor: isActive ? "var(--surface-hover)" : "transparent",
                                    color: isActive ? "var(--primary)" : "var(--text-dark)",
                                    fontWeight: isActive ? "700" : "500",
                                    fontSize: "0.88rem",
                                    border: "none",
                                    textAlign: "left",
                                    cursor: "pointer",
                                    transition: "all 0.15s ease"
                                }}
                            >
                                <span style={{ color: isActive ? "var(--primary)" : "var(--text-muted)", display: "flex" }}>
                                    {item.icon}
                                </span>
                                <span>{item.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Active Sleep Timer Indicator */}
            {sleepTimerRemaining !== null && (
                <button
                    onClick={onOpenSleepTimer}
                    style={{
                        margin: "10px 4px",
                        padding: "8px 12px",
                        borderRadius: "12px",
                        backgroundColor: "var(--primary-soft)",
                        border: "1px solid var(--border)",
                        color: "var(--primary)",
                        fontSize: "0.78rem",
                        fontWeight: "700",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        cursor: "pointer"
                    }}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span>Sleep: {formatTimer(sleepTimerRemaining)}</span>
                </button>
            )}

            {/* USER PROFILE CARD (Theme is in Settings only) */}
            <div style={{
                paddingTop: "14px",
                borderTop: "1px solid var(--border)"
            }}>
                <div
                    onClick={onOpenProfile}
                    title="Edit Profile & View Stats"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "8px 10px",
                        borderRadius: "12px",
                        backgroundColor: "var(--surface-solid)",
                        border: "1px solid var(--border)",
                        cursor: "pointer",
                        transition: "background 0.18s ease"
                    }}
                    onMouseOver={e => e.currentTarget.style.backgroundColor = "var(--surface-hover)"}
                    onMouseOut={e => e.currentTarget.style.backgroundColor = "var(--surface-solid)"}
                >
                    <div style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        backgroundColor: profile.avatarColor,
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.85rem",
                        fontWeight: "800",
                        flexShrink: 0
                    }}>
                        {profile.name ? profile.name.charAt(0).toUpperCase() : "A"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "0.84rem", fontWeight: "700", color: "var(--text-dark)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {profile.name}
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                            Profile & Analytics
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
}
