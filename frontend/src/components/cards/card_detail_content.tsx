import type { CardActionSnapshot, MinionCard, PlayerCard } from "#api_types/game.types";
import { CARD_TAG_LABELS } from "#api_types/card.types";
import { getCardPreviewById } from "#api_types/card_preview";
import { formatActionDescription } from "#api_types/format_action_description";
import { getDisplayedDamage } from "#api_types/get_effective_damage";
import {
    getActiveMinionEffectNames,
    isMinionDescriptionLineDisabled,
} from "#api_types/get_minion_description_line_state";
import { Text } from "@mantine/core";
import { CardPreviewLink } from "./card_preview_link.jsx";
import "./card_faces.css";

const renderReconversionCardLabel = (
    description: string,
    cardLabel: string,
    card: PlayerCard,
    spellPower: number,
) => {
    const marker = ` en ${cardLabel}`;
    const markerIndex = description.lastIndexOf(marker);
    if (markerIndex === -1) {
        return description;
    }

    const before = description.slice(0, markerIndex + 4);
    const after = description.slice(markerIndex + marker.length);

    return (
        <>
            {before}
            <CardPreviewLink card={card} spellPower={spellPower}>
                {cardLabel}
            </CardPreviewLink>
            {after}
        </>
    );
};

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

    const reconversionCardId =
        action.type === "RECONVERSION" ? action.reconvertParameters?.cardId : null;
    const reconversionCard =
        reconversionCardId !== null && reconversionCardId !== undefined
            ? getCardPreviewById(reconversionCardId)
            : undefined;

    if (!hasSpellPowerBonus) {
        if (reconversionCard) {
            return renderReconversionCardLabel(
                description,
                reconversionCard.label,
                reconversionCard,
                spellPower,
            );
        }

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

const MinionDescription = ({
    card,
    isSilenced = false,
}: {
    card: MinionCard;
    isSilenced?: boolean;
}) => {
    const lines = getCardDescription(card).split("\n");
    const activeEffects = getActiveMinionEffectNames(card);

    return (
        <div className="card-description">
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
};

interface CardDetailContentProps {
    card: PlayerCard;
    spellPower?: number;
    isSilenced?: boolean;
}

export const CardDetailContent = ({ card, spellPower = 0, isSilenced }: CardDetailContentProps) => {
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
            ) : card.type === "MINION" ? (
                <Text size="sm" c="dimmed" mb={hasChips ? 8 : 0} component="div">
                    <MinionDescription card={card} isSilenced={isSilenced} />
                </Text>
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
