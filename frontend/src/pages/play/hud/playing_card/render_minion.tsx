import type { MinionCard, MinionState } from "#api_types/game.types";
import { observer } from "mobx-react-lite";
import type { CSSProperties } from "react";
import { useGameContext } from "~/hooks/use_game_state";
import { CardDetailHover } from "./card_detail_hover.jsx";
import { MinionCardFace } from "./minion_card_face.jsx";

interface MinionToRenderProps {
    state: MinionState;
    style?: CSSProperties;
}

const asMinionCard = (state: MinionState): MinionCard | null => {
    if (state.originalCard.type !== "MINION") return null;
    return state.originalCard;
};

export const RenderMinion = observer(({ state, style }: MinionToRenderProps) => {
    const { store } = useGameContext();
    const card = asMinionCard(state);
    if (!card) return null;

    return (
        <MinionCardFace
            card={card}
            attack={state.attack}
            health={state.health}
            style={style}
            className="cursor-pointer"
            draggable={store.isMyTurn}
            onDragStart={() => store.minionDragStore.setMinionDragged(state)}
            onDragEnd={() => store.minionDragStore.setMinionDragged(null)}
            wrapper={(content) => <CardDetailHover card={card}>{content}</CardDetailHover>}
        />
    );
});
