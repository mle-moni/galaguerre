import type { ApiGame, GameLogEntry, PlayerCard } from "#api_types/game.types";
import { Text } from "@mantine/core";
import { CardHoverPreview } from "~/components/cards/card_hover_preview";
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

interface CardLinkProps {
    card: PlayerCard;
    spellPower: number;
}

const CardLink = ({ card, spellPower }: CardLinkProps) => (
    <CardHoverPreview card={card} spellPower={spellPower}>
        <span className="action-timeline__card-link">{card.label}</span>
    </CardHoverPreview>
);

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
                {pseudo} joue <CardLink card={entry.card} spellPower={spellPower} />
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

    if (entry.type === "ABANDON") {
        return (
            <Text className={entryClass} component="div">
                {pseudo} abandonne la partie
            </Text>
        );
    }

    if (entry.type === "DRAW") {
        return (
            <Text className={entryClass} component="div">
                {pseudo} pioche{" "}
                {isMe && entry.card ? (
                    <CardLink card={entry.card} spellPower={spellPower} />
                ) : (
                    "une carte"
                )}
            </Text>
        );
    }

    if (entry.type === "OVERDRAW" && entry.card) {
        return (
            <Text className={entryClass} component="div">
                {pseudo} : surpioche — <CardLink card={entry.card} spellPower={spellPower} />
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

    if (entry.type === "ATTACK" && entry.attackerCard && entry.attackTarget) {
        const target =
            entry.attackTarget.type === "MINION" && entry.attackTarget.card ? (
                <CardLink card={entry.attackTarget.card} spellPower={spellPower} />
            ) : entry.attackTarget.playerId !== undefined ? (
                getPlayerInfo(game, entry.attackTarget.playerId).pseudo
            ) : (
                "?"
            );

        return (
            <Text className={entryClass} component="div">
                {pseudo} : <CardLink card={entry.attackerCard} spellPower={spellPower} /> attaque{" "}
                {target}
            </Text>
        );
    }

    if (entry.type === "BATTLECRY" && entry.card) {
        return (
            <Text className={entryClass} component="div">
                {pseudo} : <CardLink card={entry.card} spellPower={spellPower} /> lance son cri de
                guerre
            </Text>
        );
    }

    if (entry.type === "DEATHRATTLE" && entry.card) {
        return (
            <Text className={entryClass} component="div">
                {pseudo} : <CardLink card={entry.card} spellPower={spellPower} /> déclenche son
                dernier souffle
            </Text>
        );
    }

    if (entry.type === "MINION_DEATH" && entry.card) {
        return (
            <Text className={entryClass} component="div">
                {pseudo} : <CardLink card={entry.card} spellPower={spellPower} /> est mort
            </Text>
        );
    }

    if (entry.type === "WEAPON_BREAK" && entry.card) {
        return (
            <Text className={entryClass} component="div">
                {pseudo} : <CardLink card={entry.card} spellPower={spellPower} /> se casse
            </Text>
        );
    }

    return null;
};
