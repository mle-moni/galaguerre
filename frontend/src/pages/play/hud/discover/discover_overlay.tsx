import { Button, Modal, Stack, Text } from "@mantine/core";
import type { PlayerCard } from "#api_types/game.types";
import { IconChevronUp, IconEye } from "@tabler/icons-react";
import { observer } from "mobx-react-lite";
import { PlayerCardFace } from "~/components/cards/player_card_face";
import { useGameContext } from "~/hooks/use_game_state";
import { emitSocketEventToServer } from "~/services/ws_client";
import { CountdownTimer } from "../countdown_timer/countdown_timer.jsx";
import "./discover_overlay.css";

const DiscoverCardChoices = ({
    onChoose,
    spellPower,
    options,
}: {
    onChoose: (cardUuid: string) => void;
    spellPower: number;
    options: PlayerCard[];
}) => (
    <>
        {options.map((card) => (
            <button
                key={card.uuid}
                type="button"
                className="discover-overlay__card"
                onClick={() => onChoose(card.uuid)}
                aria-label={`Choisir ${card.label}`}
            >
                <div className="discover-overlay__card-face">
                    <PlayerCardFace
                        card={card}
                        size="full"
                        spellPower={spellPower}
                        attack={card.type === "MINION" ? card.attack : undefined}
                        health={card.type === "MINION" ? card.health : undefined}
                    />
                </div>
            </button>
        ))}
    </>
);

const DiscoverMinimizedBar = observer(() => {
    const { store } = useGameContext();

    if (!store.isDiscoverChooser || !store.discoverOverlayMinimized) return null;

    const pending = store.authoritativeGame.data.pendingDiscover;
    if (!pending) return null;

    const handleChoose = (cardUuid: string) => {
        emitSocketEventToServer("game:discover_choice", { cardUuid });
    };

    return (
        <div className="discover-overlay__minimized" role="region" aria-label="Découverte en cours">
            <div className="discover-overlay__minimized-header">
                <Text size="sm" fw={600}>
                    Découverte
                </Text>
                <CountdownTimer
                    endsAt={store.authoritativeGame.data.turnEndsAt}
                    label="Temps restant :"
                />
                <button
                    type="button"
                    className="discover-overlay__expand-button"
                    onClick={() => store.expandDiscoverOverlay()}
                    aria-label="Agrandir la découverte"
                >
                    <IconChevronUp size={18} aria-hidden />
                </button>
            </div>

            <div className="discover-overlay__minimized-cards">
                <DiscoverCardChoices
                    onChoose={handleChoose}
                    spellPower={store.me.spellPower}
                    options={pending.options}
                />
            </div>
        </div>
    );
});

export const DiscoverOverlay = observer(() => {
    const { store } = useGameContext();

    if (!store.isDiscoverChooser) return null;

    const pending = store.authoritativeGame.data.pendingDiscover;
    if (!pending) return null;

    const handleChoose = (cardUuid: string) => {
        emitSocketEventToServer("game:discover_choice", { cardUuid });
    };

    return (
        <>
            <DiscoverMinimizedBar />

            <Modal
                opened={!store.discoverOverlayMinimized}
                onClose={() => store.minimizeDiscoverOverlay()}
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
                        <DiscoverCardChoices
                            onChoose={handleChoose}
                            spellPower={store.me.spellPower}
                            options={pending.options}
                        />
                    </div>

                    <Button
                        variant="light"
                        color="gray"
                        leftSection={<IconEye size={18} />}
                        onClick={() => store.minimizeDiscoverOverlay()}
                        fullWidth
                    >
                        Voir le plateau
                    </Button>
                </Stack>
            </Modal>
        </>
    );
});
