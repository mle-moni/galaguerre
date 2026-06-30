import Game from "#models/game";
import { TRAINING_AI_USER_ID } from "#services/training/training_constants";
import { randomIntInRange } from "../../utils/random.js";
import { resolveDiscoverChoice } from "../discover/resolve_discover_choice.js";
import { findPlayerByUserId } from "../discover/discover_types.js";
import { runGameActionWithNarrative } from "../game_narrative/run_game_action_with_narrative.js";
import { terminateGame } from "#controllers/games/terminate_game";

const runningAiDiscovers = new Set<number>();

export const isAiDiscoverPending = (game: Game): boolean => {
    const pending = game.data.pendingDiscover;
    return pending?.playerUserId === TRAINING_AI_USER_ID;
};

export const scheduleAiDiscoverIfNeeded = (game: Game): void => {
    if (!game.data.isTraining || !isAiDiscoverPending(game)) return;

    const gameId = game.id;
    if (runningAiDiscovers.has(gameId)) return;

    runningAiDiscovers.add(gameId);

    runAiDiscover(gameId)
        .catch((error) => {
            console.error(`AI discover failed for game ${gameId}:`, error);
        })
        .finally(() => {
            runningAiDiscovers.delete(gameId);
        });
};

const runAiDiscover = async (gameId: number): Promise<void> => {
    const game = await Game.findOrFail(gameId);
    await game.refresh();

    if (!isAiDiscoverPending(game)) return;

    const pending = game.data.pendingDiscover;
    if (!pending || pending.options.length === 0) return;

    const randomIndex = randomIntInRange(0, pending.options.length - 1);
    const cardUuid = pending.options[randomIndex]!.uuid;
    const player = findPlayerByUserId(game, pending.playerUserId);
    if (!player) return;

    await runGameActionWithNarrative(game, async () => {
        const { gameEnded, discoverPending } = resolveDiscoverChoice(game, player, cardUuid);

        if (gameEnded) {
            await terminateGame(game, { skipSendUpdate: true });
            return;
        }

        if (discoverPending) return;
    });

    await game.refresh();
    if (isAiDiscoverPending(game)) {
        scheduleAiDiscoverIfNeeded(game);
    }
};
