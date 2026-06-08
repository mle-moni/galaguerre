import type { GameData } from "#api_types/game.types";
import { abandonGame } from "#controllers/games/abandon_game";
import type Game from "#models/game";
import { addAiSocketData, addSocketData, removeSocketData } from "#services/sockets/sockets_data";
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

export interface AbandonGameExpectation {
    error?: string | null;
    isFinished?: boolean;
}

export interface AbandonGameRunOptions {
    authenticated?: boolean;
    outsider?: boolean;
    ai?: boolean;
}

export interface AbandonGameScenario {
    data: GameData;
    actor: PlayerKey;
    expect: AbandonGameExpectation;
    options?: AbandonGameRunOptions;
    gameOptions?: { isFinished?: boolean };
}

export interface AbandonGameResult {
    game: Game;
    events: EmittedEvent[];
    errors: string[];
    updates: ReturnType<typeof getGameUpdates>;
}

const executeAbandonGame = async (
    game: Game,
    actorUserId: number | null,
    options: { authenticated?: boolean; ai?: boolean } = {},
): Promise<AbandonGameResult> => {
    const { authenticated = true, ai = false } = options;

    if (authenticated && actorUserId !== null) {
        if (ai) {
            addAiSocketData(TEST_SOCKET_ID, actorUserId, game.id);
        } else {
            addSocketData(TEST_SOCKET_ID, actorUserId);
        }
    }

    installSocketCollector();

    try {
        await abandonGame(TEST_SOCKET_ID);
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

export const runAbandonGame = async (
    scenario: AbandonGameScenario,
): Promise<AbandonGameResult & { actorUserId: number }> => {
    const { game, playerOne, playerTwo } = await createTestGame(
        scenario.data,
        scenario.gameOptions ?? {},
    );

    const options = scenario.options ?? {};
    const authenticated = options.authenticated ?? true;

    let actorUserId: number;
    if (options.outsider) {
        const outsider = await createOutsiderUser();
        actorUserId = outsider.id;
    } else {
        actorUserId = getActorUserId(playerOne, playerTwo, scenario.actor);
    }

    const result = await executeAbandonGame(game, authenticated ? actorUserId : null, {
        authenticated,
        ai: options.ai,
    });

    return { ...result, actorUserId };
};

export const runAbandonGameOnGame = async (
    game: Game,
    actorUserId: number,
    options: { ai?: boolean } = {},
): Promise<AbandonGameResult> => {
    return executeAbandonGame(game, actorUserId, options);
};

export const assertAbandonGameScenario = (
    assert: Assert,
    result: AbandonGameResult,
    expect: AbandonGameExpectation,
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
