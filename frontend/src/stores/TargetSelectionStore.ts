import type { ActionTarget, MinionCard, MinionSpotId, SpotOwner } from "#api_types/game.types";
import {
    actionRequiresTarget,
    heroMatchesTarget,
    minionMatchesTarget,
} from "#api_types/target_matching";

import { makeAutoObservable } from "mobx";
import { emitSocketEventToServer } from "~/services/ws_client";
import type { GameStore } from "./GameStore.js";

export type PendingPlay = {
    card: MinionCard;
    spotId: MinionSpotId;
    owner: SpotOwner;
};

export class TargetSelectionStore {
    public pendingPlay: PendingPlay | null = null;

    constructor(protected gameStore: GameStore) {
        makeAutoObservable(this);
    }

    get isSelectingTarget(): boolean {
        return this.pendingPlay !== null;
    }

    requiresTarget(card: MinionCard): boolean {
        return actionRequiresTarget(card);
    }

    startTargetSelection(card: MinionCard, spotId: MinionSpotId, owner: SpotOwner) {
        this.pendingPlay = { card, spotId, owner };
        this.gameStore.cardDragStore.setCardDragged(null);
    }

    cancelTargetSelection() {
        this.pendingPlay = null;
    }

    private getTargetedActions() {
        if (!this.pendingPlay) return [];
        return this.pendingPlay.card.battlecryActions.filter((action) => action.isTargeted);
    }

    canSelectHero(isOpponent: boolean): boolean {
        const targetedActions = this.getTargetedActions();
        if (targetedActions.length === 0) return false;

        return targetedActions.every((action) => {
            if (!action.target) return false;
            return heroMatchesTarget(action.target, isOpponent);
        });
    }

    canSelectMinion(spotId: MinionSpotId, isOpponent: boolean): boolean {
        const targetedActions = this.getTargetedActions();
        if (targetedActions.length === 0) return false;

        const board = isOpponent ? this.gameStore.opponent.board : this.gameStore.me.board;
        const minion = board[spotId];
        if (!minion) return false;

        return targetedActions.every((action) => {
            if (!action.target) return false;
            return minionMatchesTarget(minion, action.target, isOpponent);
        });
    }

    canSelectTarget(actionTarget: ActionTarget): boolean {
        if (actionTarget.spotId === null) {
            return this.canSelectHero(actionTarget.owner === "OPPONENT");
        }

        return this.canSelectMinion(actionTarget.spotId, actionTarget.owner === "OPPONENT");
    }

    confirmTarget(actionTarget: ActionTarget) {
        if (!this.pendingPlay) return;

        if (!this.canSelectTarget(actionTarget)) {
            this.cancelTargetSelection();
            return;
        }

        const { card, spotId, owner } = this.pendingPlay;

        emitSocketEventToServer("game:play_card", {
            cardId: card.uuid,
            spotId,
            owner,
            actionTarget,
        });

        this.pendingPlay = null;
    }

    getHeroBorderColor(isOpponent: boolean): string {
        const transparent = "RGBa(0, 0, 0, 0)";
        if (!this.isSelectingTarget) return transparent;

        return this.canSelectHero(isOpponent) ? "green" : "red";
    }

    getMinionSpotBorderColor(spotId: MinionSpotId, isOpponent: boolean): string {
        if (!this.isSelectingTarget) return "black";

        return this.canSelectMinion(spotId, isOpponent) ? "green" : "red";
    }
}
