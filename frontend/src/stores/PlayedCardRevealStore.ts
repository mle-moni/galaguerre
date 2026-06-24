import type { PlayerCard } from "#api_types/game.types";
import { makeAutoObservable } from "mobx";

const REVEAL_DURATION_MS = 5000;

export class PlayedCardRevealStore {
    card: PlayerCard | null = null;
    playerId: number | null = null;
    private hideTimeoutId: ReturnType<typeof setTimeout> | null = null;

    constructor() {
        makeAutoObservable(this);
    }

    reveal(card: PlayerCard, playerId: number) {
        this.clearTimeout();
        this.card = card;
        this.playerId = playerId;
        this.hideTimeoutId = setTimeout(() => this.clear(), REVEAL_DURATION_MS);
    }

    clear() {
        this.clearTimeout();
        this.card = null;
        this.playerId = null;
    }

    private clearTimeout() {
        if (this.hideTimeoutId !== null) {
            clearTimeout(this.hideTimeoutId);
            this.hideTimeoutId = null;
        }
    }
}
