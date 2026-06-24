import User from "#models/user";
import { grantCardPacksForUser } from "#services/collection/grant_card_packs_for_user";
import { getUnopenedPackCount } from "#services/collection/get_unopened_pack_count";
import {
    getParisCalendarDate,
    isParisCalendarDateToday,
    parseParisCalendarDate,
} from "#services/rewards/get_paris_calendar_date";
import db from "@adonisjs/lucid/services/db";

export class OnboardingNotCompleteError extends Error {
    constructor() {
        super("Terminez l'onboarding avant de réclamer votre paquet quotidien.");
        this.name = "OnboardingNotCompleteError";
    }
}

export class DailyPackAlreadyClaimedError extends Error {
    constructor() {
        super("Vous avez déjà réclamé votre paquet quotidien aujourd'hui.");
        this.name = "DailyPackAlreadyClaimedError";
    }
}

export const canClaimDailyPack = (user: User): boolean =>
    user.onboardingCompletedAt !== null && !isParisCalendarDateToday(user.lastDailyPackClaimedOn);

export const claimDailyPack = async (userId: number): Promise<{ unopenedCount: number }> => {
    return db.transaction(async (trx) => {
        const user = await User.query({ client: trx })
            .where("id", userId)
            .forUpdate()
            .firstOrFail();

        if (!user.onboardingCompletedAt) {
            throw new OnboardingNotCompleteError();
        }

        if (isParisCalendarDateToday(user.lastDailyPackClaimedOn)) {
            throw new DailyPackAlreadyClaimedError();
        }

        user.lastDailyPackClaimedOn = parseParisCalendarDate(getParisCalendarDate());
        user.useTransaction(trx);
        await user.save();

        await grantCardPacksForUser(user.id, 1, trx);

        return { unopenedCount: await getUnopenedPackCount(user.id, trx) };
    });
};
