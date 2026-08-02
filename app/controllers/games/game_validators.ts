import { AI_DIFFICULTIES } from "#api_types/game.types";
import vine from "@vinejs/vine";

export const createTrainingGameSchema = vine.create({
    difficulty: vine.enum(AI_DIFFICULTIES).optional(),
});
