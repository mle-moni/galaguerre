import { observer } from "mobx-react-lite";
import { useMemo } from "react";
import { getArrowTargetValidity } from "~/helpers/arrow_target_validity";
import { useGameContext } from "~/hooks/use_game_state";
import type { TargetValidity } from "~/stores/TargetSelectionStore";

const ARROW_COLORS: Record<TargetValidity, { stroke: string; outline: string }> = {
    valid: { stroke: "#16a34a", outline: "#052e16" },
    invalid: { stroke: "#dc2626", outline: "#450a0a" },
    none: { stroke: "#ea580c", outline: "#431407" },
};

const STROKE_WIDTH = 10;
const OUTLINE_WIDTH = 16;

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

    const { stroke, outline } = ARROW_COLORS[validity];
    const markerId = `targeting-arrow-head-${validity}`;

    return (
        <svg
            className="pointer-events-none fixed inset-0 z-50"
            width="100%"
            height="100%"
            aria-hidden
        >
            <defs>
                <marker
                    id={markerId}
                    markerWidth="36"
                    markerHeight="36"
                    refX="28"
                    refY="18"
                    orient="auto"
                    markerUnits="userSpaceOnUse"
                >
                    <path
                        d="M2,2 L34,18 L2,34 Z"
                        fill={stroke}
                        stroke={outline}
                        strokeWidth={3}
                        strokeLinejoin="round"
                    />
                </marker>
            </defs>
            <path
                d={path}
                fill="none"
                stroke={outline}
                strokeWidth={OUTLINE_WIDTH}
                strokeLinecap="round"
            />
            <path
                d={path}
                fill="none"
                stroke={stroke}
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="round"
                markerEnd={`url(#${markerId})`}
            />
        </svg>
    );
});
