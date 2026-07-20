import { getCardPreviewById, getCollectibleCardTemplates } from "#api_types/card_preview";
import type { MinionCard, PlayerCard } from "#api_types/game.types";
import clsx from "clsx";
import { useState } from "react";
import { BoardMinionToken } from "~/components/cards/board_minion_token";
import { PlayerCardFace } from "~/components/cards/player_card_face";
import "~/pages/play/game_layout.css";
import "./golden_cards_page.css";

const DEFAULT_CARD_ID = 181;

const GOLDEN_CARD_OPTIONS = getCollectibleCardTemplates()
    .filter((card) => Boolean(card.goldenVideoUrl))
    .sort((a, b) => a.cardId - b.cardId);

const formatCardOptionLabel = (card: PlayerCard) => `#${card.cardId} — ${card.label}`;

const withGolden = (card: PlayerCard, isGolden: boolean): PlayerCard => ({
    ...card,
    uuid: `${card.uuid}-${isGolden ? "golden" : "normal"}`,
    isGolden,
});

interface BoardTokenSamplesProps {
    normal: MinionCard;
    golden: MinionCard;
    variant: "oval" | "rect";
    title: string;
}

const BoardTokenSamples = ({ normal, golden, variant, title }: BoardTokenSamplesProps) => (
    <div
        className={clsx(
            "golden-cards-page__variant",
            variant === "rect" && "board-minion-variant--rect",
        )}
    >
        <h3 className="golden-cards-page__subtitle">{title}</h3>
        <div className="golden-cards-page__row board-row--centered">
            <div className="golden-cards-page__sample">
                <span className="golden-cards-page__label">Normal</span>
                <BoardMinionToken
                    card={normal}
                    attack={normal.attack}
                    health={normal.health}
                    attackStatus="ready"
                />
            </div>
            <div className="golden-cards-page__sample">
                <span className="golden-cards-page__label">Golden</span>
                <BoardMinionToken
                    card={golden}
                    attack={golden.attack}
                    health={golden.health}
                    attackStatus="ready"
                />
            </div>
        </div>
    </div>
);

export const GoldenCardsPage = () => {
    const defaultCardId =
        GOLDEN_CARD_OPTIONS.find((card) => card.cardId === DEFAULT_CARD_ID)?.cardId ??
        GOLDEN_CARD_OPTIONS[0]?.cardId ??
        DEFAULT_CARD_ID;
    const [selectedCardId, setSelectedCardId] = useState(defaultCardId);

    if (GOLDEN_CARD_OPTIONS.length === 0) {
        return (
            <div className="golden-cards-page">
                <p className="golden-cards-page__intro">Aucune carte dorée disponible.</p>
            </div>
        );
    }

    const base = getCardPreviewById(selectedCardId);

    if (!base) {
        return (
            <div className="golden-cards-page">
                <p className="golden-cards-page__intro">Carte #{selectedCardId} introuvable.</p>
            </div>
        );
    }

    const normal = withGolden(base, false);
    const golden = withGolden(base, true);
    const minionBase = base.type === "MINION" ? base : undefined;
    const minionNormal = minionBase ? (withGolden(minionBase, false) as MinionCard) : undefined;
    const minionGolden = minionBase ? (withGolden(minionBase, true) as MinionCard) : undefined;

    return (
        <div className="golden-cards-page">
            <p className="golden-cards-page__intro">
                Page de test temporaire — comparaison normal vs golden. URL secrète :{" "}
                <code>/dev/golden-cards</code>.
            </p>

            <section className="golden-cards-page__section golden-cards-page__controls">
                <h2 className="golden-cards-page__title">Carte</h2>
                <label className="golden-cards-page__field">
                    <span className="golden-cards-page__field-label">Sélection</span>
                    <select
                        className="golden-cards-page__select"
                        value={selectedCardId}
                        onChange={(event) => setSelectedCardId(Number(event.target.value))}
                    >
                        {GOLDEN_CARD_OPTIONS.map((card) => (
                            <option key={card.cardId} value={card.cardId}>
                                {formatCardOptionLabel(card)}
                            </option>
                        ))}
                    </select>
                </label>
            </section>

            <section className="golden-cards-page__section">
                <h2 className="golden-cards-page__title">
                    Face carte (main / collection) — {base.label}
                </h2>
                <div className="golden-cards-page__row">
                    <div className="golden-cards-page__sample">
                        <span className="golden-cards-page__label">Normal</span>
                        <PlayerCardFace
                            card={normal}
                            attack={normal.type === "MINION" ? normal.attack : undefined}
                            health={normal.type === "MINION" ? normal.health : undefined}
                        />
                    </div>
                    <div className="golden-cards-page__sample">
                        <span className="golden-cards-page__label">Golden</span>
                        <PlayerCardFace
                            card={golden}
                            attack={golden.type === "MINION" ? golden.attack : undefined}
                            health={golden.type === "MINION" ? golden.health : undefined}
                        />
                    </div>
                </div>
            </section>

            <section className="golden-cards-page__section">
                <h2 className="golden-cards-page__title">Jeton plateau</h2>
                {minionNormal && minionGolden ? (
                    <>
                        <BoardTokenSamples
                            title="Ovale (mobile portrait)"
                            variant="oval"
                            normal={minionNormal}
                            golden={minionGolden}
                        />
                        <BoardTokenSamples
                            title="Rectangle (desktop)"
                            variant="rect"
                            normal={minionNormal}
                            golden={minionGolden}
                        />
                    </>
                ) : (
                    <p className="golden-cards-page__hint">
                        Les jetons plateau ne s&apos;appliquent qu&apos;aux cartes minion.
                    </p>
                )}
            </section>
        </div>
    );
};
