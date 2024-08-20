import type { MinionSpotId, PlayerCard } from "#api_types/game.types";

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
        return spotsToSameColor("red");
    }

    get mySlotsBorderColor(): SlotsBorderColor {
        if (!this.cardDragged) return spotsToSameColor("black");

        return {
            SPOT_1: this.canPlayCard("SPOT_1", this.cardDragged) ? "green" : "red",
            SPOT_2: this.canPlayCard("SPOT_2", this.cardDragged) ? "green" : "red",
            SPOT_3: this.canPlayCard("SPOT_3", this.cardDragged) ? "green" : "red",
            SPOT_4: this.canPlayCard("SPOT_4", this.cardDragged) ? "green" : "red",
            SPOT_5: this.canPlayCard("SPOT_5", this.cardDragged) ? "green" : "red",
        };
    }

    // assuming it's our turn
    canPlayMinionOnSpot(spotId: MinionSpotId) {
        return this.gameStore.me.board[spotId] === null;
    }

    canPlayCard(spotId: MinionSpotId, card: PlayerCard): boolean {
        if (!this.gameStore.isMyTurn) return false;
        if (card.type === "MINION") return this.canPlayMinionOnSpot(spotId);

        return false;
    }
}
