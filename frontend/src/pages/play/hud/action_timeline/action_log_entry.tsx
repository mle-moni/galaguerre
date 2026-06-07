import type { ApiGame, GameLogEntry } from "#api_types/game.types";
import { Text } from "@mantine/core";
import { CardDetailPopover } from "~/components/cards/card_detail_popover";
import "./action_timeline.css";

interface ActionLogEntryProps {
    entry: GameLogEntry;
    game: ApiGame;
    currentUserId: number;
    className?: string;
}

const getPlayerInfo = (game: ApiGame, playerId: number) => {
    const player =
        game.data.playerOne.userId === playerId ? game.data.playerOne : game.data.playerTwo;
    return { pseudo: player.pseudo, spellPower: player.spellPower };
};

export const ActionLogEntry = ({ entry, game, currentUserId, className }: ActionLogEntryProps) => {
    const { pseudo, spellPower } = getPlayerInfo(game, entry.playerId);
    const isMe = entry.playerId === currentUserId;
    const entryClass = [
        "action-timeline__entry",
        isMe ? "action-timeline__entry--me" : "action-timeline__entry--opponent",
        className,
    ]
        .filter(Boolean)
        .join(" ");

    if (entry.type === "PLAY_CARD" && entry.card) {
        return (
            <Text className={entryClass} component="div">
                {pseudo} joue{" "}
                <CardDetailPopover card={entry.card} spellPower={spellPower}>
                    <span className="action-timeline__card-link">{entry.card.label}</span>
                </CardDetailPopover>
            </Text>
        );
    }

    if (entry.type === "PASS_TURN") {
        return (
            <Text className={entryClass} component="div">
                {pseudo} passe son tour
            </Text>
        );
    }

    if (entry.type === "FATIGUE_DAMAGE") {
        return (
            <Text className={entryClass} component="div">
                {pseudo} subit {entry.fatigueDamage} dégâts de fatigue
            </Text>
        );
    }

    return null;
};
