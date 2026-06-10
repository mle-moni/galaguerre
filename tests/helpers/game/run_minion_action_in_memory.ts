import type { GameData, MinionSpotId, MinionState, SpotOwner } from "#api_types/game.types";
import type Game from "#models/game";
import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import {
    canMinionAttack,
    ensureIsMyTurn,
    ensureMinionFoundInBoard,
    getMinionAttacksThisRound,
    getMinionHasCharge,
    getMinionMaxAttacks,
    whichPlayerAmI,
} from "#controllers/games/game_utils";
import { minionToHeroAction } from "#controllers/games/minion_action/minion_to_hero_action";
import { minionToMinionAction } from "#controllers/games/minion_action/minion_to_minion_action";
import { createInMemoryGame } from "./in_memory_game.js";
import {
    getErrors,
    installSocketCollector,
    restoreSocketCollector,
} from "./socket_event_collector.js";

const TEST_SOCKET_ID = "test-socket";

export type PlayerKey = "playerOne" | "playerTwo";

export interface MinionActionInMemoryAction {
    minionId: string;
    spotId: MinionSpotId | null;
    owner: SpotOwner;
}

const withTrainingGame = (data: GameData): Game =>
    createInMemoryGame({ ...data, isTraining: true });

const getMinionAttackError = (minion: MinionState, currentRound: number): string => {
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
};

export const runMinionActionInMemory = async (
    data: GameData,
    actor: PlayerKey,
    action: MinionActionInMemoryAction,
): Promise<{ game: Game; errors: string[] }> => {
    const game = withTrainingGame(data);
    const userId = game.data[actor].userId;

    installSocketCollector();

    try {
        if (!ensureIsMyTurn(game, userId, TEST_SOCKET_ID)) {
            return { game, errors: getErrors() };
        }

        const { player, opponent } = whichPlayerAmI(game, userId);
        const minionInfos = ensureMinionFoundInBoard(
            player.board,
            action.minionId,
            "PLAYER",
            TEST_SOCKET_ID,
        );
        if (!minionInfos) {
            return { game, errors: getErrors() };
        }

        const currentRound = game.data.currentRound;
        const minion = minionInfos.minion;

        if (!canMinionAttack(minion, currentRound)) {
            emitSocketEvent(
                "notify_error",
                { error: getMinionAttackError(minion, currentRound) },
                TEST_SOCKET_ID,
            );
            return { game, errors: getErrors() };
        }

        if (action.spotId === null) {
            await minionToHeroAction({
                minionInfos,
                game,
                player,
                opponent,
                owner: action.owner,
                socketId: TEST_SOCKET_ID,
            });
        } else {
            await minionToMinionAction({
                minionInfos,
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

export const runMinionActionOnGameInMemory = async (
    game: Game,
    actor: PlayerKey,
    action: MinionActionInMemoryAction,
): Promise<{ game: Game; errors: string[] }> => runMinionActionInMemory(game.data, actor, action);
