import type { ActionTarget, GamePlayer, PlayerCard, SpotOwner } from "#api_types/game.types";
import type { ClientSocketEventByKey } from "#api_types/socket_events";
import type Game from "#models/game";
import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import {
    computeEffectiveCost,
    refreshGameDynamicCosts,
} from "../../../galaguerre/dynamic_cost/compute_effective_cost.js";
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
    { cardId, owner, boardIndex, actionTarget }: ClientSocketEventByKey["game:play_card"],
) => {
    const gameInfos = await getGameActionInfos(socketId);
    if (!gameInfos) return;

    const { currentGame, userId } = gameInfos;

    const isMyTurn = ensureIsMyTurn(currentGame, userId, socketId);
    if (!isMyTurn) return;
    const { player } = whichPlayerAmI(currentGame, userId);

    const card = ensureCardFoundInHand(player.hand, cardId, socketId);
    if (!card) return;

    return playCard({ card, game: currentGame, player, owner, boardIndex, socketId, actionTarget });
};

export interface PlayCardOptions {
    card: PlayerCard;
    game: Game;
    player: GamePlayer;
    owner: SpotOwner;
    boardIndex: number | null;
    socketId: string;
    actionTarget?: ActionTarget | null;
}

const playCard = async (opts: PlayCardOptions) => {
    const { card, game, player } = opts;

    refreshGameDynamicCosts(game.data);
    const opponent = player === game.data.playerOne ? game.data.playerTwo : game.data.playerOne;
    const effectiveCost = computeEffectiveCost(card, player, opponent);

    if (effectiveCost > player.mana) {
        emitSocketEvent(
            "notify_error",
            { error: "Vous n'avez pas assez de mana pour jouer cette carte" },
            opts.socketId,
        );
        return;
    }

    if (card.type === "MINION") {
        if (opts.boardIndex === null) {
            emitSocketEvent(
                "notify_error",
                { error: "Vous ne pouvez pas jouer cette carte ici" },
                opts.socketId,
            );
            return;
        }
        return playMinion({ ...opts, card, boardIndex: opts.boardIndex });
    }
    if (card.type === "SPELL") return playSpell({ ...opts, card });
    if (card.type === "WEAPON") return playWeapon({ ...opts, card });
};
