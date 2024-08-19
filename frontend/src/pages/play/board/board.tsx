import "./board.css";

import type { MinionSpotId } from "#api_types/game.types";

import clsx from "clsx";
import { toJS } from "mobx";
import { observer } from "mobx-react-lite";
import { useGameContext } from "~/hooks/use_game_state";
import type { GameStore } from "~/stores/GameStore";

const SPOTS: MinionSpotId[] = ["SPOT_1", "SPOT_2", "SPOT_3", "SPOT_4", "SPOT_5"];

export const Board = observer(() => {
    const { store } = useGameContext();

    return (
        <div className="flex flex-col h-full justify-center items-center">
            <div className="h-[300px] w-full flex justify-center items-center">
                {SPOTS.map((spotId) => (
                    <MinionSpot key={spotId} store={store} spotId={spotId} isOpponent />
                ))}
            </div>
            <div className="border-2 border-dashed w-full" />
            <div className="h-[300px] w-full flex justify-center items-center">
                {SPOTS.map((spotId) => (
                    <MinionSpot key={spotId} store={store} spotId={spotId} />
                ))}
            </div>
        </div>
    );
});

interface MinionSpotProps {
    store: GameStore;
    spotId: MinionSpotId;
    isOpponent?: boolean;
}

const MinionSpot = observer(({ store, isOpponent, spotId }: MinionSpotProps) => {
    const handleDrop = () => {
        const card = store.cardDragStore.cardDragged;
        if (!card) return;
        console.log(toJS(card));
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        const card = store.cardDragStore.cardDragged;

        if (!store.isMyTurn || !card) return;
        if (card.type !== "MINION") return;
        if (isOpponent) return;

        // authorize drag only for Minions (for now)
        e.preventDefault();
    };

    return (
        <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={clsx("minion-spot", "w-[120px] h-[150px] bg-red-100 border-dashed m-4")}
            style={{
                borderColor: isOpponent
                    ? store.cardDragStore.opponentSlotsBorderColor[spotId]
                    : store.cardDragStore.mySlotsBorderColor[spotId],
            }}
        />
    );
});
