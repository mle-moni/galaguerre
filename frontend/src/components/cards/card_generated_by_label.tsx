import type { PlayerCard } from "#api_types/game.types";

export const CardGeneratedByLabel = ({ card }: { card: PlayerCard }) => {
    if (!card.generatedBy) return null;

    return (
        <div className="card-generated-by" title={`Créé par ${card.generatedBy.label}`}>
            Créé par {card.generatedBy.label}
        </div>
    );
};
