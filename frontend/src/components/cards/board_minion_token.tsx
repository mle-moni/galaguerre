import type { MinionCard } from "#api_types/game.types";
import { Image } from "@mantine/core";
import clsx from "clsx";
import type { CSSProperties, ReactNode } from "react";
import { getMinionCardMaxAttacks, type MinionAttackStatus } from "~/helpers/minion_combat";
import { BoardMinionEffectIcons } from "./board_minion_effect_icons.jsx";
import "./board_minion_token.css";

interface BoardMinionTokenProps {
    card: MinionCard;
    attack: number;
    health: number;
    className?: string;
    style?: CSSProperties;
    attackStatus?: MinionAttackStatus;
    remainingAttacks?: number;
    onPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
    onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
    wrapper?: (content: ReactNode) => ReactNode;
}

export const BoardMinionToken = ({
    card,
    attack,
    health,
    className,
    style,
    attackStatus,
    remainingAttacks,
    onPointerDown,
    onClick,
    wrapper = (content) => content,
}: BoardMinionTokenProps) => {
    const maxAttacks = getMinionCardMaxAttacks(card);
    const showWindfuryBadge =
        attackStatus !== undefined &&
        attackStatus !== "idle" &&
        card.minionPowers?.hasWindfury &&
        remainingAttacks !== undefined;
    const hasTaunt = card.minionPowers?.hasTaunt === true;

    const content = (
        <div
            data-playing-card
            data-playing-card-id={card.uuid}
            style={style}
            className={clsx(
                "board-minion-token",
                hasTaunt && "board-minion-token--taunt",
                attackStatus && `minion-card-face--${attackStatus}`,
                className,
            )}
            onPointerDown={onPointerDown}
            onClick={onClick}
        >
            <BoardMinionEffectIcons card={card} />
            {attackStatus === "sleeping" && (
                <span className="board-minion-token__sleep-icon" aria-hidden>
                    💤
                </span>
            )}
            <div className="board-minion-token__art">
                <Image
                    className="board-minion-token__image"
                    src={card.imageUrl}
                    alt={card.label}
                    draggable={false}
                />
            </div>
            <span className="board-minion-token__stat board-minion-token__stat--attack">
                {attack}
            </span>
            <span className="board-minion-token__stat board-minion-token__stat--health">
                {health}
            </span>
            {showWindfuryBadge && (
                <span className="board-minion-token__attacks-remaining">
                    {remainingAttacks}/{maxAttacks}
                </span>
            )}
        </div>
    );

    return <>{wrapper(content)}</>;
};
