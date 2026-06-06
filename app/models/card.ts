import { BaseModel, belongsTo, column, manyToMany } from "@adonisjs/lucid/orm";
import type { BelongsTo, ManyToMany } from "@adonisjs/lucid/types/relations";
import type { DateTime } from "luxon";
import type { GalaguerreCardMode, GalaguerreCardType } from "../galaguerre/galaguerre.types.js";
import type CardTag from "./card_tag.js";
import Minion from "./minion.js";
import Spell from "./spell.js";
import Tag from "./tag.js";
import Weapon from "./weapon.js";

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
    declare cardMode: GalaguerreCardMode;

    @column()
    declare minionId: number | null;

    @belongsTo(() => Minion)
    declare minion: BelongsTo<typeof Minion>;

    @column()
    declare spellId: number | null;

    @belongsTo(() => Spell)
    declare spell: BelongsTo<typeof Spell>;

    @column()
    declare weaponId: number | null;

    @belongsTo(() => Weapon)
    declare weapon: BelongsTo<typeof Weapon>;

    @manyToMany(() => Tag, { pivotTable: "card_tags" })
    declare tags: ManyToMany<typeof Tag, typeof CardTag>;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;
}
