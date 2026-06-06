import type { ClientSocketEventByKey } from "#api_types/socket_events";
import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import {
    canWeaponAttack,
    ensureIsMyTurn,
    getGameActionInfos,
    getWeaponAttacksThisRound,
    whichPlayerAmI,
} from "../game_utils.js";
import { weaponToHeroAction } from "./weapon_to_hero_action.js";
import { weaponToMinionAction } from "./weapon_to_minion_action.js";

export const gameWeaponAction = async (
    socketId: string,
    { spotId, owner }: ClientSocketEventByKey["game:weapon_action"],
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

    if (!canWeaponAttack(weaponState, currentRound)) {
        const error =
            getWeaponAttacksThisRound(weaponState, currentRound) >= 1
                ? "Vous avez déjà attaqué avec votre arme ce tour"
                : "Votre arme n'est pas prête à attaquer";

        emitSocketEvent("notify_error", { error }, socketId);
        return;
    }

    if (spotId === null) {
        return weaponToHeroAction({
            weaponState,
            game: currentGame,
            player,
            opponent,
            owner,
            socketId,
        });
    }

    return weaponToMinionAction({
        weaponState,
        game: currentGame,
        player,
        opponent,
        owner,
        spotId,
        socketId,
    });
};
