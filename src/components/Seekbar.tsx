import { useState, useEffect, useRef } from "react";

interface SeekbarProps {
    progress: number;
    duration: number;
    onSeek: (position: number) => void;
    disabled?: boolean;
    trackHeight?: number;
    thumbSize?: number;
    activeThumbSize?: number;
    trackColor?: string;
    fillColor?: string;
    thumbColor?: string;
    onScrubChange?: (isScrubbing: boolean, scrubValue: number) => void;
}

export default function Seekbar({
    progress,
    duration,
    onSeek,
    disabled = false,
    trackHeight = 4,
    thumbSize = 12,
    activeThumbSize = 15,
    trackColor = "var(--slider-track)",
    fillColor = "var(--primary)",
    thumbColor = "var(--primary)",
    onScrubChange
}: SeekbarProps) {
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [scrubValue, setScrubValue] = useState(0);
    const [isHovered, setIsHovered] = useState(false);

    const trackRef = useRef<HTMLDivElement>(null);
    const isDraggingRef = useRef(false);
    const seekCooldownUntilRef = useRef<number>(0);

    const isInteractive = !disabled && duration > 0 && isFinite(duration);
    const isUnderCooldown = Date.now() < seekCooldownUntilRef.current;
    const displayValue = isInteractive ? (isScrubbing || isUnderCooldown ? scrubValue : progress) : 0;
    const progressPercent = isInteractive && duration > 0
        ? Math.min(100, Math.max(0, (displayValue / duration) * 100))
        : 0;

    // Sync external progress when not actively scrubbing or cooling down after seek
    useEffect(() => {
        if (!isDraggingRef.current) {
            if (Date.now() < seekCooldownUntilRef.current) {
                if (Math.abs(progress - scrubValue) < 1.0) {
                    seekCooldownUntilRef.current = 0;
                    setScrubValue(progress);
                }
                return;
            }
            setScrubValue(progress);
        }
    }, [progress, scrubValue]);

    const getSeekTimeFromEvent = (clientX: number): number => {
        if (!trackRef.current || duration <= 0) return 0;
        const rect = trackRef.current.getBoundingClientRect();
        if (rect.width <= 0) return 0;
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        return Math.min(duration, Math.max(0, ratio * duration));
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isInteractive || e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();

        const targetTime = getSeekTimeFromEvent(e.clientX);
        isDraggingRef.current = true;
        setIsScrubbing(true);
        setScrubValue(targetTime);
        seekCooldownUntilRef.current = Date.now() + 1200;
        onScrubChange?.(true, targetTime);

        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch (err) {}
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDraggingRef.current || !isInteractive) return;
        e.preventDefault();
        const targetTime = getSeekTimeFromEvent(e.clientX);
        setScrubValue(targetTime);
        seekCooldownUntilRef.current = Date.now() + 1200;
        onScrubChange?.(true, targetTime);
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDraggingRef.current) return;
        e.preventDefault();
        isDraggingRef.current = false;
        setIsScrubbing(false);

        try {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                e.currentTarget.releasePointerCapture(e.pointerId);
            }
        } catch (err) {}

        const targetTime = getSeekTimeFromEvent(e.clientX);
        setScrubValue(targetTime);
        seekCooldownUntilRef.current = Date.now() + 1200;
        onScrubChange?.(false, targetTime);
        onSeek(targetTime);
    };

    const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDraggingRef.current) return;
        isDraggingRef.current = false;
        setIsScrubbing(false);

        try {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                e.currentTarget.releasePointerCapture(e.pointerId);
            }
        } catch (err) {}

        seekCooldownUntilRef.current = Date.now() + 1200;
        onScrubChange?.(false, scrubValue);
        onSeek(scrubValue);
    };

    // Global listeners as safety backup for pointer drops outside window
    useEffect(() => {
        if (!isScrubbing) return;

        const handleWindowPointerMove = (e: PointerEvent) => {
            if (!isDraggingRef.current || !isInteractive) return;
            const targetTime = getSeekTimeFromEvent(e.clientX);
            setScrubValue(targetTime);
            seekCooldownUntilRef.current = Date.now() + 1200;
            onScrubChange?.(true, targetTime);
        };

        const handleWindowPointerUp = (e: PointerEvent) => {
            if (!isDraggingRef.current) return;
            isDraggingRef.current = false;
            setIsScrubbing(false);
            const targetTime = getSeekTimeFromEvent(e.clientX);
            setScrubValue(targetTime);
            seekCooldownUntilRef.current = Date.now() + 1200;
            onScrubChange?.(false, targetTime);
            onSeek(targetTime);
        };

        window.addEventListener("pointermove", handleWindowPointerMove);
        window.addEventListener("pointerup", handleWindowPointerUp);
        window.addEventListener("pointercancel", handleWindowPointerUp);

        return () => {
            window.removeEventListener("pointermove", handleWindowPointerMove);
            window.removeEventListener("pointerup", handleWindowPointerUp);
            window.removeEventListener("pointercancel", handleWindowPointerUp);
        };
    }, [isScrubbing, isInteractive, duration, onSeek]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (!isInteractive) return;
        if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            e.preventDefault();
            const next = Math.max(0, (isScrubbing ? scrubValue : progress) - 5);
            onSeek(next);
        } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            e.preventDefault();
            const next = Math.min(duration, (isScrubbing ? scrubValue : progress) + 5);
            onSeek(next);
        } else if (e.key === "Home") {
            e.preventDefault();
            onSeek(0);
        } else if (e.key === "End") {
            e.preventDefault();
            onSeek(duration);
        }
    };

    const currentThumbSize = isHovered || isScrubbing ? activeThumbSize : thumbSize;

    return (
        <div
            role="slider"
            aria-valuemin={0}
            aria-valuemax={duration || 0}
            aria-valuenow={displayValue}
            tabIndex={isInteractive ? 0 : -1}
            onKeyDown={handleKeyDown}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onMouseEnter={() => isInteractive && setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                display: "flex",
                alignItems: "center",
                flex: 1,
                height: "24px",
                position: "relative",
                cursor: isInteractive ? "pointer" : "default",
                touchAction: "none",
                userSelect: "none",
                outline: "none"
            }}
        >
            {/* Visual Track */}
            <div
                ref={trackRef}
                style={{
                    width: "100%",
                    height: isHovered || isScrubbing ? `${Math.max(trackHeight + 2, 6)}px` : `${trackHeight}px`,
                    borderRadius: "3px",
                    backgroundColor: trackColor,
                    position: "relative",
                    overflow: "visible",
                    transition: "height 0.14s ease, background-color 0.14s ease"
                }}
            >
                {/* Active Progress Fill */}
                <div
                    style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${progressPercent}%`,
                        borderRadius: "3px",
                        backgroundColor: fillColor,
                        pointerEvents: "none"
                    }}
                />

                {/* Scrubber Thumb */}
                {isInteractive && (
                    <div
                        style={{
                            position: "absolute",
                            left: `${progressPercent}%`,
                            top: "50%",
                            transform: "translate(-50%, -50%)",
                            width: `${currentThumbSize}px`,
                            height: `${currentThumbSize}px`,
                            borderRadius: "50%",
                            backgroundColor: thumbColor,
                            boxShadow: "0 1px 5px rgba(0,0,0,0.45)",
                            pointerEvents: "none",
                            transition: isScrubbing ? "none" : "width 0.12s ease, height 0.12s ease"
                        }}
                    />
                )}
            </div>
        </div>
    );
}
