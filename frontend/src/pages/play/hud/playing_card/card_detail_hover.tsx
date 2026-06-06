import type { PlayerCard } from "#api_types/game.types";
import { HoverCard, Text } from "@mantine/core";
import type { ReactNode } from "react";

interface CardDetailHoverProps {
    card: PlayerCard;
    children: ReactNode;
}

const getCardDescription = (card: PlayerCard): string => {
    if (card.type === "MINION") {
        return card.description || `Serviteur ${card.attack}/${card.health}.`;
    }
    if (card.type === "SPELL") {
        return card.description || card.label;
    }
    if (card.type === "WEAPON") {
        return card.description || `Arme ${card.damage}/${card.durability}.`;
    }
    return card.label;
};

const getCardChips = (card: PlayerCard) => {
    if (card.type !== "MINION") return { effects: [], tags: [] };
    return { effects: card.effects ?? [], tags: card.tags ?? [] };
};

export const CardDetailHover = ({ card, children }: CardDetailHoverProps) => {
    const { effects, tags } = getCardChips(card);
    const hasChips = effects.length > 0 || tags.length > 0;
    const description = getCardDescription(card);

    return (
        <HoverCard width={280} shadow="md" openDelay={200} position="top">
            <HoverCard.Target>{children}</HoverCard.Target>
            <HoverCard.Dropdown>
                <Text fw={700} size="sm" mb={4}>
                    {card.label}
                </Text>
                <Text size="sm" c="dimmed" mb={hasChips ? 8 : 0}>
                    {description}
                </Text>
                {hasChips && (
                    <div className="flex flex-wrap gap-1">
                        {effects.map((effect) => (
                            <span key={`effect-${effect}`} className="card-effect-tag">
                                {effect}
                            </span>
                        ))}
                        {tags.map((tag) => (
                            <span key={`tag-${tag.label}`} className="card-tag-chip">
                                {tag.symbol} {tag.label}
                            </span>
                        ))}
                    </div>
                )}
            </HoverCard.Dropdown>
        </HoverCard>
    );
};
