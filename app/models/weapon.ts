import { BaseModel, column, hasMany } from "@adonisjs/lucid/orm";
import type { HasMany } from "@adonisjs/lucid/types/relations";
import type { DateTime } from "luxon";
import WeaponDeathrattleAction from "./weapon_deathrattle_action.js";

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

    @hasMany(() => WeaponDeathrattleAction)
    declare deathrattleActions: HasMany<typeof WeaponDeathrattleAction>;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;
}
