import type { CompactGamePresentationUpdate } from "#galaguerre/game_replay/compact_replay_step";
import { BaseModel, belongsTo, column } from "@adonisjs/lucid/orm";
import type { BelongsTo } from "@adonisjs/lucid/types/relations";
import type { DateTime } from "luxon";
import Game from "./game.js";

export default class GameReplayStep extends BaseModel {
    static table = "game_replay_steps";

    @column({ isPrimary: true })
    declare id: number;

    @column()
    declare gameId: number;

    @belongsTo(() => Game)
    declare game: BelongsTo<typeof Game>;

    @column()
    declare stepIndex: number;

    @column()
    declare data: CompactGamePresentationUpdate;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;
}
