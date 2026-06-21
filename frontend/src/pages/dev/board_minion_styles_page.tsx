import { getMinionCardTemplateById } from "#api_types/card_preview";
import { getMinionPowerEffects } from "#api_types/get_minion_power_effects";
import type { MinionCard } from "#api_types/game.types";
import clsx from "clsx";
import { BoardMinionToken } from "~/components/cards/board_minion_token";
import { AppLayout } from "~/components/layout/app_layout";
import "~/pages/play/game_layout.css";
import "./board_minion_styles_page.css";

const SAMPLE_CARD_IDS = [62, 63, 64, 65, 66, 113] as const;

const SAMPLE_STATUSES = [
    { label: "Prêt", attackStatus: "ready" as const },
    { label: "Endormi", attackStatus: "sleeping" as const },
    { label: "Épuisé", attackStatus: "exhausted" as const },
] as const;

const getToxicDeathrattleSample = (): MinionCard | undefined => {
    const toxic = getMinionCardTemplateById(66);
    const deathrattle = getMinionCardTemplateById(64);
    if (!toxic || !deathrattle) return undefined;

    const minionPowers = { ...toxic.minionPowers, isPoisonous: true };

    return {
        ...toxic,
        uuid: "preview-toxic-deathrattle",
        label: "Toxique + Dernier souffle",
        minionPowers,
        effects: getMinionPowerEffects(minionPowers),
        deathrattleActions: deathrattle.deathrattleActions,
    };
};

const getSampleCards = (): MinionCard[] => {
    const cards = SAMPLE_CARD_IDS.map((id) => getMinionCardTemplateById(id)).filter(
        (card): card is MinionCard => card !== undefined,
    );

    const toxicDeathrattle = getToxicDeathrattleSample();
    if (toxicDeathrattle) {
        cards.push(toxicDeathrattle);
    }

    return cards;
};

interface StyleSectionProps {
    title: string;
    description: string;
    variant: "oval" | "rect";
    cards: MinionCard[];
}

const StyleSection = ({ title, description, variant, cards }: StyleSectionProps) => (
    <section
        className={clsx(
            "board-minion-styles__section",
            variant === "rect" && "board-minion-variant--rect",
        )}
    >
        <h2 className="board-minion-styles__title">{title}</h2>
        <p className="board-minion-styles__description">{description}</p>

        <div className="board-minion-styles__row board-row--centered">
            {cards.map((card) => (
                <BoardMinionToken
                    key={card.uuid}
                    card={card}
                    attack={card.attack}
                    health={card.health}
                />
            ))}
        </div>

        <div className="board-minion-styles__status-grid">
            {SAMPLE_STATUSES.map(({ label, attackStatus }) => {
                const card = cards[0];
                if (!card) return null;

                return (
                    <div key={attackStatus} className="board-minion-styles__status-item">
                        <span className="board-minion-styles__status-label">{label}</span>
                        <BoardMinionToken
                            card={card}
                            attack={card.attack}
                            health={card.health}
                            attackStatus={attackStatus}
                            remainingAttacks={attackStatus === "ready" ? 1 : 0}
                        />
                    </div>
                );
            })}
        </div>
    </section>
);

export const BoardMinionStylesPage = () => {
    const cards = getSampleCards();

    return (
        <AppLayout title="Styles minions plateau" backTo="/" backLabel="Accueil">
            <div className="board-minion-styles">
                <p className="board-minion-styles__intro">
                    Comparaison des jetons minion sur le plateau. La variante rectangle utilise le
                    ratio d&apos;image natif des cartes (8:5) avec <code>object-fit: contain</code>.
                </p>
                <p className="board-minion-styles__intro">
                    En partie, le mode rectangle est actif par défaut sur desktop ; le mode ovale
                    reste utilisé sur mobile portrait. Forcer un mode :{" "}
                    <code>?boardMinion=rect</code> ou <code>?boardMinion=oval</code>.
                </p>

                <StyleSection
                    title="Ovale (actuel)"
                    description="Forme elliptique, image recadrée pour remplir la zone."
                    variant="oval"
                    cards={cards}
                />

                <StyleSection
                    title="Rectangle 8:5 (test)"
                    description="Forme rectangulaire, image affichée dans son ratio d'origine."
                    variant="rect"
                    cards={cards}
                />
            </div>
        </AppLayout>
    );
};
