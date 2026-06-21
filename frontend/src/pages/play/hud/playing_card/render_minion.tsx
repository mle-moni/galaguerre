import type { MinionCard, MinionState, SpotOwner } from "#api_types/game.types";
import { observer } from "mobx-react-lite";
import type { CSSProperties, MouseEvent, PointerEvent, ReactNode } from "react";
import { BoardMinionToken } from "~/components/cards/board_minion_token";
import { findAuthoritativeMinion } from "~/helpers/combat_target_validation";
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
    const authoritativeMinion = isOwnMinion
        ? findAuthoritativeMinion(store, state.uuid)
        : undefined;
    const combatState = authoritativeMinion ?? state;
    const currentRound = store.authoritativeGame.data.currentRound;
    const attackStatus = getMinionAttackStatus(
        combatState,
        currentRound,
        isOwnMinion && store.isMyTurn,
    );
    const isReserved = isOwnMinion && store.combatActionQueue.isMinionReserved(state.uuid);
    const canAttack = attackStatus === "ready" && !isReserved;
    const isSelectingBattlecryOrSpellTarget = store.targetSelectionStore.isHighlightingTargets;
    const canStartAttack = canAttack && !isSelectingBattlecryOrSpellTarget;
    const remainingAttacks = isOwnMinion
        ? getMinionRemainingAttacks(combatState, currentRound)
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
        <CardDetailHover
            card={card}
            showDetailButton={isMobilePortrait}
            isSilenced={state.isSilenced === true}
        >
            {content}
        </CardDetailHover>
    );

    return (
        <BoardMinionToken
            card={card}
            attack={state.attack}
            health={state.health}
            style={style}
            attackStatus={isOwnMinion ? attackStatus : undefined}
            remainingAttacks={remainingAttacks}
            wrapper={wrapper}
            onPointerDown={canStartAttack ? handleAttackPointerDown : undefined}
            onClick={isMobilePortrait && canStartAttack ? handleAttackClick : undefined}
        />
    );
});
