import type { ApiGame } from "#api_types/game.types";
import type { SocketEventByKey } from "#api_types/socket_events";
import { WS } from "#services/sockets/ws_service";
import type { Server } from "socket.io";
import type { Assert } from "@japa/assert";

export interface EmittedEvent {
    event: string;
    data: unknown;
    rooms: string | string[];
}

let emittedEvents: EmittedEvent[] = [];
let originalIo: Server | undefined;

const createBroadcastOperator = (rooms: string | string[]) => ({
    emit(event: string, data: unknown) {
        emittedEvents.push({ event, data, rooms });
    },
    except(_exceptRooms: string | string[]) {
        return createBroadcastOperator(rooms);
    },
});

export const installSocketCollector = (): void => {
    emittedEvents = [];
    originalIo = WS.io;
    WS.io = {
        to(rooms: string | string[]) {
            return createBroadcastOperator(rooms);
        },
    } as Server;
};

export const restoreSocketCollector = (): void => {
    WS.io = originalIo;
};

export const getEmittedEvents = (): EmittedEvent[] => [...emittedEvents];

export const getErrors = (): string[] => {
    return emittedEvents
        .filter((e) => e.event === "notify_error")
        .map((e) => (e.data as SocketEventByKey["notify_error"]).error);
};

export const getGameUpdates = (): ApiGame[] => {
    return emittedEvents
        .filter((e) => e.event === "game:update")
        .map((e) => (e.data as SocketEventByKey["game:update"]).game);
};

export const assertNoError = (assert: Assert): void => {
    const errors = getErrors();
    assert.equal(errors.length, 0, `Expected no error, got: ${errors.join(", ")}`);
};

export const assertError = (assert: Assert, expected: string): void => {
    const errors = getErrors();
    assert.equal(errors.length, 1, `Expected exactly one error, got: ${errors.join(", ")}`);
    assert.equal(errors[0], expected);
};

export const assertGameUpdated = (assert: Assert): void => {
    const updates = getGameUpdates();
    assert.isAbove(updates.length, 0, "Expected at least one game:update event");
};

export const assertBothPlayersUpdated = (assert: Assert): void => {
    const updateEvents = emittedEvents.filter((e) => e.event === "game:update");
    assert.equal(updateEvents.length, 2, "Expected exactly two game:update events");
};

export const assertOpponentHandHidden = (
    assert: Assert,
    viewerUserId: number,
    opponentUserId: number,
    opponentHandSize: number,
): void => {
    const updateEvents = emittedEvents.filter((e) => e.event === "game:update");
    const viewerUpdate = updateEvents.find((e) => e.rooms === `users:${viewerUserId}`);
    assert.isDefined(viewerUpdate, "Expected game:update for viewer");

    const game = (viewerUpdate!.data as SocketEventByKey["game:update"]).game;
    const opponent =
        game.data.playerOne.userId === opponentUserId ? game.data.playerOne : game.data.playerTwo;

    assert.equal(opponent.hand.length, opponentHandSize);
    for (const card of opponent.hand) {
        assert.equal(card.label, "dummy card");
    }
};
