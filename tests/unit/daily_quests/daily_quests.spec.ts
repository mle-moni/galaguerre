import DailyQuestsController from "#controllers/daily_quests/daily_quests_controller";
import { syncCards } from "#database/seed_helpers/sync_cards";
import CardPack from "#models/card_pack";
import User from "#models/user";
import UserDailyQuest from "#models/user_daily_quest";
import {
    claimDailyQuest,
    DailyQuestAlreadyClaimedError,
    DailyQuestNotCompletedError,
} from "#services/daily_quests/claim_daily_quest";
import { getOrGenerateDailyQuests } from "#services/daily_quests/get_or_generate_daily_quests";
import { openCardPack } from "#services/collection/open_card_pack";
import { listDailyQuests } from "#services/daily_quests/list_daily_quests";
import { updateDailyQuestProgressForGame } from "#services/daily_quests/update_daily_quest_progress";
import {
    getParisCalendarDate,
    parseParisCalendarDate,
} from "#services/rewards/get_paris_calendar_date";
import { createTestGame } from "#tests/helpers/game/game_factory";
import { createGameData } from "#tests/helpers/game/fixtures";
import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import { DateTime } from "luxon";

const createAuthContext = (user: User, questId?: number) => ({
    auth: { user },
    params: { id: String(questId ?? 0) },
    response: {
        badRequest: (body: unknown) => body,
    },
});

