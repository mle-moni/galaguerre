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
        if (this.cardDragged.type !== "MINION") return spotsToSameColor("black");

        return {
            SPOT_1: this.canPlayMinionOnSpot("SPOT_1") ? "green" : "red",
            SPOT_2: this.canPlayMinionOnSpot("SPOT_2") ? "green" : "red",
            SPOT_3: this.canPlayMinionOnSpot("SPOT_3") ? "green" : "red",
            SPOT_4: this.canPlayMinionOnSpot("SPOT_4") ? "green" : "red",
            SPOT_5: this.canPlayMinionOnSpot("SPOT_5") ? "green" : "red",
        };
    }

    // assuming it's our turn
    canPlayMinionOnSpot(spotId: MinionSpotId) {
        return this.gameStore.me.board[spotId] === null;
    }
}
