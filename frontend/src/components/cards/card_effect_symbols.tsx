import type { MinionCard } from "#api_types/game.types";

const EFFECT_SYMBOLS: Record<string, string> = {
    Provocation: "🔒",
    Charge: "💥",
    "Furie des vents": "🌪️",
    Toxique: "🐍",
};

const EFFECT_SYMBOLS_EXTENDED: Record<string, string> = {
    ...EFFECT_SYMBOLS,
    "Dernier souffle": "💀",
};

const getCardEffects = (card: MinionCard): string[] => {
    const effects: string[] = [];
    if (card.effects?.length) {
        effects.push(...card.effects);
    } else if (card.hasTaunt) {
        effects.push("Provocation");
    }
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
                    {tags.map((tag) => (
                        <div key={tag.label} className="card-symbol" title={tag.label}>
                            {tag.symbol}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
