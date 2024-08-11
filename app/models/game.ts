import type { GameData } from "#api_types/game.types";
import { BaseModel, belongsTo, column } from "@adonisjs/lucid/orm";
import type { BelongsTo } from "@adonisjs/lucid/types/relations";
import type { DateTime } from "luxon";
import User from "./user.js";

export default class Game extends BaseModel {
    @column({ isPrimary: true })
    declare id: number;

    @column()
    declare playerOneId: number;

    @belongsTo(() => User, { foreignKey: "playerOneId" })
    declare playerOne: BelongsTo<typeof User>;

    @column()
    declare playerTwoId: number;

    @belongsTo(() => User, { foreignKey: "playerTwoId" })
    declare playerTwo: BelongsTo<typeof User>;

    @column()
    declare data: GameData;

    @column()
    declare isFinished: boolean;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;
}
