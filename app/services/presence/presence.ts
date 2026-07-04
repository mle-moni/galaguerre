import User from "#models/user";
import { DateTime } from "luxon";

export const PRESENCE_ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

export const touchPresence = async (userId: number) => {
    await User.query().where("id", userId).update({ lastSeenAt: DateTime.now() });
};

export const isUserOnline = (lastSeenAt: DateTime | null): boolean => {
    if (!lastSeenAt) return false;
    return DateTime.now().diff(lastSeenAt).as("milliseconds") < PRESENCE_ONLINE_THRESHOLD_MS;
};
