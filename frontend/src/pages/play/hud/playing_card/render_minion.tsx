import type { MinionCard, MinionState, SpotOwner } from "#api_types/game.types";
import { observer } from "mobx-react-lite";
import type { CSSProperties } from "react";
import {
    getMinionAttackStatus,
    getMinionRemainingAttacks,
} from "~/helpers/minion_combat";
import { useGameContext } from "~/hooks/use_game_state";
import { CardDetailHover } from "./card_detail_hover.jsx";
import { MinionCardFace } from "./minion_card_face.jsx";

interface MinionToRenderProps {
    state: MinionState;
    spotOwner: SpotOwner;
    style?: CSSProperties;
}

const asMinionCard = (state: MinionState): MinionCard | null => {
    if (state.originalCard.type !== "MINION") return null;
    return state.originalCard;
};

export const RenderMinion = observer(({ state, spotOwner, style }: MinionToRenderProps) => {
    const { store } = useGameContext();
    const card = asMinionCard(state);
    if (!card) return null;

    const isOwnMinion = spotOwner === "PLAYER";
    const currentRound = store.game.data.currentRound;
    const attackStatus = getMinionAttackStatus(
        state,
        currentRound,
        isOwnMinion && store.isMyTurn,
    );
    const canAttack = attackStatus === "ready";
    const remainingAttacks = isOwnMinion
        ? getMinionRemainingAttacks(state, currentRound)
        : undefined;

    return (
        <MinionCardFace
            card={card}
            attack={state.attack}
            health={state.health}
            style={style}
            attackStatus={isOwnMinion ? attackStatus : undefined}
            remainingAttacks={remainingAttacks}
            draggable={canAttack}
            onDragStart={() => store.minionDragStore.setMinionDragged(state)}
            onDragEnd={() => store.minionDragStore.setMinionDragged(null)}
            wrapper={(content) => <CardDetailHover card={card}>{content}</CardDetailHover>}
        />
    );
});
