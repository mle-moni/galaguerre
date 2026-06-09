import { Button, Modal, Stack, Text } from "@mantine/core";
import clsx from "clsx";
import { observer } from "mobx-react-lite";
import { useGameContext } from "~/hooks/use_game_state";
import { emitSocketEventToServer } from "~/services/ws_client";
import { MinionCardFace } from "~/components/cards/minion_card_face";
import { SpellCardFace } from "~/components/cards/spell_card_face";
import { WeaponCardFace } from "~/components/cards/weapon_card_face";
import type { PlayerCard } from "#api_types/game.types";
import { CountdownTimer } from "../countdown_timer/countdown_timer.jsx";
import "./mulligan_overlay.css";

const renderCardFace = (card: PlayerCard) => {
    if (card.type === "MINION") {
        return <MinionCardFace card={card} attack={card.attack} health={card.health} />;
    }
    if (card.type === "SPELL") return <SpellCardFace card={card} />;
    return <WeaponCardFace card={card} />;
};

export const MulliganOverlay = observer(() => {
    const { store } = useGameContext();

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
                <Text size="sm" c="dimmed">
                    Sélectionnez les cartes à remplacer, puis confirmez. Le joueur qui commence
                    reçoit 3 cartes, l&apos;autre en reçoit 4.
                </Text>

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
                                            "mulligan-overlay__card--selected": isSelected,
                                        })}
                                        onClick={() => store.toggleMulliganCard(card.uuid)}
                                    >
                                        {renderCardFace(card)}
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
