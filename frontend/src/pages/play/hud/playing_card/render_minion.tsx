import { observer } from "mobx-react-lite";
import type { CSSProperties, MouseEvent, PointerEvent, ReactNode } from "react";
import { BoardMinionToken } from "~/components/cards/board_minion_token";
import { CardHoverPreview } from "~/components/cards/card_hover_preview";
import { CardMobilePreviewButton } from "~/components/cards/card_mobile_preview_button";
import { findAuthoritativeMinion } from "~/helpers/combat_target_validation";
import { getMinionAttackStatus, getMinionRemainingAttacks } from "~/helpers/minion_combat";
import { useDragClickSuppression } from "~/hooks/use_drag_click_suppression";
import { useGameContext } from "~/hooks/use_game_state";
import { useIsMobilePortrait } from "~/hooks/use_is_mobile_portrait";
import type { MinionCard, MinionState, SpotOwner } from "#api_types/game.types";

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
    const dragClickSuppression = useDragClickSuppression();
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

    const handleAttackPointerDown = (event: PointerEvent<HTMLDivElement>) => {
        if (!canAttack) return;

        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        dragClickSuppression.begin(event);

        const rect = event.currentTarget.getBoundingClientRect();
        const origin = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
        };

        store.minionDragStore.startAttack(state);
        store.targetingArrowStore.beginDrag(origin, { x: event.clientX, y: event.clientY });
    };

    const handleAttackPointerMove = (event: PointerEvent<HTMLDivElement>) => {
        if (!isMobilePortrait) return;
        dragClickSuppression.track(event);
    };

    const handleAttackPointerUp = () => {
        dragClickSuppression.finish();
    };

    const handleAttackPointerCancel = () => {
        dragClickSuppression.reset();
        store.minionDragStore.cancelAttack();
    };

    const handleAttackClick = (event: MouseEvent<HTMLDivElement>) => {
        if (dragClickSuppression.consumeClickSuppression()) {
            event.stopPropagation();
            return;
        }

        if (!canAttack) return;

        event.stopPropagation();

        if (store.minionDragStore.attackingMinion?.uuid === state.uuid) {
            store.minionDragStore.cancelAttack();
            return;
        }

        store.minionDragStore.startAttack(state);
    };

    const wrapper = (content: ReactNode) => {
        if (isMobilePortrait) {
            return (
                <CardMobilePreviewButton
                    card={card}
                    spellPower={store.me.spellPower}
                    showDetailButton
                    minionState={state}
                >
                    {content}
                </CardMobilePreviewButton>
            );
        }

        return (
            <CardHoverPreview
                card={card}
                spellPower={store.me.spellPower}
                disabled={store.isCardHoverPreviewDisabled}
                isSilenced={state.isSilenced === true}
                attack={state.attack}
                health={state.health}
            >
                {content}
            </CardHoverPreview>
        );
    };

    return (
        <BoardMinionToken
            card={card}
            attack={state.attack}
            health={state.health}
            style={style}
            attackStatus={isOwnMinion ? attackStatus : undefined}
            remainingAttacks={remainingAttacks}
            isSilenced={state.isSilenced === true}
            wrapper={wrapper}
            onPointerDown={canStartAttack ? handleAttackPointerDown : undefined}
            onPointerMove={canStartAttack ? handleAttackPointerMove : undefined}
            onPointerUp={canStartAttack ? handleAttackPointerUp : undefined}
            onPointerCancel={canStartAttack ? handleAttackPointerCancel : undefined}
            onClick={isMobilePortrait && canStartAttack ? handleAttackClick : undefined}
        />
    );
});
