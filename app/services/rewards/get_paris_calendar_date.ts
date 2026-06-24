import { DateTime } from "luxon";
import { DAILY_TIMEZONE } from "#api_types/rewards.types";

export const getParisCalendarDate = (): string =>
    DateTime.now().setZone(DAILY_TIMEZONE).toISODate()!;

export const isParisCalendarDateToday = (date: DateTime | null): boolean => {
    if (!date) return false;

    return date.toISODate() === getParisCalendarDate();
};

export const parseParisCalendarDate = (isoDate: string): DateTime =>
    DateTime.fromISO(isoDate, { zone: DAILY_TIMEZONE });
