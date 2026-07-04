import type { PlayerCard } from "#api_types/game.types";

const CARD_FACE_TYPE_LABELS: Record<PlayerCard["type"], string> = {
    MINION: "SERVITEUR",
    SPELL: "SORT",
    WEAPON: "ARME",
};

export const CardFaceTypeLabel = ({ type }: { type: PlayerCard["type"] }) => (
    <p className="playing-card-face__type">{CARD_FACE_TYPE_LABELS[type]}</p>
);
