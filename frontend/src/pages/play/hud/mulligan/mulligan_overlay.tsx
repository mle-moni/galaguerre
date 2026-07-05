import { Modal } from "@mantine/core";
import clsx from "clsx";
import { observer } from "mobx-react-lite";
import { CoinCardLink } from "~/components/cards/coin_card_link";
import { PlayerCardFace } from "~/components/cards/player_card_face";
import { useGameContext } from "~/hooks/use_game_state";
import { useOnboardingGame } from "~/hooks/use_onboarding_game";
import { emitSocketEventToServer } from "~/services/ws_client";
import { CountdownTimer } from "../countdown_timer/countdown_timer.jsx";
import "./mulligan_overlay.css";

export const MulliganOverlay = observer(() => {
    const { store } = useGameContext();
    const isOnboardingGame = useOnboardingGame();

    if (!store.isMulligan) return null;

    const selectedCount = store.mulliganSelectedCardIds.length;

    const handleConfirm = () => {
        emitSocketEventToServer("game:mulligan", {
            cardIds: store.mulliganSelectedCardIds.slice(),
        });
        store.confirmMulliganLocally();
    };

    const handleKeepAll = () => {
        emitSocketEventToServer("game:mulligan", { cardIds: [] });
        store.confirmMulliganLocally();
    };

    return (
        <Modal
            opened
            onClose={() => {}}
            withCloseButton={false}
            centered
            size="xl"
            title={undefined}
            overlayProps={{ backgroundOpacity: 0.75 }}
            classNames={{
                inner: "mulligan-overlay__modal-inner",
                content: "mulligan-overlay__modal-content",
                header: "mulligan-overlay__modal-header",
                body: "mulligan-overlay__modal-body",
            }}
        >
            <div className="mulligan-overlay__panel">
                <div className="mulligan-overlay__corners" aria-hidden="true" />
                <span className="mulligan-overlay__gem" aria-hidden="true" />
                <span className="mulligan-overlay__badge">Mulligan</span>

                <header className="mulligan-overlay__header">
                    <p className="mulligan-overlay__title">
                        {store.goesFirst ? (
                            "Vous commencez"
                        ) : (
                            <>
                                Votre adversaire commence — vous recevez{" "}
                                <CoinCardLink>un Ticket Restaurant</CoinCardLink> en contrepartie
                            </>
                        )}
                    </p>

                    <p className="mulligan-overlay__subtitle">
                        Choisissez les cartes à échanger. Les cartes sélectionnées seront remplacées
                        au début de la partie.
                    </p>

                    {isOnboardingGame ? (
                        <p className="mulligan-overlay__tip">
                            Conseil : gardez les cartes à 1 mana (Stagiaire Dev) ; échangez les
                            cartes à 3+ mana que vous ne pouvez pas jouer ce tour.
                        </p>
                    ) : null}

                    <div className="mulligan-overlay__timer">
                        <CountdownTimer
                            endsAt={store.authoritativeGame.data.mulliganEndsAt}
                            label="Temps restant :"
                        />
                    </div>
                </header>

                {store.hasConfirmedMulligan ? (
                    <p className="mulligan-overlay__waiting">En attente de l&apos;adversaire…</p>
                ) : (
                    <>
                        <div className="mulligan-overlay__cards">
                            {store.authoritativeMe.hand.map((card) => {
                                const isSelected = store.mulliganSelectedCardIds.includes(
                                    card.uuid,
                                );

                                return (
                                    <button
                                        key={card.uuid}
                                        type="button"
                                        className={clsx("mulligan-overlay__card", {
                                            "mulligan-overlay__card--discarded": isSelected,
                                        })}
                                        onClick={() => store.toggleMulliganCard(card.uuid)}
                                        aria-pressed={isSelected}
                                        aria-label={
                                            isSelected ? `${card.label}, à remplacer` : card.label
                                        }
                                    >
                                        {isSelected ? (
                                            <span className="mulligan-overlay__replace-banner">
                                                À remplacer
                                            </span>
                                        ) : null}
                                        <div className="mulligan-overlay__card-face">
                                            <PlayerCardFace
                                                card={card}
                                                size="full"
                                                spellPower={store.me.spellPower}
                                                attack={
                                                    card.type === "MINION" ? card.attack : undefined
                                                }
                                                health={
                                                    card.type === "MINION" ? card.health : undefined
                                                }
                                            />
                                        </div>
                                        {isSelected ? (
                                            <div
                                                className="mulligan-overlay__discard-mark"
                                                aria-hidden
                                            />
                                        ) : null}
                                    </button>
                                );
                            })}
                        </div>

                        <footer className="mulligan-overlay__footer">
                            <div className="mulligan-overlay__count-divider">
                                <span>
                                    — {selectedCount} carte{selectedCount !== 1 ? "s" : ""} à
                                    remplacer —
                                </span>
                            </div>

                            <div className="mulligan-overlay__actions">
                                <button
                                    type="button"
                                    className="mulligan-overlay__confirm-btn"
                                    onClick={handleConfirm}
                                >
                                    <span className="mulligan-overlay__confirm-btn-gem mulligan-overlay__confirm-btn-gem--left" />
                                    Confirmer
                                    <span className="mulligan-overlay__confirm-btn-gem mulligan-overlay__confirm-btn-gem--right" />
                                </button>
                                <button
                                    type="button"
                                    className="mulligan-overlay__keep-all-btn"
                                    onClick={handleKeepAll}
                                >
                                    Tout garder
                                </button>
                            </div>
                        </footer>
                    </>
                )}
            </div>
        </Modal>
    );
});
