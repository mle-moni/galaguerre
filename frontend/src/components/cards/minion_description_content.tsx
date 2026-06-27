import type { MinionCard } from "#api_types/game.types";
import {
    getActiveMinionEffectNames,
    isMinionDescriptionLineDisabled,
} from "#api_types/get_minion_description_line_state";
import { getMinionDescriptionPartsFromCard } from "#api_types/minion_card_description";
import { Fragment } from "react";

interface MinionDescriptionContentProps {
    card: MinionCard;
    isSilenced?: boolean;
    className?: string;
}

export const MinionDescriptionContent = ({
    card,
    isSilenced = false,
    className,
}: MinionDescriptionContentProps) => {
    const parts = getMinionDescriptionPartsFromCard(card).filter((part) => part.trim().length > 0);
    const activeEffects = getActiveMinionEffectNames(card);

    return (
        <div className={className}>
            {parts.map((part, index) => {
                const normalizedPart = part.replace(/\.$/, "");
                const isDisabled = isMinionDescriptionLineDisabled(
                    part,
                    index,
                    activeEffects,
                    isSilenced,
                );

                return (
                    <Fragment key={index}>
                        {index > 0 && ". "}
                        <span
                            className={isDisabled ? "card-description-line--silenced" : undefined}
                        >
                            {normalizedPart}
                        </span>
                    </Fragment>
                );
            })}
            {parts.length > 0 && "."}
        </div>
    );
};
