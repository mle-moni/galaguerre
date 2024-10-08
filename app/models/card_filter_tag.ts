import { BaseModel, belongsTo, column } from "@adonisjs/lucid/orm";
import type { BelongsTo } from "@adonisjs/lucid/types/relations";
import type { DateTime } from "luxon";
import CardFilter from "./card_filter.js";
import Tag from "./tag.js";

export default class CardFilterTag extends BaseModel {
    @column({ isPrimary: true })
    declare id: number;

    @column()
    declare cardFilterId: number;

    @belongsTo(() => CardFilter)
    declare cardFilter: BelongsTo<typeof CardFilter>;

    @column()
    declare tagId: number;

    @belongsTo(() => Tag)
    declare tag: BelongsTo<typeof Tag>;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;
}
