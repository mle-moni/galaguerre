import Game from "#models/game";
import { performPassTurn } from "#controllers/games/pass_game_turn";
import { finalizeMulligan } from "#controllers/games/mulligan/finalize_mulligan";
import { autoConfirmPendingMulligans } from "#controllers/games/mulligan/perform_mulligan";

const MULLIGAN_TIMER_MS = 60_000;
const TURN_TIMER_MS = 75_000;

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

export const startMulliganTimer = (game: Game): void => {
    if (!shouldUseGameTimers()) return;

    clearMulliganTimer(game.id);

    const expectedEndsAt = Date.now() + mulliganTimerMs;
    game.data.mulliganEndsAt = expectedEndsAt;

    const gameId = game.id;
    const timer = setTimeout(() => {
        void handleMulliganTimerExpired(gameId, expectedEndsAt);
    }, mulliganTimerMs);

    mulliganTimers.set(gameId, timer);
};

export const startTurnTimer = (game: Game): void => {
    if (!shouldUseGameTimers()) return;

    clearTurnTimer(game.id);

    const expectedEndsAt = Date.now() + turnTimerMs;
    game.data.turnEndsAt = expectedEndsAt;

    const gameId = game.id;
    const timer = setTimeout(() => {
        void handleTurnTimerExpired(gameId, expectedEndsAt);
    }, turnTimerMs);

    turnTimers.set(gameId, timer);
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

        await performPassTurn(game, activePlayer);
    } catch (error) {
        console.error(`Turn timer failed for game ${gameId}:`, error);
    }
};
