import type {
    ActionTarget,
    GamePlayer,
    MinionSpotId,
    PlayerCard,
    SpotOwner,
} from "#api_types/game.types";
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
import { playSpell } from "./play_spell.js";
import { playWeapon } from "./play_weapon.js";

export const gamePlayCard = async (
    socketId: string,
    { cardId, owner, spotId, actionTarget }: ClientSocketEventByKey["game:play_card"],
) => {
    const gameInfos = await getGameActionInfos(socketId);
    if (!gameInfos) return;

    const { currentGame, userId } = gameInfos;

    const isMyTurn = ensureIsMyTurn(currentGame, userId, socketId);
    if (!isMyTurn) return;
    const { player } = whichPlayerAmI(currentGame, userId);

    const card = ensureCardFoundInHand(player.hand, cardId, socketId);
    if (!card) return;

    return playCard({ card, game: currentGame, player, owner, spotId, socketId, actionTarget });
};

export interface PlayCardOptions {
    card: PlayerCard;
    game: Game;
    player: GamePlayer;
    owner: SpotOwner;
    spotId: MinionSpotId | null;
    socketId: string;
    actionTarget?: ActionTarget | null;
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

    if (card.type === "MINION") {
        if (!opts.spotId) {
            emitSocketEvent(
                "notify_error",
                { error: "Vous ne pouvez pas jouer cette carte ici" },
                opts.socketId,
            );
            return;
        }
        return playMinion({ ...opts, card, spotId: opts.spotId });
    }
    if (card.type === "SPELL") return playSpell({ ...opts, card });
    if (card.type === "WEAPON") return playWeapon({ ...opts, card });
};
