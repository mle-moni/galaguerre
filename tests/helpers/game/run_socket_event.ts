import { MINION_SPOT_IDS, SPOT_OWNERS } from "#api_types/game.types";
import { joinAuthRestrictedEvents } from "#controllers/auth/socket/auth_restricted_events";
import { addSocketData, removeSocketData } from "#services/sockets/sockets_data";
import vine from "@vinejs/vine";
import type { Socket } from "socket.io";
import { createTestGame } from "./game_factory.js";
import { createGameData } from "./fixtures.js";
import {
    getErrors,
    installSocketCollector,
    restoreSocketCollector,
} from "./socket_event_collector.js";

const TEST_SOCKET_ID = "test-socket";

type ClientEventHandler = (data: unknown) => void;

const createMockSocket = (): Socket & { getHandler: (event: string) => ClientEventHandler } => {
    const handlers: Record<string, ClientEventHandler> = {};

    return {
        id: TEST_SOCKET_ID,
        on(event: string, handler: ClientEventHandler) {
            handlers[event] = handler;
        },
        removeAllListeners() {
            for (const key of Object.keys(handlers)) {
                delete handlers[key];
            }
        },
        getHandler(event: string) {
            const handler = handlers[event];
            if (!handler) throw new Error(`No handler registered for event '${event}'`);
            return handler;
        },
    } as Socket & { getHandler: (event: string) => ClientEventHandler };
};

const flushAsync = async () => {
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
};

export const runInvalidMinionActionPayload = async (payload: unknown): Promise<string[]> => {
    const { game, playerOne } = await createTestGame(createGameData());
    addSocketData(TEST_SOCKET_ID, playerOne.id);
    installSocketCollector();

    const socket = createMockSocket();
    joinAuthRestrictedEvents(socket);

    try {
        socket.getHandler("game:minion_action")(payload);
        await flushAsync();
    } finally {
        removeSocketData(TEST_SOCKET_ID);
        restoreSocketCollector();
    }

    await game.refresh();
    return getErrors();
};

export const runInvalidPlayCardPayload = async (payload: unknown): Promise<string[]> => {
    const { game, playerOne } = await createTestGame(createGameData());
    addSocketData(TEST_SOCKET_ID, playerOne.id);
    installSocketCollector();

    const socket = createMockSocket();
    joinAuthRestrictedEvents(socket);

    try {
        socket.getHandler("game:play_card")(payload);
        await flushAsync();
    } finally {
        removeSocketData(TEST_SOCKET_ID);
        restoreSocketCollector();
    }

    await game.refresh();
    return getErrors();
};

export const minionActionVineSchema = vine.compile(
    vine.object({
        minionId: vine.string(),
        spotId: vine.enum(MINION_SPOT_IDS).nullable(),
        owner: vine.enum(SPOT_OWNERS),
    }),
);

export const playCardVineSchema = vine.compile(
    vine.object({
        cardId: vine.string(),
        spotId: vine.enum(MINION_SPOT_IDS),
        owner: vine.enum(SPOT_OWNERS),
        actionTarget: vine
            .object({
                spotId: vine.enum(MINION_SPOT_IDS).nullable(),
                owner: vine.enum(SPOT_OWNERS),
            })
            .optional(),
    }),
);
