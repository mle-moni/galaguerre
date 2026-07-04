import type { HttpContext } from "@adonisjs/core/http";
import {
    claimDailyQuest,
    DailyQuestAlreadyClaimedError,
    DailyQuestNotCompletedError,
    DailyQuestNotFoundError,
} from "#services/daily_quests/claim_daily_quest";
import { listDailyQuests } from "#services/daily_quests/list_daily_quests";

export default class DailyQuestsController {
    async index({ auth }: HttpContext) {
        return listDailyQuests(auth.user!.id);
    }

    async claim({ auth, params, response }: HttpContext) {
        const questId = Number(params.id);

        if (!Number.isInteger(questId) || questId <= 0) {
            return response.badRequest({ error: "Identifiant de quête invalide" });
        }

        try {
            return await claimDailyQuest(auth.user!.id, questId);
        } catch (error) {
            if (
                error instanceof DailyQuestNotFoundError ||
                error instanceof DailyQuestNotCompletedError ||
                error instanceof DailyQuestAlreadyClaimedError
            ) {
                return response.badRequest({ error: error.message });
            }

            throw error;
        }
    }
}