test.group("daily quests", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("getOrGenerateDailyQuests creates three quests for the day", async ({ assert }) => {
        const user = await User.create({
            email: "daily-quests-gen@test.fr",
            pseudo: "daily-quests-gen",
            password: "test",
        });

        const quests = await getOrGenerateDailyQuests(user.id);

        assert.lengthOf(quests, 3);
        assert.equal(quests[0]!.slot, 0);
        assert.equal(quests[0]!.questType, "WIN_GAME");
        assert.equal(quests[0]!.rewardType, "pack");
        assert.equal(quests[1]!.slot, 1);
        assert.equal(quests[2]!.slot, 2);
        assert.notEqual(quests[1]!.questType, quests[2]!.questType);
    });

    test("getOrGenerateDailyQuests is deterministic for the same user and day", async ({
        assert,
    }) => {
        const user = await User.create({
            email: "daily-quests-seed@test.fr",
            pseudo: "daily-quests-seed",
            password: "test",
        });

        const first = await getOrGenerateDailyQuests(user.id);
        const second = await getOrGenerateDailyQuests(user.id);

        assert.deepEqual(
            first.map((quest) => ({
                slot: quest.slot,
                questType: quest.questType,
                targetValue: quest.targetValue,
                rewardType: quest.rewardType,
                rewardAmount: quest.rewardAmount,
                params: quest.params,
            })),
            second.map((quest) => ({
                slot: quest.slot,
                questType: quest.questType,
                targetValue: quest.targetValue,
                rewardType: quest.rewardType,
                rewardAmount: quest.rewardAmount,
                params: quest.params,
            })),
        );
    });

    test("winning a qualified game completes the fixed win quest", async ({ assert }) => {
        const { game, playerTwo } = await createTestGame(
            createGameData({
                state: "PLAYER_ONE_TURN",
                currentRound: 2,
                playerOne: { health: 0 },
                playerTwo: { health: 5 },
            }),
        );

        await getOrGenerateDailyQuests(playerTwo.id);
        await updateDailyQuestProgressForGame(game);

        const winQuest = await UserDailyQuest.query()
            .where("userId", playerTwo.id)
            .where("questType", "WIN_GAME")
            .firstOrFail();

        assert.equal(winQuest.progress, 1);
        assert.isNotNull(winQuest.completedAt);
        assert.isNull(winQuest.claimedAt);
    });

    test("updateDailyQuestProgressForGame is idempotent", async ({ assert }) => {
        const { game, playerTwo } = await createTestGame(
            createGameData({
                state: "PLAYER_ONE_TURN",
                currentRound: 2,
                playerOne: { health: 0 },
                playerTwo: { health: 5 },
            }),
        );

        await getOrGenerateDailyQuests(playerTwo.id);
        await updateDailyQuestProgressForGame(game);
        await updateDailyQuestProgressForGame(game);

        const winQuest = await UserDailyQuest.query()
            .where("userId", playerTwo.id)
            .where("questType", "WIN_GAME")
            .firstOrFail();

        assert.equal(winQuest.progress, 1);
    });

    test("stat quests accumulate progress across game stats", async ({ assert }) => {
        const { game, playerOne } = await createTestGame(
            createGameData({
                state: "PLAYER_ONE_TURN",
                currentRound: 2,
                playerOne: {
                    health: 5,
                    stats: {
                        manaSpent: 12,
                        minionsPlayed: 4,
                        spellsCast: 2,
                        weaponsPlayed: 0,
                        damageDealt: 18,
                        healingDone: 0,
                        cardsDrawn: 3,
                        heroAttacks: 1,
                    },
                },
                playerTwo: { health: 0 },
            }),
        );

        await UserDailyQuest.create({
            userId: playerOne.id,
            questDate: parseParisCalendarDate(getParisCalendarDate()),
            slot: 1,
            questType: "DEAL_DAMAGE",
            targetValue: 40,
            progress: 0,
            params: null,
            rewardType: "story_points",
            rewardAmount: 40,
        });

        await updateDailyQuestProgressForGame(game);

        const quest = await UserDailyQuest.query()
            .where("userId", playerOne.id)
            .where("questType", "DEAL_DAMAGE")
            .firstOrFail();

        assert.equal(quest.progress, 18);
        assert.isNull(quest.completedAt);
    });

    test("claimDailyQuest grants story points", async ({ assert }) => {
        const user = await User.create({
            email: "daily-quests-claim-sp@test.fr",
            pseudo: "daily-quests-claim-sp",
            password: "test",
            goldCoins: 10,
        });

        const quest = await UserDailyQuest.create({
            userId: user.id,
            questDate: parseParisCalendarDate(getParisCalendarDate()),
            slot: 1,
            questType: "CAST_SPELLS",
            targetValue: 3,
            progress: 3,
            params: null,
            rewardType: "story_points",
            rewardAmount: 25,
            completedAt: DateTime.now(),
        });

        const result = await claimDailyQuest(user.id, quest.id);

        assert.equal(result.goldCoins, 35);
        await quest.refresh();
        assert.isNotNull(quest.claimedAt);
        assert.isNotNull(result.quest.claimedAt);
    });

    test("claimDailyQuest grants a pack", async ({ assert }) => {
        const user = await User.create({
            email: "daily-quests-claim-pack@test.fr",
            pseudo: "daily-quests-claim-pack",
            password: "test",
        });

        const quest = await UserDailyQuest.create({
            userId: user.id,
            questDate: parseParisCalendarDate(getParisCalendarDate()),
            slot: 0,
            questType: "WIN_GAME",
            targetValue: 1,
            progress: 1,
            params: null,
            rewardType: "pack",
            rewardAmount: 1,
            completedAt: DateTime.now(),
        });

        const result = await claimDailyQuest(user.id, quest.id);

        assert.equal(result.unopenedCount, 1);

        const packs = await CardPack.query().where("userId", user.id).whereNull("openedAt");
        assert.lengthOf(packs, 1);
    });

    test("claimDailyQuest rejects incomplete quests", async ({ assert }) => {
        const user = await User.create({
            email: "daily-quests-incomplete@test.fr",
            pseudo: "daily-quests-incomplete",
            password: "test",
        });

        const quest = await UserDailyQuest.create({
            userId: user.id,
            questDate: parseParisCalendarDate(getParisCalendarDate()),
            slot: 1,
            questType: "DRAW_CARDS",
            targetValue: 5,
            progress: 2,
            params: null,
            rewardType: "story_points",
            rewardAmount: 25,
        });

        await assert.rejects(() => claimDailyQuest(user.id, quest.id), DailyQuestNotCompletedError);
    });

    test("claimDailyQuest rejects already claimed quests", async ({ assert }) => {
        const user = await User.create({
            email: "daily-quests-twice@test.fr",
            pseudo: "daily-quests-twice",
            password: "test",
        });

        const quest = await UserDailyQuest.create({
            userId: user.id,
            questDate: parseParisCalendarDate(getParisCalendarDate()),
            slot: 0,
            questType: "WIN_GAME",
            targetValue: 1,
            progress: 1,
            params: null,
            rewardType: "pack",
            rewardAmount: 1,
            completedAt: DateTime.now(),
            claimedAt: DateTime.now(),
        });

        await assert.rejects(
            () => claimDailyQuest(user.id, quest.id),
            DailyQuestAlreadyClaimedError,
        );
    });

    test("listDailyQuests returns quests and reset timer", async ({ assert }) => {
        const user = await User.create({
            email: "daily-quests-list@test.fr",
            pseudo: "daily-quests-list",
            password: "test",
        });

        const result = await listDailyQuests(user.id);

        assert.lengthOf(result.quests, 3);
        assert.isAbove(result.resetInSeconds, 0);
        assert.equal(result.quests[0]!.title, "Gagner une partie");
    });

    test("DailyQuestsController.claim returns updated quest", async ({ assert }) => {
        const user = await User.create({
            email: "daily-quests-api@test.fr",
            pseudo: "daily-quests-api",
            password: "test",
            goldCoins: 0,
        });

        const quest = await UserDailyQuest.create({
            userId: user.id,
            questDate: parseParisCalendarDate(getParisCalendarDate()),
            slot: 1,
            questType: "HEAL_HP",
            targetValue: 10,
            progress: 10,
            params: null,
            rewardType: "story_points",
            rewardAmount: 25,
            completedAt: DateTime.now(),
        });

        const controller = new DailyQuestsController();
        const result = (await controller.claim(createAuthContext(user, quest.id) as never)) as {
            goldCoins: number;
            quest: { claimedAt: string | null };
        };

        assert.equal(result.goldCoins, 25);
        assert.isNotNull(result.quest.claimedAt);
    });
});

