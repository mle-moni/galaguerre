import type { HttpContext } from "@adonisjs/core/http";
import {
    claimProgressionLevel,
    ProgressionLevelAlreadyClaimedError,
    ProgressionLevelNotClaimableError,
} from "#services/progression/claim_progression_level";

export default class ProgressionController {
    async claim({ auth, params, response }: HttpContext) {
        const level = Number(params.level);

        if (!Number.isInteger(level) || level <= 0) {
            return response.badRequest({ error: "Niveau invalide" });
        }

        try {
            return await claimProgressionLevel(auth.user!.id, level);
        } catch (error) {
            if (
                error instanceof ProgressionLevelNotClaimableError ||
                error instanceof ProgressionLevelAlreadyClaimedError
            ) {
                return response.badRequest({ error: error.message });
            }

            throw error;
        }
    }
}
