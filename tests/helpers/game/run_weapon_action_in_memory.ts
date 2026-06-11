import type { GameData, MinionSpotId, SpotOwner } from "#api_types/game.types";
import type Game from "#models/game";
import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import {
    canWeaponAttack,
    ensureIsMyTurn,
    getHeroAttacksThisRound,
    whichPlayerAmI,
} from "#controllers/games/game_utils";
import { weaponToHeroAction } from "#controllers/games/weapon_action/weapon_to_hero_action";
import { weaponToMinionAction } from "#controllers/games/weapon_action/weapon_to_minion_action";
import { createInMemoryGame } from "./in_memory_game.js";
import {
    getErrors,
    installSocketCollector,
    restoreSocketCollector,
} from "./socket_event_collector.js";

const TEST_SOCKET_ID = "test-socket";

export type PlayerKey = "playerOne" | "playerTwo";

export interface WeaponActionInMemoryAction {
    spotId: MinionSpotId | null;
    owner: SpotOwner;
}

const withTrainingGame = (data: GameData): Game =>
    createInMemoryGame({ ...data, isTraining: true });

export const runWeaponActionInMemory = async (
    data: GameData,
    actor: PlayerKey,
    action: WeaponActionInMemoryAction,
): Promise<{ game: Game; errors: string[] }> => {
    const game = withTrainingGame(data);
    const userId = game.data[actor].userId;

    installSocketCollector();

    try {
        if (!ensureIsMyTurn(game, userId, TEST_SOCKET_ID)) {
            return { game, errors: getErrors() };
        }

        const { player, opponent } = whichPlayerAmI(game, userId);
        const weaponState = player.weaponState;

        if (!weaponState) {
            emitSocketEvent(
                "notify_error",
                { error: "Vous n'avez pas d'arme équipée" },
                TEST_SOCKET_ID,
            );
            return { game, errors: getErrors() };
        }

        const currentRound = game.data.currentRound;

        if (!canWeaponAttack(player, weaponState, currentRound)) {
            const error =
                getHeroAttacksThisRound(player, currentRound) >= 1
                    ? "Vous avez déjà attaqué avec votre arme ce tour"
                    : "Votre arme n'est pas prête à attaquer";

            emitSocketEvent("notify_error", { error }, TEST_SOCKET_ID);
            return { game, errors: getErrors() };
        }

        if (action.spotId === null) {
            await weaponToHeroAction({
                weaponState,
                game,
                player,
                opponent,
                owner: action.owner,
                socketId: TEST_SOCKET_ID,
            });
        } else {
            await weaponToMinionAction({
                weaponState,
                game,
                player,
                opponent,
                owner: action.owner,
                spotId: action.spotId,
                socketId: TEST_SOCKET_ID,
            });
        }

        return { game, errors: getErrors() };
    } finally {
        restoreSocketCollector();
    }
};

export const runWeaponActionOnGameInMemory = async (
    game: Game,
    actor: PlayerKey,
    action: WeaponActionInMemoryAction,
): Promise<{ game: Game; errors: string[] }> => runWeaponActionInMemory(game.data, actor, action);
