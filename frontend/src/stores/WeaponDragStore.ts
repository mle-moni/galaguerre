import { makeAutoObservable } from "mobx";
import {
    canWeaponAttackBoardIndex,
    canWeaponAttackTarget,
    opponentBoardHasAttackableTaunt,
    weaponHasAnyAttackTarget,
} from "~/helpers/combat_target_validation";
import { resolveTargetFromPoint } from "~/helpers/resolve_target_from_point";
import { canWeaponAttack } from "~/helpers/weapon_combat";
import type { ActionTarget, SpotOwner } from "#api_types/game.types";
import { getWeaponCannotAttackHero } from "#api_types/weapon_combat";
import { type SlotsBorderColor, buildSlotsBorderColor, spotsToSameColor } from "./CardDragStore.js";
import type { GameStore } from "./GameStore.js";
import type { TargetValidity } from "./TargetSelectionStore.js";

export class WeaponDragStore {
    public isAttacking = false;

    constructor(protected gameStore: GameStore) {
        makeAutoObservable(this);
    }

    startAttack() {
        if (!this.gameStore.canPlanCombatAction) return;

        this.gameStore.targetSelectionStore.disarm();
        this.gameStore.cardDragStore.clearMinionPlayHint();
        this.gameStore.minionDragStore.cancelAttack();
        this.isAttacking = true;
    }

    cancelAttack() {
        this.isAttacking = false;
        this.gameStore.targetingArrowStore.endDrag();
    }

    get opponentSlotsBorderColor(): SlotsBorderColor {
        if (!this.isAttacking) return spotsToSameColor("black");

        return buildSlotsBorderColor((boardIndex) =>
            canWeaponAttackBoardIndex(this.gameStore, boardIndex, "OPPONENT") ? "green" : "red",
        );
    }

    canAttack(boardIndex: number | null, spotOwner: SpotOwner): boolean {
        return canWeaponAttackBoardIndex(this.gameStore, boardIndex, spotOwner);
    }

    canAttackByUuid(minionUuid: string | null, spotOwner: SpotOwner): boolean {
        if (minionUuid === null) {
            return this.canAttack(null, spotOwner);
        }

        const opponentBoard = this.gameStore.authoritativeOpponent.board;
        const boardIndex = opponentBoard.findIndex((entry) => entry.uuid === minionUuid);
        if (boardIndex === -1) return false;

        return this.canAttack(boardIndex, spotOwner);
    }

    canSelectTarget(actionTarget: ActionTarget): boolean {
        if (!this.isAttacking) return false;

        return canWeaponAttackTarget(this.gameStore, actionTarget);
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

        this.gameStore.combatActionQueue.enqueueWeaponAction(actionTarget);

        this.isAttacking = false;
        this.gameStore.targetingArrowStore.endDrag();
    }

    getOpponentHeroBorderColor(isOpponent: boolean) {
        const transparent = "RGBa(0, 0, 0, 0)";

        if (!this.gameStore.isMyTurn || !this.isAttacking) return transparent;
        if (!isOpponent) return transparent;

        const weaponState = this.gameStore.authoritativeMe.weaponState;
        if (!weaponState) return transparent;
        if (
            !canWeaponAttack(
                this.gameStore.authoritativeMe,
                weaponState,
                this.gameStore.authoritativeGame.data.currentRound,
            )
        ) {
            return transparent;
        }

        if (opponentBoardHasAttackableTaunt(this.gameStore)) return "red";

        if (getWeaponCannotAttackHero(weaponState.originalCard)) return "red";

        return "green";
    }

    get canAttackWithWeapon(): boolean {
        if (!this.gameStore.isMyTurn) return false;
        if (this.gameStore.combatActionQueue.isWeaponReserved()) return false;

        return weaponHasAnyAttackTarget(this.gameStore);
    }
}
