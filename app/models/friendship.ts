import { BaseModel, belongsTo, column } from "@adonisjs/lucid/orm";
import type { BelongsTo } from "@adonisjs/lucid/types/relations";
import type { DateTime } from "luxon";
import User from "./user.js";

// @dbml-group Users

export default class Friendship extends BaseModel {
    @column({ isPrimary: true })
    declare id: number;

    @column()
    declare userId: number;

    @belongsTo(() => User)
    declare user: BelongsTo<typeof User>;

    @column()
    declare friendId: number;

    @belongsTo(() => User, { foreignKey: "friendId" })
    declare friend: BelongsTo<typeof User>;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime | null;
}
