import type {
    ActionTarget,
    CardActionSnapshot,
    MinionCard,
    MinionSpotId,
    SpellCard,
    SpotOwner,
} from "#api_types/game.types";
import {
    actionRequiresTarget,
    heroMatchesTarget,
    minionMatchesTarget,
} from "#api_types/target_matching";

import { resolveTargetFromPoint } from "~/helpers/resolve_target_from_point";
import { makeAutoObservable } from "mobx";
import { emitSocketEventToServer } from "~/services/ws_client";
import type { GameStore } from "./GameStore.js";

export type TargetValidity = "valid" | "invalid" | "none";

export type PendingPlay =
    | { kind: "MINION"; card: MinionCard; spotId: MinionSpotId; owner: SpotOwner }
    | { kind: "SPELL"; card: SpellCard };

export class TargetSelectionStore {
    public pendingPlay: PendingPlay | null = null;

    constructor(protected gameStore: GameStore) {
        makeAutoObservable(this);
    }

    get isSelectingTarget(): boolean {
        return this.pendingPlay !== null;
    }

    requiresTarget(card: MinionCard | SpellCard): boolean {
        return actionRequiresTarget(card);
    }

    startTargetSelection(card: MinionCard, spotId: MinionSpotId, owner: SpotOwner) {
        this.pendingPlay = { kind: "MINION", card, spotId, owner };
        this.gameStore.cardDragStore.setCardDragged(null);
    }

    startSpellTargetSelection(card: SpellCard) {
        this.pendingPlay = { kind: "SPELL", card };
    }

    cancelTargetSelection() {
        this.pendingPlay = null;
        this.gameStore.targetingArrowStore.endDrag();
    }

    private getTargetedActions(): CardActionSnapshot[] {
        if (!this.pendingPlay) return [];

        if (this.pendingPlay.kind === "SPELL") {
            return this.pendingPlay.card.action.isTargeted ? [this.pendingPlay.card.action] : [];
        }

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

    getTargetValidityAtPoint(x: number, y: number): TargetValidity {
        if (!this.isSelectingTarget) return "none";

        const actionTarget = resolveTargetFromPoint(x, y);
        if (!actionTarget) return "none";

        return this.canSelectTarget(actionTarget) ? "valid" : "invalid";
    }

    confirmTarget(actionTarget: ActionTarget) {
        if (!this.pendingPlay) return;

        if (!this.canSelectTarget(actionTarget)) {
            this.cancelTargetSelection();
            return;
        }

        if (this.pendingPlay.kind === "SPELL") {
            emitSocketEventToServer("game:play_card", {
                cardId: this.pendingPlay.card.uuid,
                spotId: null,
                owner: "PLAYER",
                actionTarget,
            });
        } else {
            const { card, spotId, owner } = this.pendingPlay;

            emitSocketEventToServer("game:play_card", {
                cardId: card.uuid,
                spotId,
                owner,
                actionTarget,
            });
        }

        this.pendingPlay = null;
        this.gameStore.targetingArrowStore.endDrag();
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
