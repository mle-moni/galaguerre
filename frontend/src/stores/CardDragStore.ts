import type { PlayerCard } from "#api_types/game.types";

import { makeAutoObservable } from "mobx";
import type { GameStore } from "./GameStore.js";

export class CardDragStore {
    public cardDragged: PlayerCard | null = null;

    constructor(protected gameStore: GameStore) {
        makeAutoObservable(this);
    }

    setCardDragged(card: PlayerCard | null) {
        this.cardDragged = card;
    }
}
