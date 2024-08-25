import type { MinionSpotId, MinionState, SpotOwner } from "#api_types/game.types";

import { makeAutoObservable } from "mobx";
import { notifyError } from "~/services/toasts";
import { emitSocketEventToServer } from "~/services/ws_client";
import { type SlotsBorderColor, spotsToSameColor } from "./CardDragStore.js";
import type { GameStore } from "./GameStore.js";

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
        if (spotId === null) return true;
        return this.canPlayMinionOnSpot(spotId, spotOwner);
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

        return "green";
    }
}
