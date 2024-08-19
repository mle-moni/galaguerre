import "./board.css";

import type { PlayerCard } from "#api_types/game.types";

import clsx from "clsx";
import { observer } from "mobx-react-lite";
import { useIsMyTurn } from "~/hooks/use_game_state";

export const Board = observer(() => {
    const isMyTurn = useIsMyTurn();

    return (
        <div className="flex flex-col h-full justify-center items-center">
            <div className="h-[300px] w-full flex justify-center items-center">
                <MinionSpot isMyTurn={isMyTurn} />
                <MinionSpot isMyTurn={isMyTurn} />
                <MinionSpot isMyTurn={isMyTurn} />
                <MinionSpot isMyTurn={isMyTurn} />
                <MinionSpot isMyTurn={isMyTurn} />
            </div>
            <div className="border-2 border-dashed w-full" />
            <div className="h-[300px] w-full flex justify-center items-center">
                <MinionSpot isMyTurn={isMyTurn} />
                <MinionSpot isMyTurn={isMyTurn} />
                <MinionSpot isMyTurn={isMyTurn} />
                <MinionSpot isMyTurn={isMyTurn} />
                <MinionSpot isMyTurn={isMyTurn} />
            </div>
        </div>
    );
});

interface MinionSpotProps {
    isMyTurn: boolean;
}

const MinionSpot = observer(({ isMyTurn }: MinionSpotProps) => {
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        const card: PlayerCard | null = JSON.parse(e.dataTransfer?.getData("card") ?? null);

        if (!card) return;

        console.log(card);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        if (!isMyTurn) return;
        console.log(e.dataTransfer?.types);
        e.preventDefault();
    };

    return (
        <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={clsx("minion-spot", "w-[120px] h-[150px] bg-red-100 border-dashed m-4")}
        />
    );
});
