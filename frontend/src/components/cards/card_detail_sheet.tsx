import { Modal } from "@mantine/core";
import { EFFECT_SYMBOLS } from "#api_types/card_keyword_glossary";
import type { MinionCard, MinionState, PlayerCard } from "#api_types/game.types";
import { getMinionPowerEffects } from "#api_types/get_minion_power_effects";
import { PlayerCardFace } from "./player_card_face.jsx";

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
    } else {
        for (const effect of getMinionPowerEffects(card.minionPowers)) {
            effects.push({
                key: `keyword-${effect}`,
                symbol: EFFECT_SYMBOLS[effect] ?? "✦",
                label: effect,
            });
        }
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
            centered
            title={card.label}
            withinPortal
            closeOnClickOutside
            closeButtonProps={{ "aria-label": "Fermer le détail de la carte" }}
            overlayProps={{ backgroundOpacity: 0.82, blur: 3 }}
            classNames={{
                content: "card-preview-sheet-content",
                header: "card-preview-sheet-header",
                body: "card-preview-sheet-body",
                overlay: "card-preview-sheet-overlay",
            }}
        >
            <div
                className={`card-preview-sheet__layout${showActiveEffects ? " card-preview-sheet__layout--with-effects" : ""}`}
            >
                <div className="card-preview-sheet__face">
                    <PlayerCardFace
                        card={card}
                        size="full"
                        spellPower={spellPower}
                        isSilenced={displayedSilenced}
                        attack={displayedAttack}
                        health={displayedHealth}
                    />
                </div>
                {showActiveEffects && <ActiveEffects card={card} state={minionState} />}
            </div>
        </Modal>
    );
};
