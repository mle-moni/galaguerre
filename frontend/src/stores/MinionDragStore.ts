import type { ActionTarget, MinionState, SpotOwner } from "#api_types/game.types";
import { makeAutoObservable } from "mobx";
import {
    canMinionAttackBoardIndex,
    canMinionAttackTarget,
    findAuthoritativeMinion,
    opponentBoardHasAttackableTaunt,
} from "~/helpers/combat_target_validation";
import { canMinionAttack } from "~/helpers/minion_combat";
import { resolveTargetFromPoint } from "~/helpers/resolve_target_from_point";
import type { GameStore } from "./GameStore.js";
import type { TargetValidity } from "./TargetSelectionStore.js";
import { type SlotsBorderColor, buildSlotsBorderColor, spotsToSameColor } from "./CardDragStore.js";

export class MinionDragStore {
    public attackingMinion: MinionState | null = null;

    constructor(protected gameStore: GameStore) {
        makeAutoObservable(this);
    }

    get isAttacking(): boolean {
        return this.attackingMinion !== null;
    }

    startAttack(minion: MinionState) {
        if (!this.gameStore.canPlanCombatAction) return;
        if (this.gameStore.combatActionQueue.isMinionReserved(minion.uuid)) return;
        this.attackingMinion = minion;
    }

    cancelAttack() {
        this.attackingMinion = null;
        this.gameStore.targetingArrowStore.endDrag();
    }

    get opponentSlotsBorderColor(): SlotsBorderColor {
        if (!this.attackingMinion) return spotsToSameColor("black");

        return buildSlotsBorderColor((boardIndex) =>
            canMinionAttackBoardIndex(this.gameStore, this.attackingMinion!, boardIndex, "OPPONENT")
                ? "green"
                : "red",
        );
    }

    get mySlotsBorderColor(): SlotsBorderColor {
        if (!this.attackingMinion) return spotsToSameColor("black");

        return buildSlotsBorderColor((boardIndex) =>
            canMinionAttackBoardIndex(this.gameStore, this.attackingMinion!, boardIndex, "PLAYER")
                ? "green"
                : "red",
        );
    }

    canPlayMinionOnIndex(boardIndex: number, spotOwner: SpotOwner) {
        const board =
            spotOwner === "PLAYER" ? this.gameStore.me.board : this.gameStore.opponent.board;
        return board[boardIndex] !== undefined;
    }

    canPlayMinion(boardIndex: number | null, minion: MinionState, spotOwner: SpotOwner): boolean {
        return canMinionAttackBoardIndex(this.gameStore, minion, boardIndex, spotOwner);
    }

    canPlayMinionByUuid(
        minionUuid: string | null,
        minion: MinionState,
        spotOwner: SpotOwner,
    ): boolean {
        if (minionUuid === null) {
            return this.canPlayMinion(null, minion, spotOwner);
        }

        const opponentBoard = this.gameStore.authoritativeOpponent.board;
        const boardIndex = opponentBoard.findIndex((entry) => entry.uuid === minionUuid);
        if (boardIndex === -1) return false;

        return this.canPlayMinion(boardIndex, minion, spotOwner);
    }

    canSelectTarget(actionTarget: ActionTarget): boolean {
        if (!this.attackingMinion) return false;

        const minion = findAuthoritativeMinion(this.gameStore, this.attackingMinion.uuid);
        if (!minion) return false;

        return canMinionAttackTarget(this.gameStore, minion, actionTarget);
    }

    getTargetValidityAtPoint(x: number, y: number): TargetValidity {
        if (!this.isAttacking) return "none";

        const actionTarget = resolveTargetFromPoint(x, y);
        if (!actionTarget) return "none";

        return this.canSelectTarget(actionTarget) ? "valid" : "invalid";
    }

    confirmTarget(actionTarget: ActionTarget) {
        if (!this.attackingMinion) return;

        if (!this.canSelectTarget(actionTarget)) {
            this.cancelAttack();
            return;
        }

        this.gameStore.combatActionQueue.enqueueMinionAction(
            this.attackingMinion.uuid,
            actionTarget,
        );

        this.attackingMinion = null;
        this.gameStore.targetingArrowStore.endDrag();
    }

    getPlayerBorderColor(isOpponent: boolean) {
        const transparent = "RGBa(0, 0, 0, 0)";

        if (!this.gameStore.isMyTurn || this.attackingMinion === null) return transparent;
        if (!isOpponent) return transparent;
        if (
            !canMinionAttack(
                this.attackingMinion,
                this.gameStore.authoritativeGame.data.currentRound,
            )
        ) {
            return transparent;
        }

        if (opponentBoardHasAttackableTaunt(this.gameStore)) return "red";

        return "green";
    }
}
