import type { MinionCard, PlayerCard } from "#api_types/game.types";
import {
    getActiveMinionEffectNames,
    isMinionDescriptionLineDisabled,
} from "#api_types/get_minion_description_line_state";
import { getCardDescription } from "./card_detail_content.jsx";
import "./card_faces.css";

interface CardFaceDescriptionProps {
    card: PlayerCard;
    spellPower?: number;
    isSilenced?: boolean;
}

export const CardFaceDescription = ({
    card,
    spellPower = 0,
    isSilenced = false,
}: CardFaceDescriptionProps) => {
    const description = getCardDescription(card, spellPower);

    if (card.type === "MINION") {
        const lines = description.split("\n");
        const activeEffects = getActiveMinionEffectNames(card);

        return (
            <div className="card-face-description">
                {lines.map((line, index) => (
                    <div
                        key={index}
                        className={
                            isMinionDescriptionLineDisabled(line, index, activeEffects, isSilenced)
                                ? "card-description-line--silenced"
                                : undefined
                        }
                    >
                        {line}
                    </div>
                ))}
            </div>
        );
    }

    return <div className="card-face-description">{description}</div>;
};
