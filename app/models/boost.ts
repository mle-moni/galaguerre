import { BaseModel, belongsTo, column, hasMany } from "@adonisjs/lucid/orm";
import type { BelongsTo, HasMany } from "@adonisjs/lucid/types/relations";
import type { DateTime } from "luxon";
import MinionPower from "./minion_power.js";
import ToolToTarget from "./tool_to_target.js";

export default class Boost extends BaseModel {
    @column({ isPrimary: true })
    declare id: number;

    @column()
    declare internalLabel: string;

    @column()
    declare health: number | null;

    @column()
    declare attack: number | null;

    @column()
    declare spellPower: number | null;

    @column()
    declare minionPowerId: number | null;

    @belongsTo(() => MinionPower)
    declare minionPower: BelongsTo<typeof MinionPower>;

    @hasMany(() => ToolToTarget)
    declare toolToTargets: HasMany<typeof ToolToTarget>;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;
}
