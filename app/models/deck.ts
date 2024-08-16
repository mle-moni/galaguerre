import { BaseModel, belongsTo, column, manyToMany } from "@adonisjs/lucid/orm";
import type { BelongsTo, ManyToMany } from "@adonisjs/lucid/types/relations";
import type { DateTime } from "luxon";
import Card from "./card.js";
import type DeckCard from "./deck_card.js";
import User from "./user.js";

// @dbml-group Users

export default class Deck extends BaseModel {
    @column({ isPrimary: true })
    declare id: number;

    @column()
    declare name: string;

    @column()
    declare userId: number;

    @column()
    declare selected: boolean;

    @manyToMany(() => Card, { pivotTable: "deck_cards" })
    declare cards: ManyToMany<typeof Card, typeof DeckCard>;

    @belongsTo(() => User)
    declare user: BelongsTo<typeof User>;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;
}
