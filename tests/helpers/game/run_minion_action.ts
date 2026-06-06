import type { GameData } from "#api_types/game.types";
import type { ClientSocketEventByKey } from "#api_types/socket_events";
import { gameMinionAction } from "#controllers/games/minion_action/game_minion_action";
import type Game from "#models/game";
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

export type { PlayerKey };

export interface MinionActionExpectation {
    error?: string | null;
    isFinished?: boolean;
}

export interface MinionActionRunOptions {
    /** When false, no socket data is registered (unauthenticated socket). */
    authenticated?: boolean;
    /** Use a third user who is not part of the game. */
    outsider?: boolean;
}

export interface MinionActionScenario {
    data: GameData;
    actor: PlayerKey;
    action: ClientSocketEventByKey["game:minion_action"];
    expect: MinionActionExpectation;
    isFinished?: boolean;
    options?: MinionActionRunOptions;
}

export interface MinionActionResult {
    game: Game;
    events: EmittedEvent[];
    errors: string[];
    updates: ReturnType<typeof getGameUpdates>;
}

const executeMinionAction = async (
    game: Game,
    actorUserId: number | null,
    action: ClientSocketEventByKey["game:minion_action"],
    authenticated = true,
): Promise<MinionActionResult> => {
    if (authenticated && actorUserId !== null) {
        addSocketData(TEST_SOCKET_ID, actorUserId);
    }

    installSocketCollector();

    try {
        await gameMinionAction(TEST_SOCKET_ID, action);
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

export const runMinionAction = async (
    scenario: MinionActionScenario,
): Promise<MinionActionResult & { actorUserId: number }> => {
    const { game, playerOne, playerTwo } = await createTestGame(scenario.data, {
        isFinished: scenario.isFinished,
    });

    const options = scenario.options ?? {};
    const authenticated = options.authenticated ?? true;

    let actorUserId: number;
    if (options.outsider) {
        const outsider = await createOutsiderUser();
        actorUserId = outsider.id;
    } else {
        actorUserId = getActorUserId(playerOne, playerTwo, scenario.actor);
    }

    const result = await executeMinionAction(
        game,
        authenticated ? actorUserId : null,
        scenario.action,
        authenticated,
    );

    return { ...result, actorUserId };
};

export const runMinionActionOnGame = async (
    game: Game,
    actorUserId: number,
    action: ClientSocketEventByKey["game:minion_action"],
): Promise<MinionActionResult> => {
    return executeMinionAction(game, actorUserId, action);
};

export const assertMinionActionScenario = (
    assert: Assert,
    result: MinionActionResult,
    expect: MinionActionExpectation,
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
