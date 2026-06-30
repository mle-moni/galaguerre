import { MinionState } from "#api_types/game.types";
import type { ClientSocketEventByKey } from "#api_types/socket_events";
import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import {
    canMinionAttack,
    ensureIsMyTurn,
    ensureMinionFoundInBoard,
    findMinionInBoard,
    getGameActionInfos,
    getMinionAttacksThisRound,
    getMinionHasCharge,
    getMinionMaxAttacks,
    whichPlayerAmI,
} from "../game_utils.js";
import { ensureNoPendingDiscover } from "../discover/ensure_no_pending_discover.js";
import { minionToHeroAction } from "./minion_to_hero_action.js";
import { minionToMinionAction } from "./minion_to_minion_action.js";

export const gameMinionAction = async (
    socketId: string,
    { minionId, owner, minionUuid }: ClientSocketEventByKey["game:minion_action"],
) => {
    const gameInfos = await getGameActionInfos(socketId);
    if (!gameInfos) return;

    const { currentGame, userId } = gameInfos;

    const isMyTurn = ensureIsMyTurn(currentGame, userId, socketId);
    if (!isMyTurn) return;
    if (!ensureNoPendingDiscover(currentGame, socketId, userId)) return;
    const { player, opponent } = whichPlayerAmI(currentGame, userId);

    const minionInfos = ensureMinionFoundInBoard(player.board, minionId, "PLAYER", socketId);
    if (!minionInfos) return;

    const currentRound = currentGame.data.currentRound;
    const minion = minionInfos.minion;

    if (!canMinionAttack(minion, currentRound)) {
        const error = getMinionAttackError(minion, currentRound);

        emitSocketEvent("notify_error", { error }, socketId);
        return;
    }

    if (minionUuid === null) {
        return minionToHeroAction({
            minionInfos,
            game: currentGame,
            player,
            opponent,
            owner,
            socketId,
        });
    }

    const targetBoard = owner === "PLAYER" ? player.board : opponent.board;
    const targetMinionInfos = findMinionInBoard(targetBoard, minionUuid, owner);
    if (!targetMinionInfos) {
        emitSocketEvent(
            "notify_error",
            { error: "Vous ne pouvez pas jouer ce serviteur ici" },
            socketId,
        );
        return;
    }

    return minionToMinionAction({
        minionInfos,
        game: currentGame,
        player,
        opponent,
        owner,
        targetMinion: targetMinionInfos.minion,
        socketId,
    });
};

function getMinionAttackError(minion: MinionState, currentRound: number): string {
    if (minion.attack <= 0) {
        return "Ce serviteur ne peut pas attaquer sans points d'attaque";
    }
    if (minion.placedAtRound === currentRound && !getMinionHasCharge(minion)) {
        return "Ce serviteur n'est pas encore prêt à attaquer";
    }
    if (getMinionAttacksThisRound(minion, currentRound) >= getMinionMaxAttacks(minion)) {
        return "Ce serviteur a déjà attaqué ce tour";
    }
    return "Ce serviteur n'est pas encore prêt à attaquer";
}
