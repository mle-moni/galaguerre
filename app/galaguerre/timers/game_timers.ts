import Game from "#models/game";
import { performPassTurn } from "#controllers/games/pass_game_turn";
import { finalizeMulligan } from "#controllers/games/mulligan/finalize_mulligan";
import { autoConfirmPendingMulligans } from "#controllers/games/mulligan/perform_mulligan";
import { scheduleAiMulliganIfNeeded } from "../ai/schedule_ai_mulligan.js";
import { scheduleAiTurnIfNeeded } from "../ai/schedule_ai_turn.js";
import { autoResolveAllPendingDiscovers } from "../discover/resolve_discover_choice.js";
import { runGameActionWithNarrative } from "../game_narrative/run_game_action_with_narrative.js";
import { terminateGame } from "#controllers/games/terminate_game";

const MULLIGAN_TIMER_MS = 60_000;
const TURN_TIMER_MS = 105_000;

const shouldUseGameTimers = (): boolean => process.env.NODE_ENV !== "test";

let mulliganTimerMs = MULLIGAN_TIMER_MS;
let turnTimerMs = TURN_TIMER_MS;

const mulliganTimers = new Map<number, ReturnType<typeof setTimeout>>();
const turnTimers = new Map<number, ReturnType<typeof setTimeout>>();

export const setGameTimerDurationsForTests = (mulliganMs: number, turnMs: number): void => {
    mulliganTimerMs = mulliganMs;
    turnTimerMs = turnMs;
};

export const resetGameTimerDurationsForTests = (): void => {
    mulliganTimerMs = MULLIGAN_TIMER_MS;
    turnTimerMs = TURN_TIMER_MS;
};

export const clearMulliganTimer = (gameId: number): void => {
    const timer = mulliganTimers.get(gameId);
    if (timer) {
        clearTimeout(timer);
        mulliganTimers.delete(gameId);
    }
};

export const clearTurnTimer = (gameId: number): void => {
    const timer = turnTimers.get(gameId);
    if (timer) {
        clearTimeout(timer);
        turnTimers.delete(gameId);
    }
};

export const clearAllGameTimers = (gameId: number): void => {
    clearMulliganTimer(gameId);
    clearTurnTimer(gameId);
};

const scheduleMulliganTimer = async (gameId: number, expectedEndsAt: number): Promise<void> => {
    clearMulliganTimer(gameId);

    const remainingMs = expectedEndsAt - Date.now();
    if (remainingMs <= 0) {
        await handleMulliganTimerExpired(gameId, expectedEndsAt);
        return;
    }

    if (!shouldUseGameTimers()) return;

    const timer = setTimeout(() => {
        void handleMulliganTimerExpired(gameId, expectedEndsAt);
    }, remainingMs);

    mulliganTimers.set(gameId, timer);
};

const scheduleTurnTimer = async (gameId: number, expectedEndsAt: number): Promise<void> => {
    clearTurnTimer(gameId);

    const remainingMs = expectedEndsAt - Date.now();
    if (remainingMs <= 0) {
        await handleTurnTimerExpired(gameId, expectedEndsAt);
        return;
    }

    if (!shouldUseGameTimers()) return;

    const timer = setTimeout(() => {
        void handleTurnTimerExpired(gameId, expectedEndsAt);
    }, remainingMs);

    turnTimers.set(gameId, timer);
};

export const startMulliganTimer = (game: Game): void => {
    const expectedEndsAt = Date.now() + mulliganTimerMs;
    game.data.mulliganEndsAt = expectedEndsAt;
    void scheduleMulliganTimer(game.id, expectedEndsAt);
};

export const startTurnTimer = (game: Game): void => {
    const expectedEndsAt = Date.now() + turnTimerMs;
    game.data.turnEndsAt = expectedEndsAt;
    void scheduleTurnTimer(game.id, expectedEndsAt);
};

export const restoreGameTimers = async (): Promise<void> => {
    const games = await Game.query().where("isFinished", false);

    for (const game of games) {
        if (game.data.mulliganEndsAt) {
            await scheduleMulliganTimer(game.id, game.data.mulliganEndsAt);
        }

        if (game.data.turnEndsAt) {
            await scheduleTurnTimer(game.id, game.data.turnEndsAt);
        }

        if (game.data.isTraining) {
            scheduleAiMulliganIfNeeded(game);
            scheduleAiTurnIfNeeded(game);
        }
    }
};

export const handleMulliganTimerExpired = async (
    gameId: number,
    expectedEndsAt: number,
): Promise<void> => {
    mulliganTimers.delete(gameId);

    try {
        const game = await Game.find(gameId);
        if (!game || game.isFinished || game.data.state !== "MULLIGAN") return;
        if (game.data.mulliganEndsAt !== expectedEndsAt) return;

        autoConfirmPendingMulligans(game);
        await game.save();
        await finalizeMulligan(game);
    } catch (error) {
        console.error(`Mulligan timer failed for game ${gameId}:`, error);
    }
};

export const handleTurnTimerExpired = async (
    gameId: number,
    expectedEndsAt: number,
): Promise<void> => {
    turnTimers.delete(gameId);

    try {
        const game = await Game.find(gameId);
        if (!game || game.isFinished) return;
        if (game.data.turnEndsAt !== expectedEndsAt) return;

        const activeState = game.data.state;
        if (activeState !== "PLAYER_ONE_TURN" && activeState !== "PLAYER_TWO_TURN") return;

        const activePlayer =
            activeState === "PLAYER_ONE_TURN" ? game.data.playerOne : game.data.playerTwo;

        if (game.data.pendingDiscover) {
            await runGameActionWithNarrative(game, async () => {
                const { gameEnded } = autoResolveAllPendingDiscovers(game);
                if (gameEnded) {
                    await terminateGame(game, { skipSendUpdate: true });
                }
            });

            await game.refresh();
            if (game.isFinished || game.data.pendingDiscover) return;
        }

        await performPassTurn(game, activePlayer);
    } catch (error) {
        console.error(`Turn timer failed for game ${gameId}:`, error);
    }
};
