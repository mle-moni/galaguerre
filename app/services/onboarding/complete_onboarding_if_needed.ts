import User from "#models/user";
import { DateTime } from "luxon";

export const completeOnboardingIfNeeded = async (userId: number): Promise<void> => {
    const user = await User.find(userId);
    if (!user || user.onboardingCompletedAt) return;

    user.onboardingCompletedAt = DateTime.now();
    await user.save();
};
