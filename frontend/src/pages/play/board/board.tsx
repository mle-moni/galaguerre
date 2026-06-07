import "./board.css";

import type { MinionSpotId, SpotOwner } from "#api_types/game.types";

import clsx from "clsx";
import { observer } from "mobx-react-lite";
import { useGameContext } from "~/hooks/use_game_state";
import { useIsMobilePortrait } from "~/hooks/use_is_mobile_portrait";
import type { GameStore } from "~/stores/GameStore";
import { RenderMinion } from "../hud/playing_card/render_minion.jsx";

const SPOTS: MinionSpotId[] = ["SPOT_1", "SPOT_2", "SPOT_3", "SPOT_4", "SPOT_5"];

const MOBILE_ROWS_OPPONENT: MinionSpotId[][] = [
    ["SPOT_1", "SPOT_2", "SPOT_3"],
    ["SPOT_4", "SPOT_5"],
];

const MOBILE_ROWS_PLAYER: MinionSpotId[][] = [
    ["SPOT_4", "SPOT_5"],
    ["SPOT_1", "SPOT_2", "SPOT_3"],
];

const getMobileRows = (spotOwner: SpotOwner) =>
    spotOwner === "OPPONENT" ? MOBILE_ROWS_OPPONENT : MOBILE_ROWS_PLAYER;

export const Board = observer(() => {
    const isMobilePortrait = useIsMobilePortrait();

    return (
        <div className="flex flex-col h-full justify-center items-center min-h-0">
            <BoardSide spotOwner="OPPONENT" isMobilePortrait={isMobilePortrait} />
            <div className="board-divider border-2 border-dashed w-full flex-shrink-0" />
            <BoardSide spotOwner="PLAYER" isMobilePortrait={isMobilePortrait} />
        </div>
    );
});

interface BoardSideProps {
    spotOwner: SpotOwner;
    isMobilePortrait: boolean;
}

const BoardSide = ({ spotOwner, isMobilePortrait }: BoardSideProps) => {
    const { store } = useGameContext();

    if (isMobilePortrait) {
        const rows = getMobileRows(spotOwner);

        return (
            <div className="board-side board-side--compact flex-1 min-h-0 w-full">
                {rows.map((row, index) => (
                    <div
                        key={`${spotOwner}-row-${index}`}
                        className={clsx("board-row", row.length < 3 && "board-row--pair")}
                    >
                        {row.map((spotId) => (
                            <MinionSpot
                                key={spotId}
                                store={store}
                                spotId={spotId}
                                spotOwner={spotOwner}
                                compact
                            />
                        ))}
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="flex-1 min-h-0 w-full flex justify-center items-center">
            {SPOTS.map((spotId) => (
                <MinionSpot key={spotId} store={store} spotId={spotId} spotOwner={spotOwner} />
            ))}
        </div>
    );
};

interface MinionSpotProps {
    store: GameStore;
    spotId: MinionSpotId;
    spotOwner: SpotOwner;
    compact?: boolean;
}

const MinionSpot = observer(({ store, spotOwner, spotId, compact }: MinionSpotProps) => {
    const verb = spotOwner === "OPPONENT" ? "opponent" : "me";
    const minionToRender = store[verb].board[spotId];

    const handleClick = () => {
        store.handleDrop(spotId, spotOwner);
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        if (store.targetSelectionStore.isSelectingTarget) return;

        if (store.cardDragStore.cardDragged && spotId !== null) {
            store.cardDragStore.handleDrop(store.cardDragStore.cardDragged, spotId, spotOwner, {
                x: event.clientX,
                y: event.clientY,
            });
            store.cardDragStore.setCardDragged(null);
            return;
        }

        store.handleDrop(spotId, spotOwner);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        const card = store.cardDragStore.cardDragged;
        const isHighlightingTargets = store.targetSelectionStore.isHighlightingTargets;

        if (!card && !isHighlightingTargets) return;

        e.preventDefault();
    };

    return (
        <div
            data-target-zone
            data-spot-id={spotId}
            data-spot-owner={spotOwner}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={handleClick}
            className={clsx(
                "minion-spot bg-red-100 border-dashed",
                compact ? "minion-spot--compact" : "m-4",
            )}
            style={{
                borderColor: store.getMinionSpotBackgroundColor(spotId, spotOwner),
            }}
        >
            {minionToRender && <RenderMinion state={minionToRender} spotOwner={spotOwner} />}
        </div>
    );
});
