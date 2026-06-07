import type { GameData } from "#api_types/game.types";
import type { ClientSocketEventByKey } from "#api_types/socket_events";
import { gameWeaponAction } from "#controllers/games/weapon_action/game_weapon_action";
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

export interface WeaponActionExpectation {
    error?: string | null;
    isFinished?: boolean;
}

export interface WeaponActionRunOptions {
    authenticated?: boolean;
    outsider?: boolean;
}

export interface WeaponActionScenario {
    data: GameData;
    actor: PlayerKey;
    action: ClientSocketEventByKey["game:weapon_action"];
    expect: WeaponActionExpectation;
    isFinished?: boolean;
    options?: WeaponActionRunOptions;
}

export interface WeaponActionResult {
    game: Game;
    events: EmittedEvent[];
    errors: string[];
    updates: ReturnType<typeof getGameUpdates>;
}

const executeWeaponAction = async (
    game: Game,
    actorUserId: number | null,
    action: ClientSocketEventByKey["game:weapon_action"],
    authenticated = true,
): Promise<WeaponActionResult> => {
    if (authenticated && actorUserId !== null) {
        addSocketData(TEST_SOCKET_ID, actorUserId);
    }

    installSocketCollector();

    try {
        await gameWeaponAction(TEST_SOCKET_ID, action);
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

export const runWeaponAction = async (
    scenario: WeaponActionScenario,
): Promise<WeaponActionResult & { actorUserId: number }> => {
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

    const result = await executeWeaponAction(
        game,
        authenticated ? actorUserId : null,
        scenario.action,
        authenticated,
    );

    return { ...result, actorUserId };
};

export const runWeaponActionOnGame = async (
    game: Game,
    actorUserId: number,
    action: ClientSocketEventByKey["game:weapon_action"],
): Promise<WeaponActionResult> => {
    return executeWeaponAction(game, actorUserId, action);
};

export const assertWeaponActionScenario = (
    assert: Assert,
    result: WeaponActionResult,
    expect: WeaponActionExpectation,
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
