import type { GameData } from "#api_types/game.types";
import type { ClientSocketEventByKey } from "#api_types/socket_events";
import { gameMinionAction } from "#controllers/games/minion_action/game_minion_action";
import Game from "#models/game";
import User from "#models/user";
import { addSocketData, removeSocketData } from "#services/sockets/sockets_data";
import type { Assert } from "@japa/assert";
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

export type PlayerKey = "playerOne" | "playerTwo";

export interface MinionActionExpectation {
    error?: string | null;
    isFinished?: boolean;
}

export interface MinionActionScenario {
    data: GameData;
    actor: PlayerKey;
    action: ClientSocketEventByKey["game:minion_action"];
    expect: MinionActionExpectation;
}

export interface MinionActionResult {
    game: Game;
    events: EmittedEvent[];
    errors: string[];
    updates: ReturnType<typeof getGameUpdates>;
}

const createTestUsers = async () => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const playerOne = await User.create({
        email: `p1-${unique}@test.fr`,
        password: "test",
    });

    const playerTwo = await User.create({
        email: `p2-${unique}@test.fr`,
        password: "test",
    });

    return { playerOne, playerTwo };
};

const bindUserIds = (data: GameData, playerOneId: number, playerTwoId: number): GameData => ({
    ...data,
    playerOne: { ...data.playerOne, userId: playerOneId },
    playerTwo: { ...data.playerTwo, userId: playerTwoId },
});

const executeMinionAction = async (
    game: Game,
    actorUserId: number,
    action: ClientSocketEventByKey["game:minion_action"],
): Promise<MinionActionResult> => {
    addSocketData(TEST_SOCKET_ID, actorUserId);
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
    const { playerOne, playerTwo } = await createTestUsers();
    const data = bindUserIds(scenario.data, playerOne.id, playerTwo.id);

    const game = await Game.create({
        playerOneId: playerOne.id,
        playerTwoId: playerTwo.id,
        data,
        isFinished: false,
    });

    const actorUserId = scenario.actor === "playerOne" ? playerOne.id : playerTwo.id;

    const result = await executeMinionAction(game, actorUserId, scenario.action);

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
    }
};
