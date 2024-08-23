import type { MinionState } from "#api_types/game.types";
import { Image } from "@mantine/core";
import clsx from "clsx";
import { observer } from "mobx-react-lite";
import type { CSSProperties } from "react";
import { useGameContext } from "~/hooks/use_game_state";

interface MinionToRenderProps {
    state: MinionState;
    style?: CSSProperties;
}

export const RenderMinion = observer(({ state, style }: MinionToRenderProps) => {
    const { store } = useGameContext();

    return (
        <div
            key={state.uuid}
            style={style}
            className={clsx("w-[120px] h-[150px] rounded bg-[#1e3a5f] cursor-pointer")}
            draggable={store.isMyTurn}
            // onDragStart={() => {
            //     store.cardDragStore.setCardDragged(card);
            // }}
            // onDragEnd={() => {
            //     store.cardDragStore.setCardDragged(null);
            // }}
        >
            <div>
                <div className="cost">{state.originalCard.cost}</div>
                <Image
                    className="rounded-t"
                    src={state.originalCard.imageUrl}
                    height={75}
                    alt="Galaguerre card"
                    draggable={false}
                />
            </div>
            <div className="flex flex-col h-[75px] justify-around">
                <p className="text-center text-white m-0">{state.originalCard.label}</p>
                <div className="flex justify-between mx-1">
                    <div className="attack">{state.attack}</div>
                    <div className="health">{state.health}</div>
                </div>
            </div>
        </div>
    );
});
