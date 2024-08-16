import { BaseModel, belongsTo, column } from "@adonisjs/lucid/orm";
import type { BelongsTo } from "@adonisjs/lucid/types/relations";
import type { DateTime } from "luxon";
import Card from "./card.js";
import Deck from "./deck.js";

// @dbml-group Users

export default class DeckCard extends BaseModel {
    @column({ isPrimary: true })
    declare id: number;

    @column()
    declare cardId: number;

    @belongsTo(() => Card)
    declare card: BelongsTo<typeof Card>;

    @column()
    declare deckId: number;

    @belongsTo(() => Deck)
    declare deck: BelongsTo<typeof Deck>;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;
}
