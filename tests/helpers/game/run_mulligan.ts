import type { GameData } from "#api_types/game.types";
import { gameMulligan } from "#controllers/games/mulligan/game_mulligan";
import type Game from "#models/game";
import { addSocketData, removeSocketData } from "#services/sockets/sockets_data";
import { clearAllGameTimers } from "../../../app/galaguerre/timers/game_timers.js";
import type { Assert } from "@japa/assert";
import {
    createOutsiderUser,
    createTestGame,
    getActorUserId,
    type PlayerKey,
} from "./game_factory.js";
import {
    assertError,
    assertGameUpdated,
    assertNoError,
    getEmittedEvents,
    getErrors,
    getGameUpdates,
    installSocketCollector,
    restoreSocketCollector,
    type EmittedEvent,
} from "./socket_event_collector.js";

const TEST_SOCKET_ID = "test-socket";

export interface MulliganExpectation {
    error?: string | null;
}

export interface MulliganRunOptions {
    authenticated?: boolean;
    outsider?: boolean;
}

export interface MulliganScenario {
    data: GameData;
    actor: PlayerKey;
    cardIds: string[];
    expect: MulliganExpectation;
    options?: MulliganRunOptions;
}

export interface MulliganResult {
    game: Game;
    events: EmittedEvent[];
    errors: string[];
    updates: ReturnType<typeof getGameUpdates>;
}

const executeMulligan = async (
    game: Game,
    actorUserId: number | null,
    cardIds: string[],
    authenticated = true,
): Promise<MulliganResult> => {
    if (authenticated && actorUserId !== null) {
        addSocketData(TEST_SOCKET_ID, actorUserId);
    }

    installSocketCollector();

    try {
        await gameMulligan(TEST_SOCKET_ID, { cardIds });
    } finally {
        removeSocketData(TEST_SOCKET_ID);
        restoreSocketCollector();
    }

    await game.refresh();

    clearAllGameTimers(game.id);

    return {
        game,
        events: getEmittedEvents(),
        errors: getErrors(),
        updates: getGameUpdates(),
    };
};

export const runMulligan = async (
    scenario: MulliganScenario,
): Promise<MulliganResult & { actorUserId: number }> => {
    const { game, playerOne, playerTwo } = await createTestGame(scenario.data);

    const options = scenario.options ?? {};
    const authenticated = options.authenticated ?? true;

    let actorUserId: number;
    if (options.outsider) {
        const outsider = await createOutsiderUser();
        actorUserId = outsider.id;
    } else {
        actorUserId = getActorUserId(playerOne, playerTwo, scenario.actor);
    }

    const result = await executeMulligan(
        game,
        authenticated ? actorUserId : null,
        scenario.cardIds,
        authenticated,
    );

    return { ...result, actorUserId };
};

export const runMulliganOnGame = async (
    game: Game,
    actorUserId: number,
    cardIds: string[],
): Promise<MulliganResult> => {
    return executeMulligan(game, actorUserId, cardIds);
};

export const assertMulliganScenario = (
    assert: Assert,
    _result: MulliganResult,
    expect: MulliganExpectation,
): void => {
    if (expect.error) {
        assertError(assert, expect.error);
    } else if (expect.error === null) {
        assertNoError(assert);
        assertGameUpdated(assert);
    }
};
