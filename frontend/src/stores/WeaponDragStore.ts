import type { ActionTarget, BoardState, SpotOwner } from "#api_types/game.types";
import { canOpponentDirectlyTargetMinion } from "#api_types/target_matching";

import { makeAutoObservable } from "mobx";
import { canWeaponAttack } from "~/helpers/weapon_combat";
import { resolveTargetFromPoint } from "~/helpers/resolve_target_from_point";
import { emitSocketEventToServer } from "~/services/ws_client";
import { type SlotsBorderColor, buildSlotsBorderColor, spotsToSameColor } from "./CardDragStore.js";
import type { GameStore } from "./GameStore.js";
import type { TargetValidity } from "./TargetSelectionStore.js";
import type { MinionState } from "#api_types/game.types";

const getMinionHasTaunt = (minion: MinionState): boolean => {
    if (minion.originalCard.type !== "MINION") return false;
    return minion.originalCard.minionPowers?.hasTaunt ?? false;
};

const boardHasAttackableTaunt = (board: BoardState): boolean => {
    return board.some(
        (minion) => getMinionHasTaunt(minion) && canOpponentDirectlyTargetMinion(minion),
    );
};

export class WeaponDragStore {
    public isAttacking = false;

    constructor(protected gameStore: GameStore) {
        makeAutoObservable(this);
    }

    startAttack() {
        this.isAttacking = true;
    }

    cancelAttack() {
        this.isAttacking = false;
        this.gameStore.targetingArrowStore.endDrag();
    }

    get opponentSlotsBorderColor(): SlotsBorderColor {
        if (!this.isAttacking) return spotsToSameColor("black");

        return buildSlotsBorderColor((boardIndex) =>
            this.canAttack(boardIndex, "OPPONENT") ? "green" : "red",
        );
    }

    canAttackOnIndex(boardIndex: number, spotOwner: SpotOwner): boolean {
        const board =
            spotOwner === "PLAYER" ? this.gameStore.me.board : this.gameStore.opponent.board;
        return board[boardIndex] !== undefined;
    }

    canAttack(boardIndex: number | null, spotOwner: SpotOwner): boolean {
        if (!this.gameStore.isMyTurn) return false;
        if (!this.isAttacking) return false;

        const weaponState = this.gameStore.me.weaponState;
        if (!weaponState) return false;
        if (!canWeaponAttack(this.gameStore.me, weaponState, this.gameStore.game.data.currentRound))
            return false;

        if (spotOwner === "PLAYER") return false;

        const opponentBoard = this.gameStore.opponent.board;
        const hasAttackableTaunt = boardHasAttackableTaunt(opponentBoard);

        if (boardIndex === null) return !hasAttackableTaunt;

        if (!this.canAttackOnIndex(boardIndex, spotOwner)) return false;

        const targetMinion = opponentBoard[boardIndex];
        if (!targetMinion || !canOpponentDirectlyTargetMinion(targetMinion)) return false;

        if (!hasAttackableTaunt) return true;

        return getMinionHasTaunt(targetMinion);
    }

    canAttackByUuid(minionUuid: string | null, spotOwner: SpotOwner): boolean {
        if (minionUuid === null) {
            return this.canAttack(null, spotOwner);
        }

        const opponentBoard = this.gameStore.opponent.board;
        const boardIndex = opponentBoard.findIndex((entry) => entry.uuid === minionUuid);
        if (boardIndex === -1) return false;

        return this.canAttack(boardIndex, spotOwner);
    }

    canSelectTarget(actionTarget: ActionTarget): boolean {
        if (!this.isAttacking) return false;

        return this.canAttackByUuid(actionTarget.minionUuid, actionTarget.owner);
    }

    getTargetValidityAtPoint(x: number, y: number): TargetValidity {
        if (!this.isAttacking) return "none";

        const actionTarget = resolveTargetFromPoint(x, y);
        if (!actionTarget) return "none";

        return this.canSelectTarget(actionTarget) ? "valid" : "invalid";
    }

    confirmTarget(actionTarget: ActionTarget) {
        if (!this.isAttacking) return;

        if (!this.canSelectTarget(actionTarget)) {
            this.cancelAttack();
            return;
        }

        emitSocketEventToServer("game:weapon_action", {
            minionUuid: actionTarget.minionUuid,
            owner: actionTarget.owner,
        });

        this.isAttacking = false;
        this.gameStore.targetingArrowStore.endDrag();
    }

    getOpponentHeroBorderColor(isOpponent: boolean) {
        const transparent = "RGBa(0, 0, 0, 0)";

        if (!this.gameStore.isMyTurn || !this.isAttacking) return transparent;
        if (!isOpponent) return transparent;

        const weaponState = this.gameStore.me.weaponState;
        if (!weaponState) return transparent;
        if (!canWeaponAttack(this.gameStore.me, weaponState, this.gameStore.game.data.currentRound))
            return transparent;

        if (boardHasAttackableTaunt(this.gameStore.opponent.board)) return "red";

        return "green";
    }

    get canAttackWithWeapon(): boolean {
        if (!this.gameStore.isMyTurn) return false;

        const weaponState = this.gameStore.me.weaponState;
        if (!weaponState) return false;

        return canWeaponAttack(
            this.gameStore.me,
            weaponState,
            this.gameStore.game.data.currentRound,
        );
    }
}
