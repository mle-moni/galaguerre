import type { BoardState, MinionSpotId, MinionState, SpotOwner } from "#api_types/game.types";
import { MINION_SPOT_IDS } from "#api_types/game.types";

import { makeAutoObservable } from "mobx";
import { notifyError } from "~/services/toasts";
import { emitSocketEventToServer } from "~/services/ws_client";
import { type SlotsBorderColor, spotsToSameColor } from "./CardDragStore.js";
import type { GameStore } from "./GameStore.js";

const getMinionHasTaunt = (minion: MinionState): boolean => {
    if (minion.originalCard.type !== "MINION") return false;
    return minion.originalCard.hasTaunt ?? false;
};

const boardHasTaunt = (board: BoardState): boolean => {
    return MINION_SPOT_IDS.some((spotId) => {
        const minion = board[spotId];
        return minion !== null && getMinionHasTaunt(minion);
    });
};

export class MinionDragStore {
    public minionDragged: MinionState | null = null;

    constructor(protected gameStore: GameStore) {
        makeAutoObservable(this);
    }

    setMinionDragged(card: MinionState | null) {
        this.minionDragged = card;
    }

    get opponentSlotsBorderColor(): SlotsBorderColor {
        if (!this.minionDragged) return spotsToSameColor("black");

        return {
            SPOT_1: this.canPlayMinion("SPOT_1", this.minionDragged, "OPPONENT") ? "green" : "red",
            SPOT_2: this.canPlayMinion("SPOT_2", this.minionDragged, "OPPONENT") ? "green" : "red",
            SPOT_3: this.canPlayMinion("SPOT_3", this.minionDragged, "OPPONENT") ? "green" : "red",
            SPOT_4: this.canPlayMinion("SPOT_4", this.minionDragged, "OPPONENT") ? "green" : "red",
            SPOT_5: this.canPlayMinion("SPOT_5", this.minionDragged, "OPPONENT") ? "green" : "red",
        };
    }

    get mySlotsBorderColor(): SlotsBorderColor {
        if (!this.minionDragged) return spotsToSameColor("black");

        return {
            SPOT_1: this.canPlayMinion("SPOT_1", this.minionDragged, "PLAYER") ? "green" : "red",
            SPOT_2: this.canPlayMinion("SPOT_2", this.minionDragged, "PLAYER") ? "green" : "red",
            SPOT_3: this.canPlayMinion("SPOT_3", this.minionDragged, "PLAYER") ? "green" : "red",
            SPOT_4: this.canPlayMinion("SPOT_4", this.minionDragged, "PLAYER") ? "green" : "red",
            SPOT_5: this.canPlayMinion("SPOT_5", this.minionDragged, "PLAYER") ? "green" : "red",
        };
    }

    canPlayMinionOnSpot(spotId: MinionSpotId, spotOwner: SpotOwner) {
        const board =
            spotOwner === "PLAYER" ? this.gameStore.me.board : this.gameStore.opponent.board;
        // allow to play a minion on a spot if it's not empty
        return board[spotId] !== null;
    }

    canPlayMinion(
        spotId: MinionSpotId | null,
        _minion: MinionState,
        spotOwner: SpotOwner,
    ): boolean {
        if (!this.gameStore.isMyTurn) return false;
        if (spotOwner === "PLAYER") return false;

        const opponentBoard = this.gameStore.opponent.board;
        const hasTaunt = boardHasTaunt(opponentBoard);

        if (spotId === null) return !hasTaunt;

        if (!this.canPlayMinionOnSpot(spotId, spotOwner)) return false;

        if (!hasTaunt) return true;

        const targetMinion = opponentBoard[spotId];
        return targetMinion !== null && getMinionHasTaunt(targetMinion);
    }

    handleDrop(minion: MinionState, spotId: MinionSpotId | null, spotOwner: SpotOwner) {
        const canPlayMinion = this.canPlayMinion(spotId, minion, spotOwner);

        if (!canPlayMinion) {
            notifyError("Vous ne pouvez pas jouer ce serviteur ici");
            return;
        }

        emitSocketEventToServer("game:minion_action", {
            minionId: minion.uuid,
            spotId,
            owner: spotOwner,
        });
    }

    getPlayerBorderColor(isOpponent: boolean) {
        const transparent = "RGBa(0, 0, 0, 0)";

        if (!this.gameStore.isMyTurn || this.minionDragged === null) return transparent;
        if (!isOpponent) return transparent;

        if (boardHasTaunt(this.gameStore.opponent.board)) return "red";

        return "green";
    }
}
