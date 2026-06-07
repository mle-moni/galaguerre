import type { MinionCard, MinionState, SpotOwner } from "#api_types/game.types";
import { observer } from "mobx-react-lite";
import type { CSSProperties, MouseEvent, PointerEvent, ReactNode } from "react";
import { BoardMinionToken } from "~/components/cards/board_minion_token";
import { MinionCardFace } from "~/components/cards/minion_card_face";
import { getMinionAttackStatus, getMinionRemainingAttacks } from "~/helpers/minion_combat";
import { useGameContext } from "~/hooks/use_game_state";
import { useIsMobilePortrait } from "~/hooks/use_is_mobile_portrait";
import { CardDetailHover } from "./card_detail_hover.jsx";

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
    const isMobilePortrait = useIsMobilePortrait();
    const card = asMinionCard(state);
    if (!card) return null;

    const isOwnMinion = spotOwner === "PLAYER";
    const currentRound = store.game.data.currentRound;
    const attackStatus = getMinionAttackStatus(state, currentRound, isOwnMinion && store.isMyTurn);
    const canAttack = attackStatus === "ready";
    const remainingAttacks = isOwnMinion
        ? getMinionRemainingAttacks(state, currentRound)
        : undefined;

    const disarmOtherModes = () => {
        store.targetSelectionStore.disarm();
        store.cardDragStore.clearMinionPlayHint();
        store.weaponDragStore.cancelAttack();
    };

    const handleAttackPointerDown = (event: PointerEvent<HTMLDivElement>) => {
        if (!canAttack) return;

        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);

        const rect = event.currentTarget.getBoundingClientRect();
        const origin = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
        };

        disarmOtherModes();
        store.minionDragStore.startAttack(state);
        store.targetingArrowStore.beginDrag(origin, { x: event.clientX, y: event.clientY });
    };

    const handleAttackClick = (event: MouseEvent<HTMLDivElement>) => {
        if (!canAttack) return;

        event.stopPropagation();

        if (store.minionDragStore.attackingMinion?.uuid === state.uuid) {
            store.minionDragStore.cancelAttack();
            return;
        }

        disarmOtherModes();
        store.minionDragStore.startAttack(state);
    };

    const wrapper = (content: ReactNode) => (
        <CardDetailHover card={card} showDetailButton={isMobilePortrait}>
            {content}
        </CardDetailHover>
    );

    const baseProps = {
        card,
        attack: state.attack,
        health: state.health,
        style,
        attackStatus: isOwnMinion ? attackStatus : undefined,
        remainingAttacks,
        wrapper,
    };

    if (isMobilePortrait) {
        return (
            <BoardMinionToken {...baseProps} onClick={canAttack ? handleAttackClick : undefined} />
        );
    }

    return (
        <MinionCardFace
            {...baseProps}
            onPointerDown={canAttack ? handleAttackPointerDown : undefined}
        />
    );
});
