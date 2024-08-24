import type { ApiUser } from "#api_types/auth.types";
import type { ApiGame, GamePlayer, MinionSpotId, SpotOwner } from "#api_types/game.types";
import { makeAutoObservable } from "mobx";
import { _assert } from "~/helpers/assertions";
import { CardDragStore } from "./CardDragStore.js";
import { MinionDragStore } from "./MinionDragStore.js";
import { PlayerInfosStore } from "./PlayerInfosStore.js";

export class GameStore {
    cardDragStore = new CardDragStore(this);
    minionDragStore = new MinionDragStore(this);
    playerInfosStore = new PlayerInfosStore(this);

    private _game: ApiGame | null = null;
    private _user: ApiUser | null = null;

    constructor() {
        makeAutoObservable(this);
    }

    get game() {
        _assert(this._game, "GameStore not initialized");
        return this._game;
    }

    get user() {
        _assert(this._user, "GameStore not initialized");
        return this._user;
    }

    init(game: ApiGame, user: ApiUser): GameStore {
        this._game = game;
        this._user = user;

        return this;
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

    get opponent(): GamePlayer {
        if (this.p1.userId === this.user.id) return this.p2;

        return this.p1;
    }

    get me(): GamePlayer {
        if (this.p1.userId === this.user.id) return this.p1;

        return this.p2;
    }

    get winner() {
        if (this.p1.health <= 0) return this.p2;

        return this.p1;
    }

    get isUserWinner() {
        return this.winner.userId === this.user.id;
    }

    get isMyTurn() {
        const gameState = this.game.data.state;
        const p1 = this.game.data.playerOne;
        const p2 = this.game.data.playerTwo;

        if (gameState === "PLAYER_ONE_TURN") {
            return p1.userId === this.user.id;
        }

        if (gameState === "PLAYER_TWO_TURN") {
            return p2.userId === this.user.id;
        }

        return false;
    }

    handleDrop(spotId: MinionSpotId, spotOwner: SpotOwner) {
        if (this.cardDragStore.cardDragged) {
            return this.cardDragStore.handleDrop(this.cardDragStore.cardDragged, spotId, spotOwner);
        }
        if (this.minionDragStore.minionDragged) {
            return this.minionDragStore.handleDrop(
                this.minionDragStore.minionDragged,
                spotId,
                spotOwner,
            );
        }
    }

    getMinionSpotBackgroundColor(spotId: MinionSpotId, spotOwner: SpotOwner) {
        if (this.cardDragStore.cardDragged) {
            if (spotOwner === "OPPONENT")
                return this.cardDragStore.opponentSlotsBorderColor[spotId];
            return this.cardDragStore.mySlotsBorderColor[spotId];
        }

        if (this.minionDragStore.minionDragged) {
            if (spotOwner === "OPPONENT")
                return this.minionDragStore.opponentSlotsBorderColor[spotId];
            return this.minionDragStore.mySlotsBorderColor[spotId];
        }

        return "black";
    }
}
