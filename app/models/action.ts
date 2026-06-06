import { BaseModel, belongsTo, column, hasMany } from "@adonisjs/lucid/orm";
import type { BelongsTo, HasMany } from "@adonisjs/lucid/types/relations";
import type { DateTime } from "luxon";
import type { GalaguerreActionType } from "../galaguerre/galaguerre.types.js";
import Boost from "./boost.js";
import CardFilter from "./card_filter.js";
import ToolToTarget from "./tool_to_target.js";

export default class Action extends BaseModel {
    @column({ isPrimary: true })
    declare id: number;

    @column()
    declare internalLabel: string;

    @column()
    declare type: GalaguerreActionType;

    @column()
    declare isTargeted: boolean;

    @column()
    declare drawCount: number | null;

    @column()
    declare drawCardFilterId: number | null;

    @belongsTo(() => CardFilter, { foreignKey: "drawCardFilterId" })
    declare drawCardFilter: BelongsTo<typeof CardFilter>;

    @column()
    declare enemyDrawCount: number | null;

    @column()
    declare enemyDrawCardFilterId: number | null;

    @belongsTo(() => CardFilter, { foreignKey: "enemyDrawCardFilterId" })
    declare enemyDrawCardFilter: BelongsTo<typeof CardFilter>;

    @column()
    declare damage: number | null;

    @column()
    declare heal: number | null;

    @column()
    declare boostId: number | null;

    @belongsTo(() => Boost)
    declare boost: BelongsTo<typeof Boost>;

    @hasMany(() => ToolToTarget)
    declare toolToTargets: HasMany<typeof ToolToTarget>;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;
}
