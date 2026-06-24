import { Button, Modal, Stack, Text } from "@mantine/core";
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

    const handleConfirm = () => {
        emitSocketEventToServer("game:mulligan", {
            cardIds: store.mulliganSelectedCardIds.slice(),
        });
        store.confirmMulliganLocally();
    };

    return (
        <Modal
            opened
            onClose={() => {}}
            withCloseButton={false}
            centered
            size="xl"
            title="Mulligan"
            overlayProps={{ backgroundOpacity: 0.75 }}
            classNames={{ content: "mulligan-overlay__modal-content" }}
        >
            <Stack gap="md">
                <Text ta="center" fw={600} component="div">
                    {store.goesFirst ? (
                        "Vous commencez"
                    ) : (
                        <>
                            Votre adversaire commence, vous recevrez{" "}
                            <CoinCardLink>un Ticket Restaurant</CoinCardLink> en contrepartie
                        </>
                    )}
                </Text>

                <Text size="sm" c="dimmed">
                    Cliquez sur les cartes à échanger — elles seront barrées en rouge.
                </Text>

                {isOnboardingGame ? (
                    <Text size="sm" c="dimmed">
                        Conseil : gardez les cartes à 1 mana (Stagiaire Dev) ; échangez les cartes à
                        3+ mana que vous ne pouvez pas jouer ce tour.
                    </Text>
                ) : null}

                <CountdownTimer
                    endsAt={store.authoritativeGame.data.mulliganEndsAt}
                    label="Temps restant :"
                />

                {store.hasConfirmedMulligan ? (
                    <Text ta="center" fw={600}>
                        En attente de l&apos;adversaire...
                    </Text>
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

                        <Text size="sm" ta="center">
                            {store.mulliganSelectedCardIds.length} carte(s) à remplacer
                        </Text>

                        <Button fullWidth onClick={handleConfirm}>
                            Confirmer
                        </Button>
                    </>
                )}
            </Stack>
        </Modal>
    );
});
