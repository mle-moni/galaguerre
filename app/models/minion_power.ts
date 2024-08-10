import { BaseModel, column } from "@adonisjs/lucid/orm";
import type { DateTime } from "luxon";

// @dbml-group Minions

export default class MinionPower extends BaseModel {
    @column({ isPrimary: true })
    declare id: number;

    @column()
    declare hasTaunt: boolean;

    @column()
    declare hasCharge: boolean;

    @column()
    declare hasWindfury: boolean;

    @column()
    declare isPoisonous: boolean;

    @column()
    declare internalLabel: string;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;
}
