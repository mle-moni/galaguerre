import "./board.css";

import type { MinionSpotId, SpotOwner } from "#api_types/game.types";

import clsx from "clsx";
import { observer } from "mobx-react-lite";
import { useGameContext } from "~/hooks/use_game_state";
import type { GameStore } from "~/stores/GameStore";
import { RenderMinion } from "../hud/playing_card/render_minion.jsx";

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
    const verb = spotOwner === "OPPONENT" ? "opponent" : "me";
    const minionToRender = store[verb].board[spotId];

    const handleDrop = () => {
        store.handleDrop(spotId, spotOwner);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        const card = store.cardDragStore.cardDragged || store.minionDragStore.minionDragged;

        if (!card) return;

        // authorize card drop
        e.preventDefault();
    };

    return (
        <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={clsx("minion-spot", "w-[126px] h-[156px] bg-red-100 border-dashed m-4")}
            style={{
                borderColor: store.getMinionSpotBackgroundColor(spotId, spotOwner),
            }}
        >
            {minionToRender && <RenderMinion state={minionToRender} />}
        </div>
    );
});
