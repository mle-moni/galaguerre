import { makeAutoObservable } from "mobx";
import type { GameStore } from "./GameStore.js";

export class PlayerInfosStore {
    constructor(protected gameStore: GameStore) {
        makeAutoObservable(this);
    }

    getBorderColor({ isOpponent }: { isOpponent: boolean }) {
        const gameState = this.gameStore.game.data.state;
        const isMyTurn = this.gameStore.isMyTurn;

        if (gameState === "INIT") return "yellow";

        const opponentAndHisTurn = isOpponent && !isMyTurn;
        const meAndMyTurn = !isOpponent && isMyTurn;

        if (meAndMyTurn || opponentAndHisTurn) return "#2ae32a";

        return "white";
    }
}
