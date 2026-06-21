import type { CardTag } from "#api_types/card.types";
import { CARD_TAG_LABELS } from "#api_types/card.types";
import { getMinionPowerEffects } from "#api_types/get_minion_power_effects";
import type { MinionCard } from "#api_types/game.types";

const EFFECT_SYMBOLS: Record<string, string> = {
    Provocation: "🔒",
    Charge: "💥",
    "Furie des vents": "🌪️",
    Toxique: "🐍",
    Discrétion: "🥷",
    Immunité: "🛡️",
};

export const EFFECT_SYMBOLS_EXTENDED: Record<string, string> = {
    ...EFFECT_SYMBOLS,
    "Dernier souffle": "💀",
};

const getCardEffects = (card: MinionCard): string[] => {
    const effects = card.effects?.length
        ? [...card.effects]
        : getMinionPowerEffects(card.minionPowers);

    if (card.deathrattleActions?.length) {
        effects.push("Dernier souffle");
    }

    return effects;
};

export const CardEffectSymbols = ({ card }: { card: MinionCard }) => {
    const effects = getCardEffects(card);
    const tags = card.tags ?? [];

    if (effects.length === 0 && tags.length === 0) return null;

    return (
        <div className="card-symbol-stack">
            {effects.length > 0 && (
                <div className="card-effects">
                    {effects.map((effect) => (
                        <div key={effect} className="card-symbol" title={effect}>
                            {EFFECT_SYMBOLS_EXTENDED[effect] ?? "❓"}
                        </div>
                    ))}
                </div>
            )}
            {tags.length > 0 && (
                <div className="card-tags">
                    {tags.map((tag: CardTag) => {
                        const meta = CARD_TAG_LABELS[tag];
                        return (
                            <div key={tag} className="card-symbol" title={meta.label}>
                                {meta.symbol}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
