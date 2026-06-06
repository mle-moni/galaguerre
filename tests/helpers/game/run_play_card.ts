import type { GameData } from "#api_types/game.types";
import type { ClientSocketEventByKey } from "#api_types/socket_events";
import { gamePlayCard } from "#controllers/games/play_card/game_play_card";
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

export interface PlayCardExpectation {
    error?: string | null;
}

export interface PlayCardRunOptions {
    authenticated?: boolean;
    outsider?: boolean;
}

export interface PlayCardScenario {
    data: GameData;
    actor: PlayerKey;
    action: ClientSocketEventByKey["game:play_card"];
    expect: PlayCardExpectation;
    options?: PlayCardRunOptions;
}

export interface PlayCardResult {
    game: Game;
    events: EmittedEvent[];
    errors: string[];
    updates: ReturnType<typeof getGameUpdates>;
}

const executePlayCard = async (
    game: Game,
    actorUserId: number | null,
    action: ClientSocketEventByKey["game:play_card"],
    authenticated = true,
): Promise<PlayCardResult> => {
    if (authenticated && actorUserId !== null) {
        addSocketData(TEST_SOCKET_ID, actorUserId);
    }

    installSocketCollector();

    try {
        await gamePlayCard(TEST_SOCKET_ID, action);
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

export const runPlayCard = async (
    scenario: PlayCardScenario,
): Promise<PlayCardResult & { actorUserId: number }> => {
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

    const result = await executePlayCard(
        game,
        authenticated ? actorUserId : null,
        scenario.action,
        authenticated,
    );

    return { ...result, actorUserId };
};

export const runPlayCardOnGame = async (
    game: Game,
    actorUserId: number,
    action: ClientSocketEventByKey["game:play_card"],
): Promise<PlayCardResult> => {
    return executePlayCard(game, actorUserId, action);
};

export const assertPlayCardScenario = (
    assert: Assert,
    result: PlayCardResult,
    expect: PlayCardExpectation,
): void => {
    if (expect.error) {
        assertError(assert, expect.error);
    } else if (expect.error === null) {
        assertNoError(assert);
        assertGameUpdated(assert);
    }
};
