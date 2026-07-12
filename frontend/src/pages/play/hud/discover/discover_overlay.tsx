import { Button, Modal, Stack, Text } from "@mantine/core";
import type { PlayerCard } from "#api_types/game.types";
import { IconEye, IconEyeOff } from "@tabler/icons-react";
import { observer } from "mobx-react-lite";
import { PlayerCardFace } from "~/components/cards/player_card_face";
import { useGameContext } from "~/hooks/use_game_state";
import { emitSocketEventToServer } from "~/services/ws_client";
import { play } from "~/cuelume/index";
import { CountdownTimer } from "../countdown_timer/countdown_timer.jsx";
import { TURN_TIMER_DISPLAY_OFFSET_SECONDS } from "../../play_game_constants.js";
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

export const DiscoverOverlay = observer(() => {
    const { store } = useGameContext();

    if (!store.isDiscoverChooser) return null;

    const pending = store.authoritativeGame.data.pendingDiscover;
    if (!pending) return null;

    const minimized = store.discoverOverlayMinimized;

    const handleChoose = (cardUuid: string) => {
        play("chime");
        emitSocketEventToServer("game:discover_choice", { cardUuid });
    };

    return (
        <Modal
            opened
            onClose={() => store.minimizeDiscoverOverlay()}
            withCloseButton={false}
            centered
            size="xl"
            title={minimized ? undefined : "Découverte"}
            withOverlay={!minimized}
            closeOnClickOutside={!minimized}
            trapFocus={!minimized}
            overlayProps={{ backgroundOpacity: 0.75 }}
            classNames={{
                root: minimized ? "discover-overlay__modal--minimized" : undefined,
                content: "discover-overlay__modal-content",
                header: minimized ? "discover-overlay__modal-header--hidden" : undefined,
            }}
        >
            <Stack gap="md">
                <div
                    className={minimized ? "discover-overlay__content--hidden" : undefined}
                    aria-hidden={minimized}
                >
                    <Text size="sm" c="dimmed" ta="center">
                        Choisissez une carte à ajouter à votre main.
                    </Text>

                    <CountdownTimer
                        endsAt={store.authoritativeGame.data.turnEndsAt}
                        displayOffsetSeconds={TURN_TIMER_DISPLAY_OFFSET_SECONDS}
                        label="Temps restant :"
                    />

                    <div className="discover-overlay__cards">
                        <DiscoverCardChoices
                            onChoose={handleChoose}
                            spellPower={store.me.spellPower}
                            options={pending.options}
                        />
                    </div>
                </div>

                <Button
                    variant={minimized ? "filled" : "default"}
                    color={minimized ? "yellow" : "gray"}
                    size={minimized ? "md" : "sm"}
                    className={minimized ? "discover-overlay__toggle-button--prominent" : undefined}
                    leftSection={minimized ? <IconEye size={18} /> : <IconEyeOff size={18} />}
                    onClick={() =>
                        minimized ? store.expandDiscoverOverlay() : store.minimizeDiscoverOverlay()
                    }
                    fullWidth
                >
                    {minimized ? "Afficher la découverte" : "Masquer"}
                </Button>
            </Stack>
        </Modal>
    );
});
