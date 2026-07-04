import type { NewsBalanceChange } from "./generated/weekly_recaps.js";

const FIELD_LABELS: Record<NewsBalanceChange["field"], string> = {
    cost: "Coût",
    attack: "Attaque",
    health: "Vie",
    damage: "Dégâts",
    durability: "Durabilité",
};

export const formatBalanceChange = (change: NewsBalanceChange): string => {
    const label = FIELD_LABELS[change.field];
    return `${label} : ${change.from ?? "—"} → ${change.to ?? "—"}`;
};
