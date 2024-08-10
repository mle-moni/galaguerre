import { BaseModel, belongsTo, column } from "@adonisjs/lucid/orm";
import type { BelongsTo } from "@adonisjs/lucid/types/relations";
import type { DateTime } from "luxon";
import type {
    GalaguerrePassiveTriggersOn,
    GalaguerrePassiveType,
} from "../galaguerre/galaguerre.types.js";
import Action from "./action.js";
import Boost from "./boost.js";

// @dbml-group Minions

export default class Passive extends BaseModel {
    @column({ isPrimary: true })
    declare id: number;

    @column()
    declare internalLabel: string;

    @column()
    declare type: GalaguerrePassiveType;

    // triggersOn must not be NULL if type = ACTION
    @column()
    declare triggersOn: GalaguerrePassiveTriggersOn | null;

    @column()
    declare actionId: number | null;

    @belongsTo(() => Action)
    declare action: BelongsTo<typeof Action>;

    // e.g. "While this minion is alive, give it +1/+1 to other minions"
    // for active boosts, use actionId instead
    @column()
    declare boostId: number | null;

    @belongsTo(() => Boost)
    declare boost: BelongsTo<typeof Boost>;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;
}
