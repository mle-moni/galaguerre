import type { SocketEventByKey } from "#api_types/socket_events";
import Friendship from "#models/friendship";
import User from "#models/user";
import { addSocketData, removeSocketData } from "#services/sockets/sockets_data";
import {
    registerSpectatorWatch,
    unregisterSpectatorWatch,
} from "#services/sockets/spectator_watchers";
import testUtils from "@adonisjs/core/services/test_utils";
import { test } from "@japa/runner";
import { CARD_IDS, createGameData, createMinionCard } from "#tests/helpers/game/fixtures";
import { createTestGame } from "#tests/helpers/game/game_factory";
import { runPlayCardOnGame } from "#tests/helpers/game/run_play_card";
import {
    getEmittedEvents,
    installSocketCollector,
    restoreSocketCollector,
} from "#tests/helpers/game/socket_event_collector";

const TEST_SOCKET_ID = "test-socket";

const createUser = async (suffix: string, pseudo: string) =>
    User.create({
        email: `spectator-watch-${suffix}@test.fr`,
        password: "test",
        pseudo,
    });

test.group("game:watch", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("sends presentation updates to spectators from their friend point of view", async ({
        assert,
    }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            label: "Gobelin secret",
            cost: 1,
        });
        const { game, playerOne } = await createTestGame(
            createGameData({
                playerOne: {
                    mana: 5,
                    hand: [handCard],
                },
            }),
        );
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const watcher = await createUser(unique, `Watcher-${unique}`);

        await Friendship.create({ userId: watcher.id, friendId: playerOne.id });
        await Friendship.create({ userId: playerOne.id, friendId: watcher.id });

        addSocketData(TEST_SOCKET_ID, playerOne.id);
        registerSpectatorWatch(watcher.id, game.id, playerOne.id);
        installSocketCollector();

        try {
            await runPlayCardOnGame(game, playerOne.id, {
                cardId: CARD_IDS.handMinion,
                boardIndex: 0,
                owner: "PLAYER",
            });

            const spectatorUpdates = getEmittedEvents().filter(
                (event) => event.event === "game:update" && event.rooms === `users:${watcher.id}`,
            );

            assert.isAbove(spectatorUpdates.length, 0);

            const update = spectatorUpdates.at(-1)!.data as SocketEventByKey["game:update"];
            assert.isDefined(update.presentation);
            assert.isAbove(update.game.data.playerOne.board.length, 0);
        } finally {
            unregisterSpectatorWatch(watcher.id);
            removeSocketData(TEST_SOCKET_ID);
            restoreSocketCollector();
        }
    });
});
