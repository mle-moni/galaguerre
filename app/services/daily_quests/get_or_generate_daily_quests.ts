import type { DailyQuestParams } from "#api_types/daily_quests.types";
import Card from "#models/card";
import User from "#models/user";
import UserDailyQuest from "#models/user_daily_quest";
import {
    FIXED_WIN_GAME_QUEST,
    getQuestDefinition,
    pickQuestVariant,
    RANDOM_DAILY_QUEST_DEFINITIONS,
} from "#services/daily_quests/quest_definitions";
import {
    createSeededRandom,
    pickRandomItem,
    shuffleWithSeed,
} from "#services/daily_quests/seeded_random";
import {
    getParisCalendarDate,
    parseParisCalendarDate,
} from "#services/rewards/get_paris_calendar_date";
import db from "@adonisjs/lucid/services/db";
import type { TransactionClientContract } from "@adonisjs/lucid/types/database";
import type { DateTime } from "luxon";

interface QuestInsertRow {
    userId: number;
    questDate: DateTime;
    slot: number;
    questType: UserDailyQuest["questType"];
    targetValue: number;
    progress: number;
    params: DailyQuestParams | null;
    rewardType: UserDailyQuest["rewardType"];
    rewardAmount: number;
}

const buildFixedWinGameQuest = (userId: number, questDate: string): QuestInsertRow => ({
    userId,
    questDate: parseParisCalendarDate(questDate),
    slot: 0,
    questType: "WIN_GAME",
    targetValue: FIXED_WIN_GAME_QUEST.target,
    progress: 0,
    params: null,
    rewardType: FIXED_WIN_GAME_QUEST.rewardType,
    rewardAmount: FIXED_WIN_GAME_QUEST.rewardAmount,
});

const buildRandomQuestRow = async (
    userId: number,
    questDate: string,
    slot: number,
    random: () => number,
    questType: UserDailyQuest["questType"],
    client: TransactionClientContract,
    excludedQuestTypes: readonly UserDailyQuest["questType"][] = [],
): Promise<QuestInsertRow> => {
    const definition = getQuestDefinition(questType);
    if (!definition) {
        throw new Error(`Unknown quest type: ${questType}`);
    }

    const variant = pickQuestVariant(definition.variants, random);
    let params: DailyQuestParams | null = null;

    if (questType === "WIN_WITH_CARD") {
        const collectibleCards = await Card.query({ client }).where("isCollectible", true);
        if (collectibleCards.length > 0) {
            const card = pickRandomItem(collectibleCards, random);
            params = {
                cardId: card.id,
                cardName: card.data.name,
            };
        } else {
            const fallbackCandidates = RANDOM_DAILY_QUEST_DEFINITIONS.filter(
                (definition) =>
                    definition.type !== "WIN_WITH_CARD" &&
                    !excludedQuestTypes.includes(definition.type),
            ).map((definition) => definition.type);

            if (fallbackCandidates.length === 0) {
                throw new Error("No fallback quest types available");
            }

            const fallbackType = pickRandomItem(fallbackCandidates, random);
            return buildRandomQuestRow(
                userId,
                questDate,
                slot,
                random,
                fallbackType,
                client,
                excludedQuestTypes,
            );
        }
    }

    return {
        userId,
        questDate: parseParisCalendarDate(questDate),
        slot,
        questType,
        targetValue: variant.target,
        progress: 0,
        params,
        rewardType: variant.rewardType,
        rewardAmount: variant.rewardAmount,
    };
};

const generateDailyQuestRows = async (
    userId: number,
    questDate: string,
    client: TransactionClientContract,
): Promise<QuestInsertRow[]> => {
    const random = createSeededRandom(`${userId}:${questDate}:daily-quests`);
    const shuffledTypes = shuffleWithSeed(
        RANDOM_DAILY_QUEST_DEFINITIONS.map((definition) => definition.type),
        random,
    );
    const firstRandomQuest = await buildRandomQuestRow(
        userId,
        questDate,
        1,
        random,
        shuffledTypes[0]!,
        client,
    );
    const secondQuestType =
        shuffledTypes.find(
            (questType) => questType !== firstRandomQuest.questType && questType !== "WIN_GAME",
        ) ?? shuffledTypes[1]!;
    const secondRandomQuest = await buildRandomQuestRow(
        userId,
        questDate,
        2,
        random,
        secondQuestType,
        client,
        [firstRandomQuest.questType],
    );

    return [buildFixedWinGameQuest(userId, questDate), firstRandomQuest, secondRandomQuest];
};

const DAILY_QUEST_SLOT_COUNT = 3;

const getOrGenerateDailyQuestsInTransaction = async (
    userId: number,
    questDate: string,
    client: TransactionClientContract,
): Promise<UserDailyQuest[]> => {
    await User.query({ client }).where("id", userId).forUpdate().firstOrFail();

    const existingQuests = await UserDailyQuest.query({ client })
        .where("userId", userId)
        .where("questDate", questDate)
        .orderBy("slot", "asc")
        .forUpdate();

    if (existingQuests.length === DAILY_QUEST_SLOT_COUNT) {
        return existingQuests;
    }

    const existingSlots = new Set(existingQuests.map((quest) => quest.slot));
    const generatedRows = await generateDailyQuestRows(userId, questDate, client);

    for (const row of generatedRows) {
        if (!existingSlots.has(row.slot)) {
            existingQuests.push(await UserDailyQuest.create(row, { client }));
        }
    }

    return existingQuests.sort((left, right) => left.slot - right.slot);
};

export const getOrGenerateDailyQuests = async (
    userId: number,
    client?: TransactionClientContract,
): Promise<UserDailyQuest[]> => {
    const questDate = getParisCalendarDate();

    if (client) {
        return getOrGenerateDailyQuestsInTransaction(userId, questDate, client);
    }

    return db.transaction((trx) => getOrGenerateDailyQuestsInTransaction(userId, questDate, trx));
};
