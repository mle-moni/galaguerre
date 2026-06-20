import type { MinionCard } from "#api_types/game.types";

const TRIGGERED_PASSIVE_LABELS: Record<string, string> = {
    TURN_END: "Fin de tour",
    TURN_BEGIN: "Début de tour",
    DRAW: "Pioche",
    HEAL: "Soin",
    DAMAGE: "Dégâts",
    PLAY_CARD: "Carte jouée",
    SUMMON: "Invocation",
};

export const BoardMinionEffectIcons = ({ card }: { card: MinionCard }) => {
    const icons: { key: string; symbol: string; title: string }[] = [];

    if (card.deathrattleActions?.length) {
        icons.push({ key: "deathrattle", symbol: "💀", title: "Dernier souffle" });
    }

    const triggeredPassives = (card.passives ?? []).filter((passive) => passive.triggersOn);
    if (triggeredPassives.length > 0) {
        const titles = triggeredPassives
            .map(
                (passive) =>
                    TRIGGERED_PASSIVE_LABELS[passive.triggersOn ?? ""] ?? "Effet déclenché",
            )
            .join(", ");
        icons.push({ key: "triggered", symbol: "⚡", title: titles });
    }

    const hasTargetedBattlecry = (card.battlecryActions ?? []).some((action) => action.isTargeted);
    if (hasTargetedBattlecry) {
        icons.push({ key: "battlecry", symbol: "✨", title: "Cri de guerre" });
    }

    if (icons.length === 0) return null;

    return (
        <div className="board-minion-token__effects">
            {icons.map((icon) => (
                <span key={icon.key} className="board-minion-token__effect" title={icon.title}>
                    {icon.symbol}
                </span>
            ))}
        </div>
    );
};
