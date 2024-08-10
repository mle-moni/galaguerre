import { BaseModel, column } from "@adonisjs/lucid/orm";
import type { DateTime } from "luxon";

export default class Tag extends BaseModel {
    @column({ isPrimary: true })
    declare id: number;

    @column()
    declare name: string;

    @column()
    declare label: string;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;
}
