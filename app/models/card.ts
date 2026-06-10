import type { CardData } from "#galaguerre/card_definition.schema";
import { parseCardData } from "#galaguerre/card_definition.schema";
import type { GalaguerreCardType } from "#galaguerre/galaguerre.types";
import { BaseModel, beforeSave, belongsTo, column } from "@adonisjs/lucid/orm";
import type { BelongsTo } from "@adonisjs/lucid/types/relations";
import type { DateTime } from "luxon";
import CardSet from "./card_set.js";

export default class Card extends BaseModel {
    @column({ isPrimary: true })
    declare id: number;

    @column()
    declare label: string;

    @column()
    declare imageUrl: string;

    @column()
    declare cost: number;

    @column()
    declare type: GalaguerreCardType;

    @column()
    declare cardSetId: number;

    @belongsTo(() => CardSet)
    declare cardSet: BelongsTo<typeof CardSet>;

    @column()
    declare data: CardData;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;

    @beforeSave()
    static validateData(card: Card) {
        card.data = parseCardData(card.type, card.data);
    }
}
