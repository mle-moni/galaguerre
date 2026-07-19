import { Modal } from "@mantine/core";
import { EFFECT_SYMBOLS } from "#api_types/card_keyword_glossary";
import type { MinionCard, MinionState, PlayerCard } from "#api_types/game.types";
import { getMinionPowerEffects } from "#api_types/get_minion_power_effects";
import { CardInspectStage } from "./card_inspect_stage.jsx";
import { PlayerCardFace } from "./player_card_face.jsx";
import "./card_inspect_stage.css";

interface CardDetailSheetProps {
    card: PlayerCard;
    spellPower?: number;
    opened: boolean;
    onClose: () => void;
    isSilenced?: boolean;
    attack?: number;
    health?: number;
    minionState?: MinionState;
}

interface ActiveEffect {
    key: string;
    symbol: string;
    label: string;
    tone?: "positive" | "negative";
}

const formatDelta = (value: number) => (value > 0 ? `+${value}` : String(value));

const getActiveEffects = (card: MinionCard, state: MinionState): ActiveEffect[] => {
    const effects: ActiveEffect[] = [];
    const attackDelta = state.attack - card.attack;
    const maxHealthDelta = state.maxHealth - card.health;
    const damageTaken = state.maxHealth - state.health;

    if (attackDelta !== 0) {
        effects.push({
            key: "attack",
            symbol: "⚔️",
            label: `Attaque ${formatDelta(attackDelta)}`,
            tone: attackDelta > 0 ? "positive" : "negative",
        });
    }

    if (maxHealthDelta !== 0) {
        effects.push({
            key: "health",
            symbol: "♥",
            label: `Vie max. ${formatDelta(maxHealthDelta)}`,
            tone: maxHealthDelta > 0 ? "positive" : "negative",
        });
    }

    if (damageTaken > 0) {
        effects.push({
            key: "damaged",
            symbol: "🩸",
            label: `${damageTaken} dégât${damageTaken > 1 ? "s" : ""} subi${damageTaken > 1 ? "s" : ""}`,
            tone: "negative",
        });
    }

    if (state.isSilenced) {
        effects.push({
            key: "silenced",
            symbol: "🔇",
            label: "Réduit au silence",
            tone: "negative",
        });
    }

    for (const effect of getMinionPowerEffects(card.minionPowers)) {
        effects.push({
            key: `keyword-${effect}`,
            symbol: EFFECT_SYMBOLS[effect] ?? "✦",
            label: effect,
        });
    }

    return effects;
};

const ActiveEffects = ({ card, state }: { card: MinionCard; state: MinionState }) => {
    const effects = getActiveEffects(card, state);

    return (
        <aside className="card-preview-effects" aria-label="Effets actifs">
            <div className="card-preview-effects__heading">
                <span aria-hidden="true">✦</span>
                <span>Effets actifs</span>
            </div>
            {effects.length > 0 ? (
                <ul className="card-preview-effects__list">
                    {effects.map((effect) => (
                        <li
                            key={effect.key}
                            className={`card-preview-effects__item${effect.tone ? ` card-preview-effects__item--${effect.tone}` : ""}`}
                        >
                            <span className="card-preview-effects__symbol" aria-hidden="true">
                                {effect.symbol}
                            </span>
                            <span>{effect.label}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="card-preview-effects__empty">Aucun effet actif</p>
            )}
        </aside>
    );
};

export const CardDetailSheet = ({
    card,
    spellPower = 0,
    opened,
    onClose,
    isSilenced,
    attack,
    health,
    minionState,
}: CardDetailSheetProps) => {
    const showActiveEffects = card.type === "MINION" && minionState !== undefined;
    const displayedAttack = minionState?.attack ?? attack;
    const displayedHealth = minionState?.health ?? health;
    const displayedSilenced = minionState?.isSilenced ?? isSilenced;

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            withCloseButton={false}
            fullScreen
            padding={0}
            centered
            withinPortal
            closeOnClickOutside
            transitionProps={{ transition: "fade", duration: 220 }}
            overlayProps={{ backgroundOpacity: 0.72, blur: 10 }}
            classNames={{
                content: "card-inspect-overlay",
                body: "card-inspect-overlay__body",
                inner: "card-inspect-overlay__inner",
            }}
        >
            <CardInspectStage
                key={`${card.uuid}-${card.isGolden ? "g" : "n"}`}
                label={card.label}
                rarity={card.rarity}
                isGolden={card.isGolden}
                onClose={onClose}
                sideContent={
                    showActiveEffects ? (
                        <ActiveEffects card={card} state={minionState} />
                    ) : undefined
                }
            >
                <PlayerCardFace
                    card={card}
                    size="full"
                    spellPower={spellPower}
                    isSilenced={displayedSilenced}
                    attack={displayedAttack}
                    health={displayedHealth}
                />
            </CardInspectStage>
        </Modal>
    );
};
