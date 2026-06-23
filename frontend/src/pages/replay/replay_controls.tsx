import { ActionIcon, Button, Group, Slider, Text } from "@mantine/core";
import {
    IconPlayerPause,
    IconPlayerPlay,
    IconPlayerSkipBack,
    IconPlayerSkipForward,
} from "@tabler/icons-react";
import { observer } from "mobx-react-lite";
import type { ApiGameReplay } from "#api_types/game_replay.types";
import type { ReplayStore } from "~/stores/ReplayStore";

interface ReplayControlsProps {
    store: ReplayStore;
    replay: ApiGameReplay;
    onSwitchPerspective: (userId: number) => void;
}

export const ReplayControls = observer(
    ({ store, replay, onSwitchPerspective }: ReplayControlsProps) => {
        const maxIndex = store.maxStepIndex;
        const marks =
            maxIndex <= 20
                ? Array.from({ length: maxIndex + 1 }, (_, index) => ({ value: index }))
                : undefined;

        return (
            <div className="replay-controls gg-panel p-4 min-w-0 w-full max-w-full overflow-hidden shrink-0">
                <Text size="sm" fw={600} className="mb-2 text-center line-clamp-2">
                    {store.getStepLabel(store.stepIndex)} ({store.stepIndex}/{maxIndex})
                </Text>

                <div className="min-w-0 overflow-hidden px-1 mb-4">
                    <Slider
                        value={store.stepIndex}
                        onChange={(value) => store.seekTo(value)}
                        min={0}
                        max={maxIndex}
                        step={1}
                        marks={marks}
                        label={(value) => store.getStepLabel(value)}
                    />
                </div>

                <Group justify="center" gap="sm" wrap="wrap" className="min-w-0">
                    <ActionIcon
                        variant="light"
                        size="lg"
                        aria-label="Reculer"
                        onClick={() => store.stepBackward()}
                        disabled={store.stepIndex <= 0}
                    >
                        <IconPlayerSkipBack size={20} />
                    </ActionIcon>

                    {store.isPlaying ? (
                        <ActionIcon
                            variant="filled"
                            size="xl"
                            aria-label="Pause"
                            onClick={() => store.pause()}
                        >
                            <IconPlayerPause size={24} />
                        </ActionIcon>
                    ) : (
                        <ActionIcon
                            variant="filled"
                            size="xl"
                            aria-label="Lecture"
                            onClick={() => store.play()}
                            disabled={store.stepIndex >= maxIndex}
                        >
                            <IconPlayerPlay size={24} />
                        </ActionIcon>
                    )}

                    <ActionIcon
                        variant="light"
                        size="lg"
                        aria-label="Avancer"
                        onClick={() => void store.stepForward()}
                        disabled={store.stepIndex >= maxIndex}
                    >
                        <IconPlayerSkipForward size={20} />
                    </ActionIcon>

                    <Button
                        variant="light"
                        size="compact-sm"
                        className="max-w-full"
                        onClick={() => {
                            const nextPerspective =
                                store.perspectiveUserId === replay.playerOne.userId
                                    ? replay.playerTwo.userId
                                    : replay.playerOne.userId;
                            onSwitchPerspective(nextPerspective);
                        }}
                    >
                        POV :{" "}
                        {store.perspectiveUserId === replay.playerOne.userId
                            ? replay.playerOne.pseudo ?? `Joueur ${replay.playerOne.userId}`
                            : replay.playerTwo.pseudo ?? `Joueur ${replay.playerTwo.userId}`}
                    </Button>
                </Group>
            </div>
        );
    },
);
