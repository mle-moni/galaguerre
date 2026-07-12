import type { SocketEventByKey } from "#api_types/socket_events";
import Friendship from "#models/friendship";
import Game from "#models/game";
import User from "#models/user";
import { addSocketData, removeSocketData } from "#services/sockets/sockets_data";
import {
    registerSpectatorWatch,
    unregisterSpectatorWatch,
} from "#services/sockets/spectator_watchers";
import { TRAINING_AI_USER_ID } from "#services/training/training_constants";
import testUtils from "@adonisjs/core/services/test_utils";
import { test } from "@japa/runner";
import {
    CARD_IDS,
    createCardActionSnapshot,
    createGameData,
    createHeroTargetSnapshot,
    createMinionCard,
    createSpellCard,
} from "#tests/helpers/game/fixtures";
import { bindUserIds, createTestGame } from "#tests/helpers/game/game_factory";
import { runPlayCardOnGame } from "#tests/helpers/game/run_play_card";
import {
    getEmittedEvents,
    installSocketCollector,
    restoreSocketCollector,
} from "#tests/helpers/game/socket_event_collector";

const TEST_SOCKET_ID = "test-socket";

const createSetupTechniqueCard = () =>
    createSpellCard({
        uuid: "setup-technique",
        cardId: 172,
        label: "Setup Technique",
        cost: 0,
        baseCost: 0,
        spellActions: [createCardActionSnapshot({ type: "NEXT_SPELL_COST_REDUCTION", amount: 2 })],
    });

const createDamageSpell = (uuid: string, cost: number) =>
    createSpellCard({
        uuid,
        cardId: 99,
        label: `Test Damage Spell ${cost}`,
        cost,
        baseCost: cost,
        spellActions: [
            createCardActionSnapshot({
                type: "DAMAGE",
                isTargeted: false,
                damage: 1,
                target: createHeroTargetSnapshot("OPPONENT"),
            }),
        ],
    });

const getSpectatorUpdate = (watcherId: number) => {
    const spectatorUpdates = getEmittedEvents().filter(
        (event) => event.event === "game:update" && event.rooms === `users:${watcherId}`,
    );

    return spectatorUpdates.at(-1)?.data as SocketEventByKey["game:update"] | undefined;
};

const getWatchedPlayerHandCosts = (
    update: SocketEventByKey["game:update"],
    watchedUserId: number,
) => {
    const player =
        update.game.data.playerOne.userId === watchedUserId
            ? update.game.data.playerOne
            : update.game.data.playerTwo;

    return player.hand.map((card) => card.cost);
};

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

    test("sends refreshed spell costs to spectators after cost reductions are consumed", async ({
        assert,
    }) => {
        const setupTechnique = createSetupTechniqueCard();
        const followUpSpell = createDamageSpell("follow-up-spell", 4);
        const remainingSpell = createDamageSpell("remaining-spell", 2);
        const { game, playerOne, playerTwo } = await createTestGame(
            createGameData({
                state: "PLAYER_ONE_TURN",
                currentRound: 5,
                playerOne: {
                    mana: 5,
                    hand: [setupTechnique, followUpSpell, remainingSpell],
                },
                playerTwo: {
                    hand: [createMinionCard({ uuid: "opponent-secret", label: "Secret ennemi" })],
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
                cardId: setupTechnique.uuid,
                boardIndex: null,
                owner: "PLAYER",
            });

            const afterSetup = getSpectatorUpdate(watcher.id);
            assert.isDefined(afterSetup);
            assert.deepEqual(getWatchedPlayerHandCosts(afterSetup!, playerOne.id), [2, 0]);
            assert.equal(afterSetup!.game.data.playerTwo.hand[0]!.label, "dummy card");

            await runPlayCardOnGame(game, playerOne.id, {
                cardId: followUpSpell.uuid,
                boardIndex: null,
                owner: "PLAYER",
            });

            const afterFollowUp = getSpectatorUpdate(watcher.id);
            assert.isDefined(afterFollowUp);
            assert.deepEqual(getWatchedPlayerHandCosts(afterFollowUp!, playerOne.id), [2]);
            assert.equal(
                afterFollowUp!.presentation?.beats.at(-1)?.stateAfter.playerOne.hand[0]?.cost,
                2,
            );
            assert.equal(afterFollowUp!.game.data.playerTwo.userId, playerTwo.id);
        } finally {
            unregisterSpectatorWatch(watcher.id);
            removeSocketData(TEST_SOCKET_ID);
            restoreSocketCollector();
        }
    });

    test("sends updates to spectators during training games", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const human = await User.create({
            email: `spectator-training-${unique}@test.fr`,
            password: "test",
            pseudo: `Human-${unique}`,
        });
        const watcher = await createUser(`${unique}-watcher`, `Watcher-${unique}`);

        await Friendship.create({ userId: watcher.id, friendId: human.id });
        await Friendship.create({ userId: human.id, friendId: watcher.id });

        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            label: "Gobelin secret",
            cost: 1,
        });
        const data = bindUserIds(
            createGameData({
                isTraining: true,
                playerOne: {
                    mana: 5,
                    hand: [handCard],
                },
            }),
            human.id,
            TRAINING_AI_USER_ID,
        );
        const game = await Game.create({
            playerOneId: human.id,
            playerTwoId: null,
            data,
            isFinished: false,
        });

        addSocketData(TEST_SOCKET_ID, human.id);
        registerSpectatorWatch(watcher.id, game.id, human.id);
        installSocketCollector();

        try {
            await runPlayCardOnGame(game, human.id, {
                cardId: CARD_IDS.handMinion,
                boardIndex: 0,
                owner: "PLAYER",
            });

            const spectatorUpdates = getEmittedEvents().filter(
                (event) => event.event === "game:update" && event.rooms === `users:${watcher.id}`,
            );

            assert.isAbove(spectatorUpdates.length, 0);

            const update = spectatorUpdates.at(-1)!.data as SocketEventByKey["game:update"];
            assert.isAbove(update.game.data.playerOne.board.length, 0);
        } finally {
            unregisterSpectatorWatch(watcher.id);
            removeSocketData(TEST_SOCKET_ID);
            restoreSocketCollector();
        }
    });
});
