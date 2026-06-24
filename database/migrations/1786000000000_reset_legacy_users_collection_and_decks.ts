import logger from "@adonisjs/core/services/logger";
import { BaseSchema } from "@adonisjs/lucid/schema";
import {
    findLegacyUserIdsWithoutCollection,
    resetLegacyUserToStarterState,
} from "#services/collection/reset_legacy_user_to_starter_state";

export default class extends BaseSchema {
    async up() {
        this.defer(async () => {
            const userIds = await findLegacyUserIdsWithoutCollection();

            for (const userId of userIds) {
                await resetLegacyUserToStarterState(userId);
            }

            logger.info(
                `Reset ${userIds.length} legacy user(s) to starter collection, starter deck, and compensation packs`,
            );
        });
    }

    async down() {
        logger.warn("This migration cannot be reversed");
    }
}
