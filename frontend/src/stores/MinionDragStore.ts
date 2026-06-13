import type {
    ActionTarget,
    BoardState,
    MinionSpotId,
    MinionState,
    SpotOwner,
} from "#api_types/game.types";
import { MINION_SPOT_IDS } from "#api_types/game.types";
import { canOpponentDirectlyTargetMinion } from "#api_types/target_matching";

import { makeAutoObservable } from "mobx";
import { canMinionAttack } from "~/helpers/minion_combat";
import { resolveTargetFromPoint } from "~/helpers/resolve_target_from_point";
import { emitSocketEventToServer } from "~/services/ws_client";
import { type SlotsBorderColor, spotsToSameColor } from "./CardDragStore.js";
import type { GameStore } from "./GameStore.js";
import type { TargetValidity } from "./TargetSelectionStore.js";

const getMinionHasTaunt = (minion: MinionState): boolean => {
    if (minion.originalCard.type !== "MINION") return false;
    return minion.originalCard.minionPowers?.hasTaunt ?? false;
};

const boardHasAttackableTaunt = (board: BoardState): boolean => {
    return MINION_SPOT_IDS.some((spotId) => {
        const minion = board[spotId];
        return (
            minion !== null && getMinionHasTaunt(minion) && canOpponentDirectlyTargetMinion(minion)
        );
    });
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
        this.attackingMinion = minion;
    }

    cancelAttack() {
        this.attackingMinion = null;
        this.gameStore.targetingArrowStore.endDrag();
    }

    get opponentSlotsBorderColor(): SlotsBorderColor {
        if (!this.attackingMinion) return spotsToSameColor("black");

        return {
            SPOT_1: this.canPlayMinion("SPOT_1", this.attackingMinion, "OPPONENT")
                ? "green"
                : "red",
            SPOT_2: this.canPlayMinion("SPOT_2", this.attackingMinion, "OPPONENT")
                ? "green"
                : "red",
            SPOT_3: this.canPlayMinion("SPOT_3", this.attackingMinion, "OPPONENT")
                ? "green"
                : "red",
            SPOT_4: this.canPlayMinion("SPOT_4", this.attackingMinion, "OPPONENT")
                ? "green"
                : "red",
            SPOT_5: this.canPlayMinion("SPOT_5", this.attackingMinion, "OPPONENT")
                ? "green"
                : "red",
        };
    }

    get mySlotsBorderColor(): SlotsBorderColor {
        if (!this.attackingMinion) return spotsToSameColor("black");

        return {
            SPOT_1: this.canPlayMinion("SPOT_1", this.attackingMinion, "PLAYER") ? "green" : "red",
            SPOT_2: this.canPlayMinion("SPOT_2", this.attackingMinion, "PLAYER") ? "green" : "red",
            SPOT_3: this.canPlayMinion("SPOT_3", this.attackingMinion, "PLAYER") ? "green" : "red",
            SPOT_4: this.canPlayMinion("SPOT_4", this.attackingMinion, "PLAYER") ? "green" : "red",
            SPOT_5: this.canPlayMinion("SPOT_5", this.attackingMinion, "PLAYER") ? "green" : "red",
        };
    }

    canPlayMinionOnSpot(spotId: MinionSpotId, spotOwner: SpotOwner) {
        const board =
            spotOwner === "PLAYER" ? this.gameStore.me.board : this.gameStore.opponent.board;
        return board[spotId] !== null;
    }

    canPlayMinion(spotId: MinionSpotId | null, minion: MinionState, spotOwner: SpotOwner): boolean {
        if (!this.gameStore.isMyTurn) return false;
        if (spotOwner === "PLAYER") return false;
        if (!canMinionAttack(minion, this.gameStore.game.data.currentRound)) return false;

        const opponentBoard = this.gameStore.opponent.board;
        const hasAttackableTaunt = boardHasAttackableTaunt(opponentBoard);

        if (spotId === null) return !hasAttackableTaunt;

        if (!this.canPlayMinionOnSpot(spotId, spotOwner)) return false;

        const targetMinion = opponentBoard[spotId];
        if (!targetMinion || !canOpponentDirectlyTargetMinion(targetMinion)) return false;

        if (!hasAttackableTaunt) return true;

        return getMinionHasTaunt(targetMinion);
    }

    canSelectTarget(actionTarget: ActionTarget): boolean {
        if (!this.attackingMinion) return false;

        return this.canPlayMinion(actionTarget.spotId, this.attackingMinion, actionTarget.owner);
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
            spotId: actionTarget.spotId,
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
