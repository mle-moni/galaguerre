import { REPLAY_FORMAT_VERSION } from "#api_types/game_replay.types";
import { BaseModel, belongsTo, column, hasMany } from "@adonisjs/lucid/orm";
import type { BelongsTo, HasMany } from "@adonisjs/lucid/types/relations";
import type { DateTime } from "luxon";
import Game from "./game.js";
import GameReplayStep from "./game_replay_step.js";

export default class GameReplay extends BaseModel {
    static table = "game_replays";

    @column({ isPrimary: true })
    declare id: number;

    @column()
    declare gameId: number;

    @belongsTo(() => Game)
    declare game: BelongsTo<typeof Game>;

    @column()
    declare version: typeof REPLAY_FORMAT_VERSION;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @hasMany(() => GameReplayStep, { foreignKey: "gameId", localKey: "gameId" })
    declare steps: HasMany<typeof GameReplayStep>;
}
