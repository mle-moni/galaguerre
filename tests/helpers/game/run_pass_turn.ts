import type { GameData } from "#api_types/game.types";
import { passGameTurn } from "#controllers/games/pass_game_turn";
import { setupNextGameTurn } from "#controllers/games/setup_next_game_turn";
import Game from "#models/game";
import { addSocketData, removeSocketData } from "#services/sockets/sockets_data";
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

export interface PassTurnExpectation {
    error?: string | null;
    isFinished?: boolean;
}

export interface PassTurnRunOptions {
    authenticated?: boolean;
    outsider?: boolean;
}

export interface PassTurnScenario {
    data: GameData;
    actor: PlayerKey;
    expect: PassTurnExpectation;
    options?: PassTurnRunOptions;
}

export interface PassTurnResult {
    game: Game;
    events: EmittedEvent[];
    errors: string[];
    updates: ReturnType<typeof getGameUpdates>;
}

const executePassTurn = async (
    game: Game,
    actorUserId: number | null,
    authenticated = true,
): Promise<PassTurnResult> => {
    if (authenticated && actorUserId !== null) {
        addSocketData(TEST_SOCKET_ID, actorUserId);
    }

    installSocketCollector();

    try {
        await passGameTurn(TEST_SOCKET_ID);
    } finally {
        removeSocketData(TEST_SOCKET_ID);
        restoreSocketCollector();
    }

    await game.refresh();

    return {
        game,
        events: getEmittedEvents(),
        errors: getErrors(),
        updates: getGameUpdates(),
    };
};

export const runPassTurn = async (
    scenario: PassTurnScenario,
): Promise<PassTurnResult & { actorUserId: number }> => {
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

    const result = await executePassTurn(game, authenticated ? actorUserId : null, authenticated);

    return { ...result, actorUserId };
};

export const runPassTurnOnGame = async (
    game: Game,
    actorUserId: number,
): Promise<PassTurnResult> => {
    return executePassTurn(game, actorUserId);
};

export const runSetupNextTurnOnGame = async (game: Game): Promise<PassTurnResult> => {
    installSocketCollector();

    try {
        await setupNextGameTurn(game);
    } finally {
        restoreSocketCollector();
    }

    await game.refresh();

    return {
        game,
        events: getEmittedEvents(),
        errors: getErrors(),
        updates: getGameUpdates(),
    };
};

export const assertPassTurnScenario = (
    assert: Assert,
    result: PassTurnResult,
    expect: PassTurnExpectation,
): void => {
    if (expect.error) {
        assertError(assert, expect.error);
    } else if (expect.error === null) {
        assertNoError(assert);
        assertGameUpdated(assert);
    }

    if (expect.isFinished !== undefined) {
        assert.equal(result.game.isFinished, expect.isFinished);
        if (expect.isFinished) {
            assert.equal(result.game.data.state, "FINISHED");
        }
    }
};
