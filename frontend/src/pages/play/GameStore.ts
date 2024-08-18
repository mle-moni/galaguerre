import type { ApiUser } from "#api_types/auth.types";
import type { ApiGame } from "#api_types/game.types";
import { makeAutoObservable } from "mobx";

type FinalScreenOpenState = "OPENED" | "CLOSED" | "AUTO";

export class GameStore {
    public finalScreenOpenState: FinalScreenOpenState = "AUTO";

    constructor(
        protected game: ApiGame,
        protected user: ApiUser,
    ) {
        makeAutoObservable(this);
    }

    setFinalScreenOpenState(state: FinalScreenOpenState) {
        this.finalScreenOpenState = state;
    }

    get isFinished() {
        return this.game.data.state === "FINISHED";
    }

    get isFinalScreenOpen() {
        if (this.finalScreenOpenState === "AUTO") {
            return this.game.data.state === "FINISHED";
        }
        return this.finalScreenOpenState === "OPENED";
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
