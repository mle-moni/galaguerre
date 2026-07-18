import { getMinionCardTemplateById } from "#api_types/card_preview";
import type { MinionCard } from "#api_types/game.types";
import { BoardMinionToken } from "~/components/cards/board_minion_token";
import { PlayerCardFace } from "~/components/cards/player_card_face";
import "~/pages/play/game_layout.css";
import "./golden_cards_page.css";

const NOUVELLE_RECRUE_ID = 181;

const withGolden = (card: MinionCard, isGolden: boolean): MinionCard => ({
    ...card,
    uuid: `${card.uuid}-${isGolden ? "golden" : "normal"}`,
    isGolden,
    goldenVideoUrl: card.goldenVideoUrl ?? "/card-videos/nouvelle-recrue-640.mp4",
});

export const GoldenCardsPage = () => {
    const base = getMinionCardTemplateById(NOUVELLE_RECRUE_ID);

    if (!base) {
        return (
            <div className="golden-cards-page">
                <p className="golden-cards-page__intro">Carte #181 Nouvelle Recrue introuvable.</p>
            </div>
        );
    }

    const normal = withGolden(base, false);
    const golden = withGolden(base, true);

    return (
        <div className="golden-cards-page">
            <p className="golden-cards-page__intro">
                Page de test temporaire — comparaison normal vs golden pour{" "}
                <strong>Nouvelle Recrue</strong> (#181). URL secrète :{" "}
                <code>/dev/golden-cards</code>.
            </p>

            <section className="golden-cards-page__section">
                <h2 className="golden-cards-page__title">Face carte (main / collection)</h2>
                <div className="golden-cards-page__row">
                    <div className="golden-cards-page__sample">
                        <span className="golden-cards-page__label">Normal</span>
                        <PlayerCardFace
                            card={normal}
                            attack={normal.attack}
                            health={normal.health}
                        />
                    </div>
                    <div className="golden-cards-page__sample">
                        <span className="golden-cards-page__label">Golden</span>
                        <PlayerCardFace
                            card={golden}
                            attack={golden.attack}
                            health={golden.health}
                        />
                    </div>
                </div>
            </section>

            <section className="golden-cards-page__section">
                <h2 className="golden-cards-page__title">Jeton plateau</h2>
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
            </section>
        </div>
    );
};
