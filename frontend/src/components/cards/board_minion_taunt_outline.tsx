const VIEWBOX_SIZE = 100;
const INSET = 1;
const TOOTH_DEPTH = 6.5;
const HORIZONTAL_TEETH = 7;
const VERTICAL_TEETH = 5;

const buildZigzagRectPath = (): string => {
    const x0 = INSET;
    const y0 = INSET;
    const x1 = VIEWBOX_SIZE - INSET;
    const y1 = VIEWBOX_SIZE - INSET;
    const width = x1 - x0;
    const height = y1 - y0;
    const toothWidth = width / HORIZONTAL_TEETH;
    const toothHeight = height / VERTICAL_TEETH;

    let path = `M ${x0} ${y0 + TOOTH_DEPTH}`;

    for (let index = 0; index < HORIZONTAL_TEETH; index += 1) {
        const startX = x0 + index * toothWidth;
        const midX = startX + toothWidth / 2;
        const endX = startX + toothWidth;
        path += ` L ${midX} ${y0} L ${endX} ${y0 + TOOTH_DEPTH}`;
    }

    for (let index = 0; index < VERTICAL_TEETH; index += 1) {
        const startY = y0 + index * toothHeight;
        const midY = startY + toothHeight / 2;
        const endY = startY + toothHeight;
        path += ` L ${x1 - TOOTH_DEPTH} ${midY} L ${x1} ${endY}`;
    }

    for (let index = 0; index < HORIZONTAL_TEETH; index += 1) {
        const startX = x1 - index * toothWidth;
        const midX = startX - toothWidth / 2;
        const endX = startX - toothWidth;
        path += ` L ${midX} ${y1} L ${endX} ${y1 - TOOTH_DEPTH}`;
    }

    for (let index = 0; index < VERTICAL_TEETH; index += 1) {
        const startY = y1 - index * toothHeight;
        const midY = startY - toothHeight / 2;
        const endY = startY - toothHeight;
        path += ` L ${x0 + TOOTH_DEPTH} ${midY} L ${x0} ${endY}`;
    }

    return `${path} Z`;
};

const TAUNT_ZIGZAG_PATH = buildZigzagRectPath();

export const BoardMinionTauntOutline = () => (
    <svg
        className="board-minion-token__taunt-outline"
        viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
        preserveAspectRatio="none"
        aria-hidden
    >
        <path
            d={TAUNT_ZIGZAG_PATH}
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinejoin="miter"
            vectorEffect="non-scaling-stroke"
        />
    </svg>
);
