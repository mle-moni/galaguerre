import { BaseModel, belongsTo, column, hasMany } from "@adonisjs/lucid/orm";
import type { BelongsTo, HasMany } from "@adonisjs/lucid/types/relations";
import type { DateTime } from "luxon";
import type { GalaguerreCardType } from "../galaguerre/galaguerre.types.js";
import CardFilterTag from "./card_filter_tag.js";
import Comparison from "./comparison.js";

export default class CardFilter extends BaseModel {
    @column({ isPrimary: true })
    declare id: number;

    @column()
    declare internalLabel: string;

    @column()
    declare type: GalaguerreCardType;

    @column()
    declare comparisonId: number | null;

    @belongsTo(() => Comparison)
    declare comparison: BelongsTo<typeof Comparison>;

    @hasMany(() => CardFilterTag)
    declare tags: HasMany<typeof CardFilterTag>;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;
}
