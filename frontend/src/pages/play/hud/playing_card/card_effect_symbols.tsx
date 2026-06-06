import type { MinionCard } from "#api_types/game.types";

const EFFECT_SYMBOLS: Record<string, { symbol: string; className: string }> = {
    Provocation: { symbol: "P", className: "card-effect-provocation" },
    Charge: { symbol: "C", className: "card-effect-charge" },
    "Furie des vents": { symbol: "F", className: "card-effect-windfury" },
    Toxique: { symbol: "T", className: "card-effect-poisonous" },
};

const getCardEffects = (card: MinionCard): string[] => {
    if (card.effects?.length) return card.effects;
    if (card.hasTaunt) return ["Provocation"];
    return [];
};

export const CardEffectSymbols = ({ card }: { card: MinionCard }) => {
    const effects = getCardEffects(card);
    if (effects.length === 0) return null;

    return (
        <div className="card-effects">
            {effects.map((effect) => {
                const config = EFFECT_SYMBOLS[effect] ?? {
                    symbol: effect.charAt(0),
                    className: "card-effect-default",
                };

                return (
                    <div
                        key={effect}
                        className={`card-effect-symbol ${config.className}`}
                        title={effect}
                    >
                        {config.symbol}
                    </div>
                );
            })}
        </div>
    );
};
