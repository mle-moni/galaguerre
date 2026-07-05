import type { ApiDailyQuest } from "#api_types/daily_quests.types";
import { getCardPreviewById } from "#api_types/card_preview";
import type { ReactNode } from "react";
import { CardPreviewLink } from "~/components/cards/card_preview_link";

interface DailyQuestTitleProps {
    quest: ApiDailyQuest;
}

export const DailyQuestTitle = ({ quest }: DailyQuestTitleProps): ReactNode => {
    if (
        quest.questType === "WIN_WITH_CARD" &&
        quest.params?.cardId != null &&
        quest.params.cardName
    ) {
        const card = getCardPreviewById(quest.params.cardId);
        const cardName = quest.params.cardName;

        return (
            <>
                Gagner une partie en ayant joué{" "}
                {card ? <CardPreviewLink card={card}>{cardName}</CardPreviewLink> : cardName}
            </>
        );
    }

    return quest.title;
};
