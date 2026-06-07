import type {
    ActionTarget,
    BoardState,
    MinionSpotId,
    MinionState,
    SpotOwner,
} from "#api_types/game.types";
import { MINION_SPOT_IDS } from "#api_types/game.types";

import { makeAutoObservable } from "mobx";
import { canWeaponAttack } from "~/helpers/weapon_combat";
import { resolveTargetFromPoint } from "~/helpers/resolve_target_from_point";
import { emitSocketEventToServer } from "~/services/ws_client";
import { type SlotsBorderColor, spotsToSameColor } from "./CardDragStore.js";
import type { GameStore } from "./GameStore.js";
import type { TargetValidity } from "./TargetSelectionStore.js";

const getMinionHasTaunt = (minion: MinionState): boolean => {
    if (minion.originalCard.type !== "MINION") return false;
    return minion.originalCard.hasTaunt ?? false;
};

const boardHasTaunt = (board: BoardState): boolean => {
    return MINION_SPOT_IDS.some((spotId) => {
        const minion = board[spotId];
        return minion !== null && getMinionHasTaunt(minion);
    });
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

        return {
            SPOT_1: this.canAttack("SPOT_1", "OPPONENT") ? "green" : "red",
            SPOT_2: this.canAttack("SPOT_2", "OPPONENT") ? "green" : "red",
            SPOT_3: this.canAttack("SPOT_3", "OPPONENT") ? "green" : "red",
            SPOT_4: this.canAttack("SPOT_4", "OPPONENT") ? "green" : "red",
            SPOT_5: this.canAttack("SPOT_5", "OPPONENT") ? "green" : "red",
        };
    }

    canAttackOnSpot(spotId: MinionSpotId, spotOwner: SpotOwner): boolean {
        const board =
            spotOwner === "PLAYER" ? this.gameStore.me.board : this.gameStore.opponent.board;
        return board[spotId] !== null;
    }

    canAttack(spotId: MinionSpotId | null, spotOwner: SpotOwner): boolean {
        if (!this.gameStore.isMyTurn) return false;
        if (!this.isAttacking) return false;

        const weaponState = this.gameStore.me.weaponState;
        if (!weaponState) return false;
        if (!canWeaponAttack(this.gameStore.me, weaponState, this.gameStore.game.data.currentRound))
            return false;

        if (spotOwner === "PLAYER") return false;

        const opponentBoard = this.gameStore.opponent.board;
        const hasTaunt = boardHasTaunt(opponentBoard);

        if (spotId === null) return !hasTaunt;

        if (!this.canAttackOnSpot(spotId, spotOwner)) return false;

        if (!hasTaunt) return true;

        const targetMinion = opponentBoard[spotId];
        return targetMinion !== null && getMinionHasTaunt(targetMinion);
    }

    canSelectTarget(actionTarget: ActionTarget): boolean {
        if (!this.isAttacking) return false;

        return this.canAttack(actionTarget.spotId, actionTarget.owner);
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
            spotId: actionTarget.spotId,
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

        if (boardHasTaunt(this.gameStore.opponent.board)) return "red";

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
