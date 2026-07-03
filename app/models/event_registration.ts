import { BaseModel, belongsTo, column } from "@adonisjs/lucid/orm";
import type { BelongsTo } from "@adonisjs/lucid/types/relations";
import type { DateTime } from "luxon";
import Event from "./event.js";
import User from "./user.js";

export default class EventRegistration extends BaseModel {
    @column({ isPrimary: true })
    declare id: number;

    @column()
    declare userId: number;

    @belongsTo(() => User)
    declare user: BelongsTo<typeof User>;

    @column()
    declare eventId: number;

    @belongsTo(() => Event)
    declare event: BelongsTo<typeof Event>;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;
}
