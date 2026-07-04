import { BaseModel, belongsTo, column } from "@adonisjs/lucid/orm";
import type { BelongsTo } from "@adonisjs/lucid/types/relations";
import type { DateTime } from "luxon";
import User from "./user.js";

// @dbml-group Users

export default class FriendRequest extends BaseModel {
    @column({ isPrimary: true })
    declare id: number;

    @column()
    declare fromUserId: number;

    @belongsTo(() => User, { foreignKey: "fromUserId" })
    declare fromUser: BelongsTo<typeof User>;

    @column()
    declare toUserId: number;

    @belongsTo(() => User, { foreignKey: "toUserId" })
    declare toUser: BelongsTo<typeof User>;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime | null;
}
