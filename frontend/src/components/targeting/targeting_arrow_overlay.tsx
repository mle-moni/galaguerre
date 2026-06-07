import { observer } from "mobx-react-lite";
import { useMemo } from "react";
import { getArrowTargetValidity } from "~/helpers/arrow_target_validity";
import { useGameContext } from "~/hooks/use_game_state";
import type { TargetValidity } from "~/stores/TargetSelectionStore";

const ARROW_COLORS: Record<TargetValidity, string> = {
    valid: "#22c55e",
    invalid: "#ef4444",
    none: "#e2e8f0",
};

const buildArrowPath = (originX: number, originY: number, cursorX: number, cursorY: number) => {
    const dx = cursorX - originX;
    const dy = cursorY - originY;
    const controlX = originX + dx * 0.5;
    const controlY = originY + dy * 0.5 - Math.abs(dx) * 0.15;

    return `M ${originX} ${originY} Q ${controlX} ${controlY} ${cursorX} ${cursorY}`;
};

export const TargetingArrowOverlay = observer(() => {
    const { store } = useGameContext();
    const arrowStore = store.targetingArrowStore;

    const validity = getArrowTargetValidity(
        store,
        arrowStore.cursor?.x ?? 0,
        arrowStore.cursor?.y ?? 0,
    );

    const path = useMemo(() => {
        if (!arrowStore.isVisible || !arrowStore.origin || !arrowStore.cursor) return null;

        return buildArrowPath(
            arrowStore.origin.x,
            arrowStore.origin.y,
            arrowStore.cursor.x,
            arrowStore.cursor.y,
        );
    }, [arrowStore.cursor, arrowStore.isVisible, arrowStore.origin]);

    if (!path) return null;

    const color = ARROW_COLORS[validity];

    return (
        <svg
            className="pointer-events-none fixed inset-0 z-50"
            width="100%"
            height="100%"
            aria-hidden
        >
            <defs>
                <marker
                    id="targeting-arrow-head"
                    markerWidth="8"
                    markerHeight="8"
                    refX="6"
                    refY="4"
                    orient="auto"
                >
                    <path d="M0,0 L8,4 L0,8 Z" fill={color} />
                </marker>
            </defs>
            <path
                d={path}
                fill="none"
                stroke={color}
                strokeWidth={3}
                strokeLinecap="round"
                markerEnd="url(#targeting-arrow-head)"
            />
        </svg>
    );
});
