import { EFFECT_SYMBOLS } from "#api_types/card_keyword_glossary";
import type { MinionCard } from "#api_types/game.types";
import { getMinionPowerEffects } from "#api_types/get_minion_power_effects";

const TRIGGERED_PASSIVE_LABELS: Record<string, string> = {
    TURN_END: "Fin de tour",
    TURN_BEGIN: "Début de tour",
    DRAW: "Pioche",
    HEAL: "Soin",
    DAMAGE: "Dégâts",
    PLAY_CARD: "Carte jouée",
    SUMMON: "Invocation",
    DECK_CARD_ADD: "Carte placée dans un deck",
    HERO_ATTACK: "Attaque du héros",
};

export const BoardMinionEffectIcons = ({
    card,
    isSilenced = false,
}: {
    card: MinionCard;
    isSilenced?: boolean;
}) => {
    const icons: { key: string; symbol: string; title: string }[] = [];

    for (const effect of getMinionPowerEffects(card.minionPowers)) {
        icons.push({
            key: effect,
            symbol: EFFECT_SYMBOLS[effect] ?? "❓",
            title: effect,
        });
    }

    if (!isSilenced && card.deathrattleActions?.length) {
        icons.push({ key: "deathrattle", symbol: "💀", title: "Dernier souffle" });
    }

    if (!isSilenced) {
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
