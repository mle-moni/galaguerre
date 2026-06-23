import { Button, Modal, Stack, Text } from "@mantine/core";
import clsx from "clsx";
import { observer } from "mobx-react-lite";
import type { ReactNode } from "react";
import { CoinCardLink } from "~/components/cards/coin_card_link";
import { useGameContext } from "~/hooks/use_game_state";
import { useOnboardingGame } from "~/hooks/use_onboarding_game";
import { emitSocketEventToServer } from "~/services/ws_client";
import { MinionCardFace } from "~/components/cards/minion_card_face";
import { SpellCardFace } from "~/components/cards/spell_card_face";
import { WeaponCardFace } from "~/components/cards/weapon_card_face";
import type { PlayerCard } from "#api_types/game.types";
import { CountdownTimer } from "../countdown_timer/countdown_timer.jsx";
import { CardDetailHover } from "../playing_card/card_detail_hover.jsx";
import "./mulligan_overlay.css";

const renderCardFace = (card: PlayerCard) => {
    const wrapper = (content: ReactNode) => (
        <CardDetailHover card={card} showDetailButton>
            {content}
        </CardDetailHover>
    );

    if (card.type === "MINION") {
        return (
            <MinionCardFace
                card={card}
                attack={card.attack}
                health={card.health}
                wrapper={wrapper}
            />
        );
    }
    if (card.type === "SPELL") return <SpellCardFace card={card} wrapper={wrapper} />;
    return <WeaponCardFace card={card} wrapper={wrapper} />;
};

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
            size="lg"
            title="Mulligan"
            overlayProps={{ backgroundOpacity: 0.75 }}
        >
            <Stack gap="md">
                <Text ta="center" fw={600}>
                    {store.goesFirst ? (
                        "Vous commencez"
                    ) : (
                        <>
                            Votre adversaire commence, vous recevrez{" "}
                            <CoinCardLink>La Pièce</CoinCardLink> en contrepartie
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

                <CountdownTimer endsAt={store.game.data.mulliganEndsAt} label="Temps restant :" />

                {store.hasConfirmedMulligan ? (
                    <Text ta="center" fw={600}>
                        En attente de l&apos;adversaire...
                    </Text>
                ) : (
                    <>
                        <div className="mulligan-overlay__cards">
                            {store.me.hand.map((card) => {
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
                                            {renderCardFace(card)}
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
