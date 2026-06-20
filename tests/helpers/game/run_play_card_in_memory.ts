import type { ActionTarget, GameData, SpotOwner } from "#api_types/game.types";
import type Game from "#models/game";
import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import {
    ensureCardFoundInHand,
    ensureIsMyTurn,
    whichPlayerAmI,
} from "#controllers/games/game_utils";
import { playMinion } from "#controllers/games/play_card/play_minion";
import { playSpell } from "#controllers/games/play_card/play_spell";
import { playWeapon } from "#controllers/games/play_card/play_weapon";
import {
    computeEffectiveCost,
    refreshGameDynamicCosts,
} from "#galaguerre/dynamic_cost/compute_effective_cost";
import { createInMemoryGame } from "./in_memory_game.js";
import {
    getErrors,
    installSocketCollector,
    restoreSocketCollector,
} from "./socket_event_collector.js";

const TEST_SOCKET_ID = "test-socket";

export type PlayerKey = "playerOne" | "playerTwo";

export interface PlayCardInMemoryAction {
    cardId: string;
    boardIndex: number | null;
    owner: SpotOwner;
    actionTarget?: ActionTarget | null;
}

const withTrainingGame = (data: GameData): Game =>
    createInMemoryGame({ ...data, isTraining: true });

export const runPlayCardInMemory = async (
    data: GameData,
    actor: PlayerKey,
    action: PlayCardInMemoryAction,
): Promise<{ game: Game; errors: string[] }> => {
    const game = withTrainingGame(data);
    const userId = game.data[actor].userId;

    installSocketCollector();

    try {
        if (!ensureIsMyTurn(game, userId, TEST_SOCKET_ID)) {
            return { game, errors: getErrors() };
        }

        const { player } = whichPlayerAmI(game, userId);
        const card = ensureCardFoundInHand(player.hand, action.cardId, TEST_SOCKET_ID);
        if (!card) {
            return { game, errors: getErrors() };
        }

        refreshGameDynamicCosts(game.data);
        const opponent = player === game.data.playerOne ? game.data.playerTwo : game.data.playerOne;
        const effectiveCost = computeEffectiveCost(card, player, opponent);

        if (effectiveCost > player.mana) {
            emitSocketEvent(
                "notify_error",
                { error: "Vous n'avez pas assez de mana pour jouer cette carte" },
                TEST_SOCKET_ID,
            );
            return { game, errors: getErrors() };
        }

        if (card.type === "MINION") {
            if (action.boardIndex === null) {
                emitSocketEvent(
                    "notify_error",
                    { error: "Vous ne pouvez pas jouer cette carte ici" },
                    TEST_SOCKET_ID,
                );
                return { game, errors: getErrors() };
            }

            await playMinion({
                card,
                boardIndex: action.boardIndex,
                owner: action.owner,
                player,
                game,
                socketId: TEST_SOCKET_ID,
                actionTarget: action.actionTarget,
            });
        } else if (card.type === "SPELL") {
            await playSpell({
                card,
                player,
                game,
                socketId: TEST_SOCKET_ID,
                owner: action.owner,
                boardIndex: action.boardIndex,
                actionTarget: action.actionTarget,
            });
        } else if (card.type === "WEAPON") {
            await playWeapon({
                card,
                player,
                game,
                socketId: TEST_SOCKET_ID,
                owner: action.owner,
                boardIndex: action.boardIndex,
            });
        }

        return { game, errors: getErrors() };
    } finally {
        restoreSocketCollector();
    }
};
