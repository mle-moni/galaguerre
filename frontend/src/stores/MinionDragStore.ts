import type { ActionTarget, BoardState, MinionState, SpotOwner } from "#api_types/game.types";
import { canOpponentDirectlyTargetMinion } from "#api_types/target_matching";

import { makeAutoObservable } from "mobx";
import { canMinionAttack } from "~/helpers/minion_combat";
import { resolveTargetFromPoint } from "~/helpers/resolve_target_from_point";
import { emitSocketEventToServer } from "~/services/ws_client";
import { type SlotsBorderColor, buildSlotsBorderColor, spotsToSameColor } from "./CardDragStore.js";
import type { GameStore } from "./GameStore.js";
import type { TargetValidity } from "./TargetSelectionStore.js";

const getMinionHasTaunt = (minion: MinionState): boolean => {
    if (minion.originalCard.type !== "MINION") return false;
    return minion.originalCard.minionPowers?.hasTaunt ?? false;
};

const boardHasAttackableTaunt = (board: BoardState): boolean => {
    return board.some(
        (minion) => getMinionHasTaunt(minion) && canOpponentDirectlyTargetMinion(minion),
    );
};

export class MinionDragStore {
    public attackingMinion: MinionState | null = null;

    constructor(protected gameStore: GameStore) {
        makeAutoObservable(this);
    }

    get isAttacking(): boolean {
        return this.attackingMinion !== null;
    }

    startAttack(minion: MinionState) {
        if (this.gameStore.isInputBlocked) return;
        this.attackingMinion = minion;
    }

    cancelAttack() {
        this.attackingMinion = null;
        this.gameStore.targetingArrowStore.endDrag();
    }

    get opponentSlotsBorderColor(): SlotsBorderColor {
        if (!this.attackingMinion) return spotsToSameColor("black");

        return buildSlotsBorderColor((boardIndex) =>
            this.canPlayMinion(boardIndex, this.attackingMinion!, "OPPONENT") ? "green" : "red",
        );
    }

    get mySlotsBorderColor(): SlotsBorderColor {
        if (!this.attackingMinion) return spotsToSameColor("black");

        return buildSlotsBorderColor((boardIndex) =>
            this.canPlayMinion(boardIndex, this.attackingMinion!, "PLAYER") ? "green" : "red",
        );
    }

    canPlayMinionOnIndex(boardIndex: number, spotOwner: SpotOwner) {
        const board =
            spotOwner === "PLAYER" ? this.gameStore.me.board : this.gameStore.opponent.board;
        return board[boardIndex] !== undefined;
    }

    canPlayMinion(boardIndex: number | null, minion: MinionState, spotOwner: SpotOwner): boolean {
        if (!this.gameStore.isMyTurn) return false;
        if (spotOwner === "PLAYER") return false;
        if (!canMinionAttack(minion, this.gameStore.game.data.currentRound)) return false;

        const opponentBoard = this.gameStore.opponent.board;
        const hasAttackableTaunt = boardHasAttackableTaunt(opponentBoard);

        if (boardIndex === null) return !hasAttackableTaunt;

        if (!this.canPlayMinionOnIndex(boardIndex, spotOwner)) return false;

        const targetMinion = opponentBoard[boardIndex];
        if (!targetMinion || !canOpponentDirectlyTargetMinion(targetMinion)) return false;

        if (!hasAttackableTaunt) return true;

        return getMinionHasTaunt(targetMinion);
    }

    canPlayMinionByUuid(
        minionUuid: string | null,
        minion: MinionState,
        spotOwner: SpotOwner,
    ): boolean {
        if (minionUuid === null) {
            return this.canPlayMinion(null, minion, spotOwner);
        }

        const opponentBoard = this.gameStore.opponent.board;
        const boardIndex = opponentBoard.findIndex((entry) => entry.uuid === minionUuid);
        if (boardIndex === -1) return false;

        return this.canPlayMinion(boardIndex, minion, spotOwner);
    }

    canSelectTarget(actionTarget: ActionTarget): boolean {
        if (!this.attackingMinion) return false;

        return this.canPlayMinionByUuid(
            actionTarget.minionUuid,
            this.attackingMinion,
            actionTarget.owner,
        );
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

        emitSocketEventToServer("game:minion_action", {
            minionId: this.attackingMinion.uuid,
            minionUuid: actionTarget.minionUuid,
            owner: actionTarget.owner,
        });

        this.attackingMinion = null;
        this.gameStore.targetingArrowStore.endDrag();
    }

    getPlayerBorderColor(isOpponent: boolean) {
        const transparent = "RGBa(0, 0, 0, 0)";

        if (!this.gameStore.isMyTurn || this.attackingMinion === null) return transparent;
        if (!isOpponent) return transparent;
        if (!canMinionAttack(this.attackingMinion, this.gameStore.game.data.currentRound))
            return transparent;

        if (boardHasAttackableTaunt(this.gameStore.opponent.board)) return "red";

        return "green";
    }
}
