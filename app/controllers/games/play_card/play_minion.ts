import type { MinionCard } from "#api_types/game.types";
import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import { sendGameUpdate } from "../send_game_update.js";
import type { PlayCardOptions } from "./game_play_card.js";
import { instantiateMinion } from "./instantiate_minion.js";

interface PlayMinionOptions extends Omit<PlayCardOptions, "card"> {
    card: MinionCard;
}

export const playMinion = async ({
    card,
    spotId,
    owner,
    player,
    game,
    socketId,
}: PlayMinionOptions) => {
    const spotIsEmpty = player.board[spotId] === null;
    if (owner === "OPPONENT" || !spotIsEmpty) {
        emitSocketEvent(
            "notify_error",
            { error: "Vous ne pouvez pas jouer cette carte ici" },
            socketId,
        );
        return;
    }

    player.board[spotId] = instantiateMinion(card, game.data.currentRound);
    player.hand = player.hand.filter((handCard) => handCard.uuid !== card.uuid);
    player.mana -= card.cost;

    await game.save();

    sendGameUpdate(game);
};
