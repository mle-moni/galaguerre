import { BaseModel, column, hasMany } from "@adonisjs/lucid/orm";
import type { HasMany } from "@adonisjs/lucid/types/relations";
import type { DateTime } from "luxon";
import EventRegistration from "./event_registration.js";

export default class Event extends BaseModel {
    @column({ isPrimary: true })
    declare id: number;

    @column()
    declare title: string;

    @column()
    declare shortDescription: string;

    @column()
    declare longDescription: string;

    @column()
    declare imageUrl: string;

    @column.dateTime()
    declare startsAt: DateTime;

    @hasMany(() => EventRegistration)
    declare registrations: HasMany<typeof EventRegistration>;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime | null;
}
