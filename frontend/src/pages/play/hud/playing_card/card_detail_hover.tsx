import type { PlayerCard } from "#api_types/game.types";
import { formatActionDescription } from "#api_types/format_action_description";
import { getDisplayedDamage } from "#api_types/get_effective_damage";
import { HoverCard, Text } from "@mantine/core";
import { observer } from "mobx-react-lite";
import type { ReactNode } from "react";
import { useGameContext } from "~/hooks/use_game_state";

interface CardDetailHoverProps {
    card: PlayerCard;
    children: ReactNode;
}

const getCardDescription = (card: PlayerCard, spellPower?: number): string => {
    switch (card.type) {
        case "MINION":
            return card.description || `Serviteur ${card.attack}/${card.health}.`;
        case "SPELL":
            return (
                formatActionDescription(card.action, "Effet", spellPower) ??
                card.description ??
                card.label
            );
        case "WEAPON":
            return card.description || `Arme ${card.damage}/${card.durability}.`;
    }
};

const getCardChips = (card: PlayerCard) => {
    if (card.type !== "MINION") return { effects: [], tags: [] };
    return { effects: card.effects ?? [], tags: card.tags ?? [] };
};

const SpellDescription = ({
    card,
    spellPower,
}: {
    card: Extract<PlayerCard, { type: "SPELL" }>;
    spellPower: number;
}) => {
    const description = getCardDescription(card, spellPower);
    const baseDamage = getDisplayedDamage(card.action);
    const effectiveDamage = getDisplayedDamage(card.action, spellPower);
    const hasSpellPowerBonus =
        card.action.type === "DAMAGE" &&
        spellPower > 0 &&
        baseDamage !== null &&
        effectiveDamage !== null &&
        effectiveDamage > baseDamage;

    if (!hasSpellPowerBonus) {
        return (
            <Text size="sm" c="dimmed" mb={0}>
                {description}
            </Text>
        );
    }

    const damagePattern = `${effectiveDamage} dégâts`;
    const damageIndex = description.indexOf(damagePattern);

    if (damageIndex === -1) {
        return (
            <Text size="sm" c="dimmed" mb={0}>
                {description}
            </Text>
        );
    }

    const before = description.slice(0, damageIndex);
    const after = description.slice(damageIndex + damagePattern.length);

    return (
        <Text size="sm" c="dimmed" mb={0}>
            {before}
            <span className="spell-effective-damage">{effectiveDamage}</span> dégâts
            {after}
            <Text component="span" size="xs" c="violet.4" ml={4}>
                ({baseDamage}+{spellPower})
            </Text>
        </Text>
    );
};

export const CardDetailHover = observer(({ card, children }: CardDetailHoverProps) => {
    const { store } = useGameContext();
    const { effects, tags } = getCardChips(card);
    const hasChips = effects.length > 0 || tags.length > 0;
    const spellPower = store.me.spellPower;

    return (
        <HoverCard width={280} shadow="md" openDelay={200} position="top">
            <HoverCard.Target>{children}</HoverCard.Target>
            <HoverCard.Dropdown>
                <Text fw={700} size="sm" mb={4}>
                    {card.label}
                </Text>
                {card.type === "SPELL" ? (
                    <div className={hasChips ? "mb-2" : undefined}>
                        <SpellDescription card={card} spellPower={spellPower} />
                    </div>
                ) : (
                    <Text size="sm" c="dimmed" mb={hasChips ? 8 : 0}>
                        {getCardDescription(card)}
                    </Text>
                )}
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
});
