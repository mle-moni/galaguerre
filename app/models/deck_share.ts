import type { ApiDeckCardEntry } from "#api_types/deck.types";
import { BaseModel, belongsTo, column } from "@adonisjs/lucid/orm";
import type { BelongsTo } from "@adonisjs/lucid/types/relations";
import type { DateTime } from "luxon";
import Deck from "./deck.js";
import User from "./user.js";

// @dbml-group Users

export default class DeckShare extends BaseModel {
    @column({ isPrimary: true })
    declare id: number;

    @column()
    declare code: string;

    @column()
    declare userId: number;

    @column()
    declare deckId: number;

    @column()
    declare name: string;

    @column({
        prepare: (value: ApiDeckCardEntry[]) => JSON.stringify(value),
        consume: (value: string | ApiDeckCardEntry[]) =>
            typeof value === "string" ? JSON.parse(value) : value,
    })
    declare cards: ApiDeckCardEntry[];

    @belongsTo(() => User)
    declare user: BelongsTo<typeof User>;

    @belongsTo(() => Deck)
    declare deck: BelongsTo<typeof Deck>;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;
}
