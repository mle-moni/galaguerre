import { BaseModel, belongsTo, column, hasMany } from "@adonisjs/lucid/orm";
import type { BelongsTo, HasMany } from "@adonisjs/lucid/types/relations";
import type { DateTime } from "luxon";
import MinionBattlecryAction from "./minion_battlecry_action.js";
import MinionDeathrattleAction from "./minion_deathrattle_action.js";
import MinionPower from "./minion_power.js";

// @dbml-group Minions

export default class Minion extends BaseModel {
    @column({ isPrimary: true })
    declare id: number;

    @column()
    declare internalLabel: string;

    @column()
    declare health: number;

    @column()
    declare attack: number;

    @column()
    declare minionPowerId: number | null;

    @belongsTo(() => MinionPower)
    declare minionPower: BelongsTo<typeof MinionPower>;

    @hasMany(() => MinionBattlecryAction)
    declare battlecryActions: HasMany<typeof MinionBattlecryAction>;

    @hasMany(() => MinionDeathrattleAction)
    declare deathrattleActions: HasMany<typeof MinionDeathrattleAction>;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;
}
