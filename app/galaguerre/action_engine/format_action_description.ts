import type { BoostSnapshot, CardActionSnapshot, CardFilterSnapshot } from "#api_types/game.types";
import { GALAGUERRE_CARD_TYPES_LABEL_OBJ } from "../galaguerre.types.js";

const formatHeroTeamLabel = (targetTeam: "PLAYER" | "OPPONENT"): string => {
    return targetTeam === "PLAYER" ? "allié" : "adverse";
};

const formatMinionTeamLabel = (targetTeam: "PLAYER" | "OPPONENT"): string => {
    return targetTeam === "PLAYER" ? "allié" : "adverse";
};

const formatTargetFilterSuffix = (action: CardActionSnapshot): string => {
    if (!action.target) return "";

    const parts: string[] = [];
    const comparison = action.target.comparison;

    if (comparison?.attackComparison && comparison.attack !== null) {
        parts.push(`attaque ${comparison.attackComparison} ${comparison.attack}`);
    }
    if (comparison?.healthComparison && comparison.health !== null) {
        parts.push(`pv ${comparison.healthComparison} ${comparison.health}`);
    }
    if (comparison?.costComparison && comparison.cost !== null) {
        parts.push(`coût ${comparison.costComparison} ${comparison.cost}`);
    }
    if (action.target.tagId !== null) {
        parts.push("avec le tag requis");
    }

    if (parts.length === 0) return "";
    return ` (${parts.join(", ")})`;
};

const formatBoostStatSuffix = (boost: BoostSnapshot): string => {
    const parts: string[] = [];

    if (boost.attack !== null && boost.health !== null) {
        parts.push(`+${boost.attack}/+${boost.health}`);
    } else {
        if (boost.attack !== null) parts.push(`+${boost.attack} attaque`);
        if (boost.health !== null) parts.push(`+${boost.health} PV`);
    }

    if (boost.spellPower !== null) {
        parts.push(`+${boost.spellPower} dégâts de sort`);
    }

    if (boost.minionPower) {
        if (boost.minionPower.hasTaunt) parts.push("Provocation");
        if (boost.minionPower.hasCharge) parts.push("Charge");
        if (boost.minionPower.hasWindfury) parts.push("Furie des vents");
        if (boost.minionPower.isPoisonous) parts.push("Toxique");
    }

    return parts.join(", ");
};

const formatMassMinionTeamLabel = (targetTeam: "PLAYER" | "OPPONENT"): string => {
    return targetTeam === "PLAYER" ? "vos serviteurs" : "les serviteurs adverses";
};

const formatCardFilterSuffix = (filter: CardFilterSnapshot | null): string => {
    if (!filter) return "";

    const parts: string[] = [GALAGUERRE_CARD_TYPES_LABEL_OBJ[filter.type]];
    const comparison = filter.comparison;

    if (comparison?.attackComparison && comparison.attack !== null) {
        parts.push(`attaque ${comparison.attackComparison} ${comparison.attack}`);
    }
    if (comparison?.healthComparison && comparison.health !== null) {
        parts.push(`pv ${comparison.healthComparison} ${comparison.health}`);
    }
    if (comparison?.costComparison && comparison.cost !== null) {
        parts.push(`coût ${comparison.costComparison} ${comparison.cost}`);
    }
    if (filter.tagIds.length > 0) {
        parts.push("avec le tag requis");
    }

    return ` (${parts.join(", ")})`;
};

export const formatActionDescription = (
    action: CardActionSnapshot,
    prefix = "Cri de guerre",
): string | null => {
    switch (action.type) {
        case "DAMAGE": {
            if (action.damage === null || action.damage <= 0) return null;

            if (action.isTargeted && action.target?.type === "MINION") {
                return `${prefix} : Inflige ${action.damage} dégâts à un serviteur ${formatMinionTeamLabel(action.target.targetTeam)}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.isTargeted && action.target?.type === "HERO") {
                return `${prefix} : Inflige ${action.damage} dégâts au héros ${formatHeroTeamLabel(action.target.targetTeam)}.`;
            }

            if (action.target?.type === "MINION") {
                return `${prefix} : Inflige ${action.damage} dégâts à ${formatMassMinionTeamLabel(action.target.targetTeam)}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.target?.type === "HERO") {
                return `${prefix} : Inflige ${action.damage} dégâts au héros ${formatHeroTeamLabel(action.target.targetTeam)}.`;
            }
            return `${prefix} : Inflige ${action.damage} dégâts au héros adverse.`;
        }
        case "HEAL": {
            if (action.heal === null || action.heal <= 0) return null;

            if (action.isTargeted && action.target?.type === "MINION") {
                return `${prefix} : Rend ${action.heal} PV à un serviteur ${formatMinionTeamLabel(action.target.targetTeam)}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.isTargeted && action.target?.type === "HERO") {
                return `${prefix} : Rend ${action.heal} PV au héros ${formatHeroTeamLabel(action.target.targetTeam)}.`;
            }

            if (action.target?.type === "MINION") {
                return `${prefix} : Rend ${action.heal} PV à ${formatMassMinionTeamLabel(action.target.targetTeam)}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.target?.type === "HERO") {
                return `${prefix} : Rend ${action.heal} PV au héros ${formatHeroTeamLabel(action.target.targetTeam)}.`;
            }
            return `${prefix} : Rend ${action.heal} PV au héros allié.`;
        }
        case "DRAW": {
            if (action.drawCount === null || action.drawCount <= 0) return null;
            const suffix = action.drawCount === 1 ? "carte" : "cartes";
            return `${prefix} : Pioche ${action.drawCount} ${suffix}${formatCardFilterSuffix(action.drawCardFilter)}.`;
        }
        case "ENEMY_DRAW": {
            if (action.enemyDrawCount === null || action.enemyDrawCount <= 0) return null;
            const suffix = action.enemyDrawCount === 1 ? "carte" : "cartes";
            return `${prefix} : L'adversaire pioche ${action.enemyDrawCount} ${suffix}${formatCardFilterSuffix(action.enemyDrawCardFilter)}.`;
        }
        case "BOOST": {
            if (!action.boost) return null;

            const effectText = formatBoostStatSuffix(action.boost);
            if (!effectText) return null;

            if (action.isTargeted && action.target?.type === "MINION") {
                return `${prefix} : Donne ${effectText} à un serviteur ${formatMinionTeamLabel(action.target.targetTeam)}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.isTargeted && action.target?.type === "HERO") {
                return `${prefix} : Donne ${effectText} au héros ${formatHeroTeamLabel(action.target.targetTeam)}.`;
            }

            if (action.target?.type === "MINION") {
                return `${prefix} : Donne ${effectText} à ${formatMassMinionTeamLabel(action.target.targetTeam)}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.target?.type === "HERO") {
                return `${prefix} : Donne ${effectText} au héros ${formatHeroTeamLabel(action.target.targetTeam)}.`;
            }

            return `${prefix} : Donne ${effectText}.`;
        }
        default:
            return null;
    }
};
