import type { GamePlayer, MinionSpotId, PlayerCard, SpotOwner } from "#api_types/game.types";
import type { ClientSocketEventByKey } from "#api_types/socket_events";
import type Game from "#models/game";
import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import {
    ensureCardFoundInHand,
    ensureIsMyTurn,
    getGameActionInfos,
    whichPlayerAmI,
} from "../game_utils.js";
import { playMinion } from "./play_minion.js";

export const gamePlayCard = async (
    socketId: string,
    { cardId, owner, spotId }: ClientSocketEventByKey["game:play_card"],
) => {
    const gameInfos = await getGameActionInfos(socketId);
    if (!gameInfos) return;

    const { currentGame, userId } = gameInfos;

    const isMyTurn = ensureIsMyTurn(currentGame, userId, socketId);
    if (!isMyTurn) return;
    const { player } = whichPlayerAmI(currentGame, userId);

    const card = ensureCardFoundInHand(player.hand, cardId, socketId);
    if (!card) return;

    return playCard({ card, game: currentGame, player, owner, spotId, socketId });
};

export interface PlayCardOptions {
    card: PlayerCard;
    game: Game;
    player: GamePlayer;
    owner: SpotOwner;
    spotId: MinionSpotId;
    socketId: string;
}

const playCard = async (opts: PlayCardOptions) => {
    const { card } = opts;

    if (card.cost > opts.player.mana) {
        emitSocketEvent(
            "notify_error",
            { error: "Vous n'avez pas assez de mana pour jouer cette carte" },
            opts.socketId,
        );
        return;
    }

    if (card.type === "MINION") return playMinion({ ...opts, card });

    emitSocketEvent(
        "notify_error",
        { error: `Card type '${card.type}' not supported` },
        opts.socketId,
    );
};
