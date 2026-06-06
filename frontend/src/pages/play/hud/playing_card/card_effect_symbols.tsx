import type { MinionCard } from "#api_types/game.types";

const EFFECT_SYMBOLS: Record<string, string> = {
    Provocation: "🔒",
    Charge: "💥",
    "Furie des vents": "🌪️",
    Toxique: "🐍",
};

const getCardEffects = (card: MinionCard): string[] => {
    if (card.effects?.length) return card.effects;
    if (card.hasTaunt) return ["Provocation"];
    return [];
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
                            {EFFECT_SYMBOLS[effect] ?? "❓"}
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
