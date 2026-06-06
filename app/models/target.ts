import { BaseModel, belongsTo, column } from "@adonisjs/lucid/orm";
import type { BelongsTo } from "@adonisjs/lucid/types/relations";
import type { DateTime } from "luxon";
import type { GalaguerreTargetTeam, GalaguerreTargetType } from "../galaguerre/galaguerre.types.js";
import Comparison from "./comparison.js";
import Tag from "./tag.js";

export default class Target extends BaseModel {
    @column({ isPrimary: true })
    declare id: number;

    @column()
    declare internalLabel: string;

    @column()
    declare type: GalaguerreTargetType;

    @column()
    declare targetTeam: GalaguerreTargetTeam;

    @column()
    declare comparisonId: number | null;

    @belongsTo(() => Comparison)
    declare comparison: BelongsTo<typeof Comparison>;

    @column()
    declare tagId: number | null;

    @belongsTo(() => Tag)
    declare tag: BelongsTo<typeof Tag>;

    /**
     * When true, mass MINION effects skip the minion that triggers them ("your other minions").
     * Used by BOOST passive auras and mass battlecries/deathrattles when a source minion is known.
     */
    @column()
    declare excludeSelf: boolean;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;
}
