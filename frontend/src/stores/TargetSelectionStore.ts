import type {
    ActionTarget,
    CardActionSnapshot,
    MinionCard,
    MinionSpotId,
    SpellCard,
    SpotOwner,
    WeaponCard,
} from "#api_types/game.types";
import {
    actionRequiresTarget,
    canOpponentDirectlyTargetMinion,
    heroMatchesTarget,
    minionMatchesTarget,
} from "#api_types/target_matching";

import { resolveTargetFromPoint } from "~/helpers/resolve_target_from_point";
import { makeAutoObservable } from "mobx";
import { emitSocketEventToServer } from "~/services/ws_client";
import type { GameStore } from "./GameStore.js";

export const SPELL_DRAG_THRESHOLD_PX = 12;

export type TargetValidity = "valid" | "invalid" | "none";

export type ArmedPlayableCard = SpellCard | WeaponCard;

export type PendingPlay =
    | { kind: "MINION"; card: MinionCard; spotId: MinionSpotId; owner: SpotOwner }
    | { kind: "SPELL"; card: SpellCard };

type Point = { x: number; y: number };

type PendingSpellDrag = {
    card: SpellCard;
    pointerOrigin: Point;
    arrowOrigin: Point;
};

export class TargetSelectionStore {
    public pendingPlay: PendingPlay | null = null;
    public armedCard: ArmedPlayableCard | null = null;
    private pendingSpellDrag: PendingSpellDrag | null = null;

    constructor(protected gameStore: GameStore) {
        makeAutoObservable(this);
    }

    get isSelectingTarget(): boolean {
        return this.pendingPlay !== null;
    }

    get isArmed(): boolean {
        return this.armedCard !== null;
    }

    get hasPendingSpellDrag(): boolean {
        return this.pendingSpellDrag !== null;
    }

    get isHighlightingTargets(): boolean {
        return this.isSelectingTarget || this.armedCardRequiresTarget;
    }

    get armedCardRequiresTarget(): boolean {
        if (!this.armedCard || this.armedCard.type !== "SPELL") return false;

        return this.requiresTarget(this.armedCard);
    }

    requiresTarget(card: MinionCard | SpellCard): boolean {
        return actionRequiresTarget(card);
    }

    isCardArmed(card: ArmedPlayableCard): boolean {
        return this.armedCard?.uuid === card.uuid;
    }

    armCard(card: ArmedPlayableCard) {
        this.armedCard = card;
        this.gameStore.cardDragStore.clearMinionPlayHint();
    }

    disarm() {
        this.armedCard = null;
        this.pendingPlay = null;
        this.pendingSpellDrag = null;
        this.gameStore.targetingArrowStore.endDrag();
    }

    handlePlayableCardClick(card: ArmedPlayableCard) {
        if (this.isCardArmed(card)) {
            if (card.type === "SPELL" && this.requiresTarget(card)) {
                return;
            }

            this.confirmArmedPlay();
            return;
        }

        this.armCard(card);
    }

    confirmArmedPlay() {
        if (!this.armedCard) return;

        const card = this.armedCard;

        emitSocketEventToServer("game:play_card", {
            cardId: card.uuid,
            spotId: null,
            owner: "PLAYER",
        });

        this.disarm();
    }

    tryConfirmArmedTarget(actionTarget: ActionTarget): boolean {
        if (!this.armedCard || this.armedCard.type !== "SPELL") return false;
        if (!this.requiresTarget(this.armedCard)) return false;

        if (!this.canSelectTargetForSpell(this.armedCard, actionTarget)) {
            this.disarm();
            return false;
        }

        emitSocketEventToServer("game:play_card", {
            cardId: this.armedCard.uuid,
            spotId: null,
            owner: "PLAYER",
            actionTarget,
        });

        this.disarm();
        return true;
    }

    startTargetSelection(card: MinionCard, spotId: MinionSpotId, owner: SpotOwner) {
        this.pendingPlay = { kind: "MINION", card, spotId, owner };
        this.gameStore.cardDragStore.setCardDragged(null);
    }

    startSpellTargetSelection(card: SpellCard) {
        this.pendingPlay = { kind: "SPELL", card };
    }

    cancelTargetSelection() {
        this.disarm();
    }

    beginPendingSpellDrag(card: SpellCard, pointerOrigin: Point, arrowOrigin: Point) {
        if (!this.isCardArmed(card)) return;

        this.pendingSpellDrag = { card, pointerOrigin, arrowOrigin };
    }

    updatePendingSpellDrag(x: number, y: number) {
        if (!this.pendingSpellDrag) return;

        const { card, pointerOrigin, arrowOrigin } = this.pendingSpellDrag;
        const dx = x - pointerOrigin.x;
        const dy = y - pointerOrigin.y;

        if (Math.hypot(dx, dy) < SPELL_DRAG_THRESHOLD_PX) return;

        this.startSpellTargetSelection(card);
        this.gameStore.targetingArrowStore.beginDrag(arrowOrigin, { x, y });
        this.pendingSpellDrag = null;
    }

    cancelPendingSpellDrag() {
        this.pendingSpellDrag = null;
    }

    private getTargetedActions(): CardActionSnapshot[] {
        if (this.pendingPlay) {
            if (this.pendingPlay.kind === "SPELL") {
                return this.pendingPlay.card.spellActions.filter((action) => action.isTargeted);
            }

            return this.pendingPlay.card.battlecryActions.filter((action) => action.isTargeted);
        }

        if (this.armedCard?.type === "SPELL" && this.requiresTarget(this.armedCard)) {
            return this.armedCard.spellActions.filter((action) => action.isTargeted);
        }

        return [];
    }

    private canSelectTargetForSpell(card: SpellCard, actionTarget: ActionTarget): boolean {
        const targetedActions = card.spellActions.filter((action) => action.isTargeted);
        if (targetedActions.length === 0) return false;

        if (actionTarget.spotId === null) {
            return targetedActions.every((action) => {
                if (!action.target) return false;
                return heroMatchesTarget(action.target, actionTarget.owner === "OPPONENT");
            });
        }

        const board =
            actionTarget.owner === "OPPONENT"
                ? this.gameStore.opponent.board
                : this.gameStore.me.board;
        const minion = board[actionTarget.spotId];
        if (!minion) return false;

        if (actionTarget.owner === "OPPONENT" && !canOpponentDirectlyTargetMinion(minion)) {
            return false;
        }

        return targetedActions.every((action) => {
            if (!action.target) return false;
            return minionMatchesTarget(minion, action.target, actionTarget.owner === "OPPONENT");
        });
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

        if (isOpponent && !canOpponentDirectlyTargetMinion(minion)) return false;

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
        if (!this.isHighlightingTargets) return "none";

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

        this.disarm();
    }

    getHeroBorderColor(isOpponent: boolean): string {
        const transparent = "RGBa(0, 0, 0, 0)";
        if (!this.isHighlightingTargets) return transparent;

        return this.canSelectHero(isOpponent) ? "green" : "red";
    }

    getMinionSpotBorderColor(spotId: MinionSpotId, isOpponent: boolean): string {
        if (!this.isHighlightingTargets) return "black";

        return this.canSelectMinion(spotId, isOpponent) ? "green" : "red";
    }
}
