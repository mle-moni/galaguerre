import type { WeeklyRecapData } from "./generated/weekly_recaps.js";

export const formatRecapShortDescription = (recap: WeeklyRecapData): string => {
    const parts: string[] = [];
    const newCount = recap.newCardIds.length;
    const buffCount = recap.buffs.length;
    const nerfCount = recap.nerfs.length;

    if (newCount > 0) {
        parts.push(
            `${newCount} nouvelle${newCount > 1 ? "s" : ""} carte${newCount > 1 ? "s" : ""}`,
        );
    }
    if (buffCount > 0) {
        parts.push(`${buffCount} buff${buffCount > 1 ? "s" : ""}`);
    }
    if (nerfCount > 0) {
        parts.push(`${nerfCount} nerf${nerfCount > 1 ? "s" : ""}`);
    }

    return parts.join(", ");
};

export const formatRecapTitle = (week: string): string => {
    const [year, weekNumber] = week.split("-W");
    return `Récap des cartes — semaine ${Number(weekNumber)} (${year})`;
};
