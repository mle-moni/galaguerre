import { Modal, Stack, Text } from "@mantine/core";
import { observer } from "mobx-react-lite";
import { PlayerCardFace } from "~/components/cards/player_card_face";
import { useGameContext } from "~/hooks/use_game_state";
import { emitSocketEventToServer } from "~/services/ws_client";
import { CountdownTimer } from "../countdown_timer/countdown_timer.jsx";
import "./discover_overlay.css";

export const DiscoverOverlay = observer(() => {
    const { store } = useGameContext();

    if (!store.isDiscoverChooser) return null;

    const pending = store.authoritativeGame.data.pendingDiscover;
    if (!pending) return null;

    const handleChoose = (cardUuid: string) => {
        emitSocketEventToServer("game:discover_choice", { cardUuid });
    };

    return (
        <Modal
            opened
            onClose={() => {}}
            withCloseButton={false}
            centered
            size="xl"
            title="Découverte"
            overlayProps={{ backgroundOpacity: 0.75 }}
            classNames={{ content: "discover-overlay__modal-content" }}
        >
            <Stack gap="md">
                <Text size="sm" c="dimmed" ta="center">
                    Choisissez une carte à ajouter à votre main.
                </Text>

                <CountdownTimer
                    endsAt={store.authoritativeGame.data.turnEndsAt}
                    label="Temps restant :"
                />

                <div className="discover-overlay__cards">
                    {pending.options.map((card) => (
                        <button
                            key={card.uuid}
                            type="button"
                            className="discover-overlay__card"
                            onClick={() => handleChoose(card.uuid)}
                            aria-label={`Choisir ${card.label}`}
                        >
                            <div className="discover-overlay__card-face">
                                <PlayerCardFace
                                    card={card}
                                    size="full"
                                    spellPower={store.me.spellPower}
                                    attack={card.type === "MINION" ? card.attack : undefined}
                                    health={card.type === "MINION" ? card.health : undefined}
                                />
                            </div>
                        </button>
                    ))}
                </div>
            </Stack>
        </Modal>
    );
});
