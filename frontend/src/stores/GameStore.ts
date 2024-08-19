import type { ApiUser } from "#api_types/auth.types";
import type { ApiGame } from "#api_types/game.types";
import { makeAutoObservable } from "mobx";
import { CardDragStore } from "./CardDragStore.js";

export class GameStore {
    public isFinalScreenOpen = false;
    public cardDragStore = new CardDragStore(this);

    constructor(
        protected game: ApiGame,
        protected user: ApiUser,
    ) {
        makeAutoObservable(this);
    }

    setIsFinalScreenOpen(state: boolean) {
        this.isFinalScreenOpen = state;
    }

    get isFinished() {
        return this.game.data.state === "FINISHED";
    }

    get p1() {
        return this.game.data.playerOne;
    }

    get p2() {
        return this.game.data.playerTwo;
    }

    get winner() {
        if (this.p1.health <= 0) return this.p2;

        return this.p1;
    }

    get isUserWinner() {
        return this.winner.userId === this.user.id;
    }
}
