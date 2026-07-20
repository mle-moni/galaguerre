import type { PlayerCard, SpotOwner } from "#api_types/game.types";
import { countBoardMinionsOnBoard, MAX_BOARD_MINIONS } from "#api_types/board";

import { makeAutoObservable } from "mobx";
import {
    getElementCenter,
    getInsertionZoneElement,
    getMinionBoardElement,
} from "~/helpers/resolve_target_from_point";
import { notifyError } from "~/services/toasts";
import { emitSocketEventToServer } from "~/services/ws_client";
import type { GameStore } from "./GameStore.js";

export type SlotsBorderColor = Record<number, string>;

const BOARD_INDICES = Array.from({ length: MAX_BOARD_MINIONS }, (_, index) => index);

export const spotsToSameColor = (color: string): SlotsBorderColor =>
    Object.fromEntries(BOARD_INDICES.map((boardIndex) => [boardIndex, color]));

export const buildSlotsBorderColor = (
    colorForIndex: (boardIndex: number) => string,
): SlotsBorderColor =>
    Object.fromEntries(BOARD_INDICES.map((boardIndex) => [boardIndex, colorForIndex(boardIndex)]));

export class CardDragStore {
    public cardDragged: PlayerCard | null = null;
    public minionPlayHintCardId: string | null = null;
    public spellOrWeaponPlayHintCardId: string | null = null;
    public previewInsertIndex: number | null = null;
    public isOverMinionDropZone = false;
    public isOverSpellPlayZone = false;

    constructor(protected gameStore: GameStore) {
        makeAutoObservable(this);
    }

    get isShowingMinionPlayHint(): boolean {
        return this.minionPlayHintCardId !== null;
    }

    get isShowingSpellOrWeaponPlayHint(): boolean {
        return this.spellOrWeaponPlayHintCardId !== null;
    }

    get pendingMinionCard(): PlayerCard | null {
        if (!this.minionPlayHintCardId) return null;
        return (
            this.gameStore.me.hand.find((card) => card.uuid === this.minionPlayHintCardId) ?? null
        );
    }

    get activeMinionCard(): PlayerCard | null {
        return this.cardDragged ?? this.pendingMinionCard;
    }

    get isDraggingSpellOrWeapon(): boolean {
        const card = this.cardDragged;
        return card?.type === "SPELL" || card?.type === "WEAPON";
    }

    showMinionPlayHint(cardId: string) {
        this.spellOrWeaponPlayHintCardId = null;
        this.minionPlayHintCardId = cardId;
        this.gameStore.targetSelectionStore.disarm();
    }

    showSpellOrWeaponPlayHint(cardId: string) {
        this.minionPlayHintCardId = null;
        this.previewInsertIndex = null;
        this.isOverMinionDropZone = false;
        this.spellOrWeaponPlayHintCardId = cardId;
        this.gameStore.targetSelectionStore.disarm();
    }

    clearMinionPlayHint() {
        this.minionPlayHintCardId = null;
        this.previewInsertIndex = null;
        this.isOverMinionDropZone = false;
    }

    clearSpellOrWeaponPlayHint() {
        this.spellOrWeaponPlayHintCardId = null;
        this.isOverSpellPlayZone = false;
    }

    clearPlayHints() {
        this.clearMinionPlayHint();
        this.clearSpellOrWeaponPlayHint();
    }

    setCardDragged(card: PlayerCard | null) {
        if (card !== null) {
            this.gameStore.targetSelectionStore.disarm();
            this.clearPlayHints();
        } else {
            this.previewInsertIndex = null;
            this.isOverMinionDropZone = false;
            this.isOverSpellPlayZone = false;
        }

        this.cardDragged = card;
    }

    enterMinionDropZone() {
        this.isOverMinionDropZone = true;
    }

    leaveMinionDropZone() {
        this.isOverMinionDropZone = false;
        this.previewInsertIndex = null;
    }

    enterSpellPlayZone() {
        this.isOverSpellPlayZone = true;
    }

    leaveSpellPlayZone() {
        this.isOverSpellPlayZone = false;
    }

    handleSpellOrWeaponDrop(card: PlayerCard) {
        this.isOverSpellPlayZone = false;
        this.clearSpellOrWeaponPlayHint();

        if (card.type !== "SPELL" && card.type !== "WEAPON") return;

        if (!this.gameStore.isMyTurn) {
            this.setCardDragged(null);
            return;
        }

        if (card.cost > this.gameStore.me.mana) {
            notifyError("Vous n'avez pas assez de mana pour jouer cette carte");
            this.setCardDragged(null);
            return;
        }

        if (this.gameStore.isInputBlocked) {
            this.setCardDragged(null);
            return;
        }

        if (card.type === "SPELL" && this.gameStore.targetSelectionStore.requiresTarget(card)) {
            this.gameStore.targetSelectionStore.startSpellTargetSelection(card);
            this.setCardDragged(null);
            return;
        }

        this.gameStore.targetSelectionStore.playUntargetedFromHand(card);
        this.setCardDragged(null);
    }

    setPreviewInsertIndex(boardIndex: number | null) {
        if (!this.isOverMinionDropZone) return;
        this.previewInsertIndex = boardIndex;
    }

    canPlayAtIndex(boardIndex: number): boolean {
        if (!this.gameStore.isMyTurn) return false;

        const card = this.activeMinionCard;
        if (!card || card.type !== "MINION") return false;
        if (card.cost > this.gameStore.me.mana) return false;

        const minionCount = countBoardMinionsOnBoard(this.gameStore.me.board);
        if (minionCount >= MAX_BOARD_MINIONS) return false;

        return Number.isInteger(boardIndex) && boardIndex >= 0 && boardIndex <= minionCount;
    }

    handleDrop(
        card: PlayerCard,
        boardIndex: number,
        spotOwner: SpotOwner,
        cursor?: { x: number; y: number },
    ) {
        this.previewInsertIndex = null;
        this.isOverMinionDropZone = false;

        if (spotOwner !== "PLAYER") {
            notifyError("Vous ne pouvez pas jouer cette carte ici");
            return;
        }

        if (card.cost > this.gameStore.me.mana) {
            notifyError("Vous n'avez pas assez de mana pour jouer cette carte");
            return;
        }

        if (!this.canPlayAtIndex(boardIndex)) {
            notifyError("Vous ne pouvez pas jouer cette carte ici");
            return;
        }

        if (this.gameStore.isInputBlocked) {
            this.gameStore.combatActionQueue.enqueuePlayMinion(card.uuid, boardIndex, spotOwner);
            this.clearMinionPlayHint();
            this.setCardDragged(null);
            return;
        }

        if (
            card.type === "MINION" &&
            this.gameStore.targetSelectionStore.minionNeedsTargetSelection(card)
        ) {
            this.clearMinionPlayHint();
            this.gameStore.targetSelectionStore.startTargetSelection(card, boardIndex, spotOwner);

            const spotElement =
                getInsertionZoneElement(boardIndex, spotOwner) ??
                getMinionBoardElement(boardIndex, spotOwner);
            if (spotElement) {
                const origin = getElementCenter(spotElement);
                requestAnimationFrame(() => {
                    this.gameStore.targetingArrowStore.beginDrag(origin, cursor);
                });
            }

            return;
        }

        emitSocketEventToServer("game:play_card", {
            cardId: card.uuid,
            boardIndex,
            owner: spotOwner,
        });

        this.clearMinionPlayHint();
        this.setCardDragged(null);
    }
}
