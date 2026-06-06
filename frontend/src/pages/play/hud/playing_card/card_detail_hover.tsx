import type { MinionCard } from "#api_types/game.types";
import { HoverCard, Text } from "@mantine/core";
import type { ReactNode } from "react";

interface CardDetailHoverProps {
    card: MinionCard;
    children: ReactNode;
}

export const CardDetailHover = ({ card, children }: CardDetailHoverProps) => {
    const effects = card.effects ?? [];
    const description =
        card.description || `Serviteur ${card.attack}/${card.health}.`;

    return (
        <HoverCard width={280} shadow="md" openDelay={200} position="top">
            <HoverCard.Target>{children}</HoverCard.Target>
            <HoverCard.Dropdown>
                <Text fw={700} size="sm" mb={4}>
                    {card.label}
                </Text>
                <Text size="sm" c="dimmed" mb={effects.length > 0 ? 8 : 0}>
                    {description}
                </Text>
                {effects.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {effects.map((effect) => (
                            <span key={effect} className="card-effect-tag">
                                {effect}
                            </span>
                        ))}
                    </div>
                )}
            </HoverCard.Dropdown>
        </HoverCard>
    );
};
