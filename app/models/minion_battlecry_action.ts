import { BaseModel, belongsTo, column } from "@adonisjs/lucid/orm";
import type { BelongsTo } from "@adonisjs/lucid/types/relations";
import type { DateTime } from "luxon";
import Action from "./action.js";
import Minion from "./minion.js";

// @dbml-group Minions

export default class MinionBattlecryAction extends BaseModel {
    @column({ isPrimary: true })
    declare id: number;

    @column()
    declare minionId: number;

    @belongsTo(() => Minion)
    declare minion: BelongsTo<typeof Minion>;

    @column()
    declare actionId: number;

    @belongsTo(() => Action)
    declare action: BelongsTo<typeof Action>;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;
}
