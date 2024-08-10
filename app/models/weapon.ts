import { BaseModel, column } from "@adonisjs/lucid/orm";
import type { DateTime } from "luxon";

// @dbml-group Weapons

export default class Weapon extends BaseModel {
    @column({ isPrimary: true })
    declare id: number;

    @column()
    declare internalLabel: string;

    @column()
    declare durability: number;

    @column()
    declare damage: number;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;
}
