import type { PlayerCard } from "#api_types/game.types";
import Game from "#models/game";
import { TRAINING_AI_USER_ID } from "#services/training/training_constants";
import { randomIntInRange } from "../../utils/random.js";
import { isSimulating } from "../../utils/simulation_context.js";
import { createDiscoverPicker } from "./advanced/score_discover_option.js";
import { isExpertAi, usesSearchAi } from "./get_ai_difficulty.js";
import { resolveDiscoverChoice } from "../discover/resolve_discover_choice.js";
import { findPlayerByUserId } from "../discover/discover_types.js";
import { runGameActionWithNarrative } from "../game_narrative/run_game_action_with_narrative.js";
import { terminateGame } from "#controllers/games/terminate_game";

const runningAiDiscovers = new Set<number>();

/** L'IA débutante tire au hasard ; l'avancée note chaque option. */
const pickAiDiscoverOption = (game: Game, options: PlayerCard[]): PlayerCard => {
    if (!usesSearchAi(game)) {
        return options[randomIntInRange(0, options.length - 1)]!;
    }

    const pick = createDiscoverPicker(TRAINING_AI_USER_ID, game.data.aiDeckProfile, {
        omniscient: isExpertAi(game),
    });

    return pick(options, game.data);
};

export const isAiDiscoverPending = (game: Game): boolean => {
    const pending = game.data.pendingDiscover;
    return pending?.playerUserId === TRAINING_AI_USER_ID;
};

export const scheduleAiDiscoverIfNeeded = (game: Game): void => {
    if (isSimulating()) return;
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

    const cardUuid = pickAiDiscoverOption(game, pending.options).uuid;
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
