import type { CardActionSnapshot, PlayerCard } from "#api_types/game.types";
import { CARD_TAG_LABELS } from "#api_types/card.types";
import { formatActionDescription } from "#api_types/format_action_description";
import { getDisplayedDamage } from "#api_types/get_effective_damage";
import { Text } from "@mantine/core";
import "./card_faces.css";

export const getCardDescription = (card: PlayerCard, spellPower = 0): string => {
    switch (card.type) {
        case "MINION":
            return card.description || `Serviteur ${card.attack}/${card.health}.`;
        case "SPELL": {
            const effectLines = card.spellActions
                .map((action) => formatActionDescription(action, "Effet", spellPower))
                .filter((description): description is string => description !== null);

            return effectLines.join("\n") || card.description || card.label;
        }
        case "WEAPON":
            return card.description || `Arme ${card.damage}/${card.durability}.`;
    }
};

const getCardChips = (card: PlayerCard) => {
    if (card.type !== "MINION") return { effects: [], tags: [] };
    return { effects: card.effects ?? [], tags: card.tags ?? [] };
};

const SpellEffectLine = ({
    action,
    spellPower,
}: {
    action: CardActionSnapshot;
    spellPower: number;
}) => {
    const description = formatActionDescription(action, "Effet", spellPower) ?? "";
    const baseDamage = getDisplayedDamage(action);
    const effectiveDamage = getDisplayedDamage(action, spellPower);
    const hasSpellPowerBonus =
        action.type === "DAMAGE" &&
        spellPower > 0 &&
        baseDamage !== null &&
        effectiveDamage !== null &&
        effectiveDamage > baseDamage;

    if (!hasSpellPowerBonus) {
        return <>{description}</>;
    }

    const damagePattern = `${effectiveDamage} dégâts`;
    const damageIndex = description.indexOf(damagePattern);

    if (damageIndex === -1) {
        return <>{description}</>;
    }

    const before = description.slice(0, damageIndex);
    const after = description.slice(damageIndex + damagePattern.length);

    return (
        <>
            {before}
            <span className="spell-effective-damage">{effectiveDamage}</span> dégâts
            {after}
            <Text component="span" size="xs" c="violet.4" ml={4}>
                ({baseDamage}+{spellPower})
            </Text>
        </>
    );
};

const SpellDescription = ({
    card,
    spellPower,
}: {
    card: Extract<PlayerCard, { type: "SPELL" }>;
    spellPower: number;
}) => {
    return (
        <div className="card-description">
            {card.spellActions.map((action, index) => (
                <Text
                    key={index}
                    size="sm"
                    c="dimmed"
                    mb={index < card.spellActions.length - 1 ? 4 : 0}
                >
                    <SpellEffectLine action={action} spellPower={spellPower} />
                </Text>
            ))}
        </div>
    );
};

interface CardDetailContentProps {
    card: PlayerCard;
    spellPower?: number;
}

export const CardDetailContent = ({ card, spellPower = 0 }: CardDetailContentProps) => {
    const { effects, tags } = getCardChips(card);
    const hasChips = effects.length > 0 || tags.length > 0;

    return (
        <>
            <Text fw={700} size="sm" mb={4}>
                {card.label}
            </Text>
            <Text size="xs" c="dimmed" mb={6}>
                {card.cost} mana
            </Text>
            {card.type === "SPELL" ? (
                <div className={hasChips ? "mb-2" : undefined}>
                    <SpellDescription card={card} spellPower={spellPower} />
                </div>
            ) : (
                <Text size="sm" c="dimmed" mb={hasChips ? 8 : 0} className="card-description">
                    {getCardDescription(card, spellPower)}
                </Text>
            )}
            {hasChips && (
                <div className="flex flex-wrap gap-1">
                    {effects.map((effect) => (
                        <span key={`effect-${effect}`} className="card-effect-tag">
                            {effect}
                        </span>
                    ))}
                    {tags.map((tag) => {
                        const meta = CARD_TAG_LABELS[tag];
                        return (
                            <span key={`tag-${tag}`} className="card-tag-chip">
                                {meta.symbol} {meta.label}
                            </span>
                        );
                    })}
                </div>
            )}
        </>
    );
};
