import type { CardRecapData } from "./generated/card_recaps.js";

export const formatRecapShortDescription = (recap: CardRecapData): string => {
    const parts: string[] = [];
    const newCount = recap.newCardIds.length;
    const goldenCount = recap.newGoldenCardIds.filter(
        (id) => !recap.newCardIds.includes(id),
    ).length;
    const buffCount = recap.buffs.length;
    const nerfCount = recap.nerfs.length;

    if (newCount > 0) {
        parts.push(
            `${newCount} nouvelle${newCount > 1 ? "s" : ""} carte${newCount > 1 ? "s" : ""}`,
        );
    }
    if (goldenCount > 0) {
        parts.push(`${goldenCount} version${goldenCount > 1 ? "s" : ""} golden`);
    }
    if (buffCount > 0) {
        parts.push(`${buffCount} buff${buffCount > 1 ? "s" : ""}`);
    }
    if (nerfCount > 0) {
        parts.push(`${nerfCount} nerf${nerfCount > 1 ? "s" : ""}`);
    }

    return parts.join(", ");
};

export const formatRecapTitle = (date: string): string => {
    const [year, month, day] = date.split("-");
    return `Récap des cartes du ${day}/${month}/${year}`;
};
