import type { ClientSocketEventByKey } from "#api_types/socket_events";
import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import {
    canWeaponAttack,
    ensureIsMyTurn,
    findMinionInBoard,
    getGameActionInfos,
    getHeroAttacksThisRound,
    whichPlayerAmI,
} from "../game_utils.js";
import { weaponToHeroAction } from "./weapon_to_hero_action.js";
import { weaponToMinionAction } from "./weapon_to_minion_action.js";

export const gameWeaponAction = async (
    socketId: string,
    { minionUuid, owner }: ClientSocketEventByKey["game:weapon_action"],
) => {
    const gameInfos = await getGameActionInfos(socketId);
    if (!gameInfos) return;

    const { currentGame, userId } = gameInfos;

    const isMyTurn = ensureIsMyTurn(currentGame, userId, socketId);
    if (!isMyTurn) return;
    const { player, opponent } = whichPlayerAmI(currentGame, userId);

    const weaponState = player.weaponState;
    if (!weaponState) {
        emitSocketEvent("notify_error", { error: "Vous n'avez pas d'arme équipée" }, socketId);
        return;
    }

    const currentRound = currentGame.data.currentRound;

    if (!canWeaponAttack(player, weaponState, currentRound)) {
        const error =
            getHeroAttacksThisRound(player, currentRound) >= 1
                ? "Vous avez déjà attaqué avec votre arme ce tour"
                : "Votre arme n'est pas prête à attaquer";

        emitSocketEvent("notify_error", { error }, socketId);
        return;
    }

    if (minionUuid === null) {
        return weaponToHeroAction({
            weaponState,
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
            { error: "Vous ne pouvez pas attaquer ce serviteur ici" },
            socketId,
        );
        return;
    }

    return weaponToMinionAction({
        weaponState,
        game: currentGame,
        player,
        opponent,
        owner,
        targetMinion: targetMinionInfos.minion,
        socketId,
    });
};
