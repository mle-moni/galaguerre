import type { PlayerCard } from "#api_types/game.types";
import { makeAutoObservable } from "mobx";

const REVEAL_DURATION_MS = 5000;

export type PlayedCardRevealVariant = "played" | "overdraw" | "castWhenDrawn";

export class PlayedCardRevealStore {
    card: PlayerCard | null = null;
    playerId: number | null = null;
    variant: PlayedCardRevealVariant = "played";
    private hideTimeoutId: ReturnType<typeof setTimeout> | null = null;

    constructor() {
        makeAutoObservable(this);
    }

    reveal(card: PlayerCard, playerId: number, variant: PlayedCardRevealVariant = "played") {
        this.clearTimeout();
        this.card = card;
        this.playerId = playerId;
        this.variant = variant;
        this.hideTimeoutId = setTimeout(() => this.clear(), REVEAL_DURATION_MS);
    }

    clear() {
        this.clearTimeout();
        this.card = null;
        this.playerId = null;
        this.variant = "played";
    }

    private clearTimeout() {
        if (this.hideTimeoutId !== null) {
            clearTimeout(this.hideTimeoutId);
            this.hideTimeoutId = null;
        }
    }
}
