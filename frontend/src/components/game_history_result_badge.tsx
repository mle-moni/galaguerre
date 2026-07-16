import type { GameHistoryResult } from "#api_types/game_history.types";
import { IconCrown, IconFlame } from "@tabler/icons-react";
import clsx from "clsx";
import "./game_history_result_badge.css";

const RESULT_LABELS: Record<GameHistoryResult, string> = {
    WIN: "Victoire",
    LOSS: "Défaite",
    DRAW: "Nul",
};

export const GameHistoryResultBadge = ({
    result,
    isFriendly,
}: {
    result: GameHistoryResult;
    isFriendly: boolean;
}) => {
    const badgeClass = clsx(
        "game-history-result-badge",
        result === "WIN" && "game-history-result-badge--win",
        result === "LOSS" && "game-history-result-badge--loss",
        result === "DRAW" && "game-history-result-badge--draw",
    );

    return (
        <span className="game-history-result-badge-group">
            <span className={badgeClass}>
                {result === "WIN" && <IconCrown size={12} />}
                {result === "LOSS" && <IconFlame size={12} />}
                {RESULT_LABELS[result]}
                {result === "WIN" && <IconCrown size={12} />}
                {result === "LOSS" && <IconFlame size={12} />}
            </span>
            {isFriendly && (
                <span className="game-history-result-badge game-history-result-badge--friendly">
                    Amical
                </span>
            )}
        </span>
    );
};
