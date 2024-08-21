import "./board.css";

import type { MinionSpotId, SpotOwner } from "#api_types/game.types";

import clsx from "clsx";
import { observer } from "mobx-react-lite";
import { useGameContext } from "~/hooks/use_game_state";
import { notifyError } from "~/services/toasts";
import { emitSocketEventToServer } from "~/services/ws_client";
import type { GameStore } from "~/stores/GameStore";

const SPOTS: MinionSpotId[] = ["SPOT_1", "SPOT_2", "SPOT_3", "SPOT_4", "SPOT_5"];

export const Board = observer(() => {
    const { store } = useGameContext();

    return (
        <div className="flex flex-col h-full justify-center items-center">
            <div className="h-[300px] w-full flex justify-center items-center">
                {SPOTS.map((spotId) => (
                    <MinionSpot key={spotId} store={store} spotId={spotId} spotOwner="OPPONENT" />
                ))}
            </div>
            <div className="border-2 border-dashed w-full" />
            <div className="h-[300px] w-full flex justify-center items-center">
                {SPOTS.map((spotId) => (
                    <MinionSpot key={spotId} store={store} spotId={spotId} spotOwner="PLAYER" />
                ))}
            </div>
        </div>
    );
});

interface MinionSpotProps {
    store: GameStore;
    spotId: MinionSpotId;
    spotOwner: SpotOwner;
}

const MinionSpot = observer(({ store, spotOwner, spotId }: MinionSpotProps) => {
    const handleDrop = () => {
        const card = store.cardDragStore.cardDragged;
        if (!card) return;

        const canPlayCard = store.cardDragStore.canPlayCard(spotId, card, spotOwner);

        if (!canPlayCard) {
            notifyError("Vous ne pouvez pas jouer cette carte ici");
            return;
        }

        emitSocketEventToServer("game:play_card", {
            cardId: card.uuid,
            spotId,
            owner: spotOwner,
        });
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        const card = store.cardDragStore.cardDragged;

        if (!card) return;

        // authorize card drop
        e.preventDefault();
    };

    return (
        <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={clsx("minion-spot", "w-[120px] h-[150px] bg-red-100 border-dashed m-4")}
            style={{
                borderColor:
                    spotOwner === "OPPONENT"
                        ? store.cardDragStore.opponentSlotsBorderColor[spotId]
                        : store.cardDragStore.mySlotsBorderColor[spotId],
            }}
        />
    );
});
