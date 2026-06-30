import type { PlayerCard } from "#api_types/game.types";
import clsx from "clsx";
import { getCardDescription } from "./card_detail_content.jsx";
import { getCardFaceDescriptionSizeClass } from "./card_face_description_size.js";
import { MinionDescriptionContent } from "./minion_description_content.jsx";
import { CardGeneratedByLabel } from "./card_generated_by_label.jsx";
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
    const sizeClass = getCardFaceDescriptionSizeClass(description);

    if (card.type === "MINION") {
        return (
            <>
                <CardGeneratedByLabel card={card} />
                <MinionDescriptionContent
                    card={card}
                    isSilenced={isSilenced}
                    className={clsx("card-face-description", sizeClass)}
                />
            </>
        );
    }

    return (
        <>
            <CardGeneratedByLabel card={card} />
            <div className={clsx("card-face-description", sizeClass)}>{description}</div>
        </>
    );
};
