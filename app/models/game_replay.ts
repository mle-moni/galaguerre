import type { GameReplayData } from "#api_types/game_replay.types";
import { BaseModel, belongsTo, column } from "@adonisjs/lucid/orm";
import type { BelongsTo } from "@adonisjs/lucid/types/relations";
import type { DateTime } from "luxon";
import Game from "./game.js";

export default class GameReplay extends BaseModel {
    static table = "game_replays";

    @column({ isPrimary: true })
    declare id: number;

    @column()
    declare gameId: number;

    @belongsTo(() => Game)
    declare game: BelongsTo<typeof Game>;

    @column()
    declare data: GameReplayData;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    toReplayData(): GameReplayData {
        return this.data;
    }
}
