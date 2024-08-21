import type { MinionSpotId, PlayerCard, SpotOwner } from "#api_types/game.types";

import { makeAutoObservable } from "mobx";
import type { GameStore } from "./GameStore.js";

type SlotsBorderColor = {
    [K in MinionSpotId]: string;
};

const spotsToSameColor = (color: string) => ({
    SPOT_1: color,
    SPOT_2: color,
    SPOT_3: color,
    SPOT_4: color,
    SPOT_5: color,
});

export class CardDragStore {
    public cardDragged: PlayerCard | null = null;

    constructor(protected gameStore: GameStore) {
        makeAutoObservable(this);
    }

    setCardDragged(card: PlayerCard | null) {
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
        if (card.type === "MINION") return this.canPlayMinionOnSpot(spotId, spotOwner);

        return false;
    }
}
