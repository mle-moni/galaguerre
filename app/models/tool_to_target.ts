import { BaseModel, belongsTo, column } from "@adonisjs/lucid/orm";
import type { BelongsTo } from "@adonisjs/lucid/types/relations";
import type { DateTime } from "luxon";
import Action from "./action.js";
import Boost from "./boost.js";
import Target from "./target.js";

export default class ToolToTarget extends BaseModel {
    @column({ isPrimary: true })
    declare id: number;

    @column()
    declare targetId: number;

    @belongsTo(() => Target)
    declare target: BelongsTo<typeof Target>;

    @column()
    declare actionId: number | null;

    @belongsTo(() => Action)
    declare action: BelongsTo<typeof Action>;

    @column()
    declare boostId: number | null;

    @belongsTo(() => Boost)
    declare boost: BelongsTo<typeof Boost>;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;
}
