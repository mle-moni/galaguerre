import type {
    DailyQuestParams,
    DailyQuestRewardType,
    DailyQuestType,
} from "#api_types/daily_quests.types";
import { BaseModel, belongsTo, column } from "@adonisjs/lucid/orm";
import type { BelongsTo } from "@adonisjs/lucid/types/relations";
import type { DateTime } from "luxon";
import User from "./user.js";

export default class UserDailyQuest extends BaseModel {
    @column({ isPrimary: true })
    declare id: number;

    @column()
    declare userId: number;

    @belongsTo(() => User)
    declare user: BelongsTo<typeof User>;

    @column.date()
    declare questDate: DateTime;

    @column()
    declare slot: number;

    @column()
    declare questType: DailyQuestType;

    @column()
    declare targetValue: number;

    @column()
    declare progress: number;

    @column()
    declare params: DailyQuestParams | null;

    @column()
    declare rewardType: DailyQuestRewardType;

    @column()
    declare rewardAmount: number;

    @column.dateTime()
    declare completedAt: DateTime | null;

    @column.dateTime()
    declare claimedAt: DateTime | null;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;
}
