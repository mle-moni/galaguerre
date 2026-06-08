import type Game from "#models/game";
import type { DateTime } from "luxon";

export const getGameFinishedAt = (game: Game): DateTime => game.endedAt ?? game.updatedAt;

export const getGameFinishedAtIso = (game: Game): string => getGameFinishedAt(game).toISO()!;
