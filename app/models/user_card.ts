import { BaseModel, belongsTo, column } from "@adonisjs/lucid/orm";
import type { BelongsTo } from "@adonisjs/lucid/types/relations";
import type { DateTime } from "luxon";
import Card from "./card.js";
import User from "./user.js";

export default class UserCard extends BaseModel {
    @column({ isPrimary: true })
    declare id: number;

    @column()
    declare userId: number;

    @belongsTo(() => User)
    declare user: BelongsTo<typeof User>;

    @column()
    declare cardId: number;

    @belongsTo(() => Card)
    declare card: BelongsTo<typeof Card>;

    @column()
    declare count: number;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;
}
