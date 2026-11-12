import { useState, useEffect } from "react";

interface ArtworkProps {
    src?: string | null;
    alt?: string;
    width?: number | string;
    height?: number | string;
    borderRadius?: number | string;
    className?: string;
    style?: React.CSSProperties;
    iconSize?: number;
    showLabel?: string;
    sublabel?: string;
}

export default function Artwork({
    src,
    alt = "",
    width = "100%",
    height = "100%",
    borderRadius = "12px",
    className = "",
    style = {},
    iconSize,
    showLabel,
    sublabel
}: ArtworkProps) {
    const [hasError, setHasError] = useState(false);
    const label = showLabel || sublabel;

    // Reset error state when src changes
    useEffect(() => {
        setHasError(false);
    }, [src]);

    const hasValidArt = src && !hasError && src.trim().length > 0;

    // Estimate icon size if not specified based on container dimension
    const computedIconSize = iconSize || (typeof width === "number" ? Math.max(16, Math.min(48, Math.round(width * 0.4))) : 24);

    return (
        <div
            className={className}
            style={{
                width,
                height,
                borderRadius,
                overflow: "hidden",
                backgroundColor: "var(--surface-solid)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                flexShrink: 0,
                ...style
            }}
        >
            {hasValidArt ? (
                <img
                    src={src}
                    alt={alt}
                    onError={() => setHasError(true)}
                    style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block"
                    }}
                />
            ) : (
                <div
                    style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        color: "var(--text-muted)",
                        userSelect: "none",
                        pointerEvents: "none"
                    }}
                >
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        width={computedIconSize}
                        height={computedIconSize}
                        style={{ opacity: 0.55 }}
                    >
                        <path d="M9 18V5l12-2v13"></path>
                        <circle cx="6" cy="18" r="3"></circle>
                        <circle cx="18" cy="16" r="3"></circle>
                    </svg>
                    {label && (
                        <span style={{ fontSize: "0.72rem", opacity: 0.65, fontWeight: "500" }}>
                            {label}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