test.group("daily quest lock ordering", (group) => {
    group.each.teardown(async () => {
        await User.query().where("email", "daily-quests-claim-pack-concurrent@test.fr").delete();
    });
    test("claims a quest and opens a pack concurrently for the same user", async ({ assert }) => {
        await syncCards();

        const user = await User.create({
            email: "daily-quests-claim-pack-concurrent@test.fr",
            pseudo: "daily-quests-claim-pack-concurrent",
            password: "test",
            goldCoins: 0,
        });
        const questDate = parseParisCalendarDate(getParisCalendarDate());
        const [claimableQuest] = await UserDailyQuest.createMany([
            {
                userId: user.id,
                questDate,
                slot: 0,
                questType: "DEAL_DAMAGE",
                targetValue: 60,
                progress: 60,
                params: null,
                rewardType: "story_points",
                rewardAmount: 25,
                completedAt: DateTime.now(),
            },
            {
                userId: user.id,
                questDate,
                slot: 1,
                questType: "OPEN_PACK",
                targetValue: 3,
                progress: 0,
                params: null,
                rewardType: "story_points",
                rewardAmount: 50,
            },
            {
                userId: user.id,
                questDate,
                slot: 2,
                questType: "DRAW_CARDS",
                targetValue: 15,
                progress: 0,
                params: null,
                rewardType: "story_points",
                rewardAmount: 45,
            },
        ]);
        await CardPack.create({ userId: user.id });

        const [openedCards, claimResult] = await Promise.all([
            openCardPack(user.id),
            claimDailyQuest(user.id, claimableQuest!.id),
        ]);

        assert.isAbove(openedCards.length, 0);
        assert.equal(claimResult.goldCoins, 25);

        const claimedQuest = await UserDailyQuest.findOrFail(claimableQuest!.id);
        assert.isNotNull(claimedQuest.claimedAt);
        const pack = await CardPack.query().where("userId", user.id).firstOrFail();
        assert.isNotNull(pack.openedAt);
    });
});
