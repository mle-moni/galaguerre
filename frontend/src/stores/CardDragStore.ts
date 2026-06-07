import type { MinionSpotId, PlayerCard, SpotOwner } from "#api_types/game.types";

import { makeAutoObservable } from "mobx";
import { getElementCenter, getMinionSpotElement } from "~/helpers/resolve_target_from_point";
import { notifyError } from "~/services/toasts";
import { emitSocketEventToServer } from "~/services/ws_client";
import type { GameStore } from "./GameStore.js";

export type SlotsBorderColor = {
    [K in MinionSpotId]: string;
};

export const spotsToSameColor = (color: string) => ({
    SPOT_1: color,
    SPOT_2: color,
    SPOT_3: color,
    SPOT_4: color,
    SPOT_5: color,
});

export class CardDragStore {
    public cardDragged: PlayerCard | null = null;
    public minionPlayHintCardId: string | null = null;

    constructor(protected gameStore: GameStore) {
        makeAutoObservable(this);
    }

    get isShowingMinionPlayHint(): boolean {
        return this.minionPlayHintCardId !== null;
    }

    showMinionPlayHint(cardId: string) {
        this.minionPlayHintCardId = cardId;
        this.gameStore.targetSelectionStore.disarm();
    }

    clearMinionPlayHint() {
        this.minionPlayHintCardId = null;
    }

    setCardDragged(card: PlayerCard | null) {
        if (card !== null) {
            this.gameStore.targetSelectionStore.disarm();
            this.clearMinionPlayHint();
        }

        this.cardDragged = card;
    }

    get opponentSlotsBorderColor(): SlotsBorderColor {
        if (!this.cardDragged) return spotsToSameColor("black");

        return {
            SPOT_1: this.canPlayCard("SPOT_1", this.cardDragged, "OPPONENT") ? "green" : "red",
            SPOT_2: this.canPlayCard("SPOT_2", this.cardDragged, "OPPONENT") ? "green" : "red",
            SPOT_3: this.canPlayCard("SPOT_3", this.cardDragged, "OPPONENT") ? "green" : "red",
            SPOT_4: this.canPlayCard("SPOT_4", this.cardDragged, "OPPONENT") ? "green" : "red",
            SPOT_5: this.canPlayCard("SPOT_5", this.cardDragged, "OPPONENT") ? "green" : "red",
        };
    }

    get mySlotsBorderColor(): SlotsBorderColor {
        if (!this.cardDragged) return spotsToSameColor("black");

        return {
            SPOT_1: this.canPlayCard("SPOT_1", this.cardDragged, "PLAYER") ? "green" : "red",
            SPOT_2: this.canPlayCard("SPOT_2", this.cardDragged, "PLAYER") ? "green" : "red",
            SPOT_3: this.canPlayCard("SPOT_3", this.cardDragged, "PLAYER") ? "green" : "red",
            SPOT_4: this.canPlayCard("SPOT_4", this.cardDragged, "PLAYER") ? "green" : "red",
            SPOT_5: this.canPlayCard("SPOT_5", this.cardDragged, "PLAYER") ? "green" : "red",
        };
    }

    canPlayMinionOnSpot(spotId: MinionSpotId, spotOwner: SpotOwner) {
        // cannot play a minion on an opponent spot
        if (spotOwner === "OPPONENT") return false;
        // allow to play a minion on a spot if it's empty
        return this.gameStore.me.board[spotId] === null;
    }

    canPlayCard(spotId: MinionSpotId, card: PlayerCard, spotOwner: SpotOwner): boolean {
        if (!this.gameStore.isMyTurn) return false;
        if (card.cost > this.gameStore.me.mana) return false;
        if (card.type === "MINION") return this.canPlayMinionOnSpot(spotId, spotOwner);

        return false;
    }

    handleDrop(
        card: PlayerCard,
        spotId: MinionSpotId,
        spotOwner: SpotOwner,
        cursor?: { x: number; y: number },
    ) {
        if (card.cost > this.gameStore.me.mana) {
            notifyError("Vous n'avez pas assez de mana pour jouer cette carte");
            return;
        }

        const canPlayCard = this.canPlayCard(spotId, card, spotOwner);

        if (!canPlayCard) {
            notifyError("Vous ne pouvez pas jouer cette carte ici");
            return;
        }

        if (card.type === "MINION" && this.gameStore.targetSelectionStore.requiresTarget(card)) {
            this.gameStore.targetSelectionStore.startTargetSelection(card, spotId, spotOwner);

            const spotElement = getMinionSpotElement(spotId, spotOwner);
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
            spotId,
            owner: spotOwner,
        });
    }
}
