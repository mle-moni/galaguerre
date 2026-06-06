import type { BoostSnapshot, CardActionSnapshot, CardFilterSnapshot } from "./game.types.js";
import { getDisplayedDamage } from "./get_effective_damage.js";

const CARD_TYPE_LABELS: Record<CardFilterSnapshot["type"], string> = {
    MINION: "Monstre",
    SPELL: "Sort",
    WEAPON: "Arme",
};

const formatHeroTeamLabel = (targetTeam: "PLAYER" | "OPPONENT" | "ALL"): string => {
    if (targetTeam === "ALL") return "tous les héros";
    return targetTeam === "PLAYER" ? "allié" : "adverse";
};

const formatMinionTeamLabel = (targetTeam: "PLAYER" | "OPPONENT" | "ALL"): string => {
    if (targetTeam === "ALL") return "tous les serviteurs";
    return targetTeam === "PLAYER" ? "allié" : "adverse";
};

const formatAllTeamLabel = (
    targetTeam: "PLAYER" | "OPPONENT" | "ALL",
    excludeSelf = false,
): string => {
    if (targetTeam === "ALL") {
        return excludeSelf ? "tous les autres personnages" : "tous les personnages";
    }
    if (targetTeam === "PLAYER") {
        return excludeSelf ? "tous vos autres personnages" : "tous vos personnages";
    }
    return excludeSelf ? "tous les autres personnages adverses" : "tous les personnages adverses";
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

const formatMassMinionTeamLabel = (
    targetTeam: "PLAYER" | "OPPONENT" | "ALL",
    excludeSelf = false,
): string => {
    if (targetTeam === "ALL") {
        return excludeSelf ? "tous les autres serviteurs" : "tous les serviteurs";
    }
    if (targetTeam === "PLAYER") {
        return excludeSelf ? "vos autres serviteurs" : "vos serviteurs";
    }
    return excludeSelf ? "les autres serviteurs adverses" : "les serviteurs adverses";
};

const formatCardFilterSuffix = (filter: CardFilterSnapshot | null): string => {
    if (!filter) return "";

    const parts: string[] = [CARD_TYPE_LABELS[filter.type]];
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
    spellPower?: number,
): string | null => {
    switch (action.type) {
        case "DAMAGE": {
            const damage = getDisplayedDamage(action, spellPower);
            if (damage === null) return null;

            if (action.isTargeted && action.target?.type === "MINION") {
                return `${prefix} : Inflige ${damage} dégâts à un serviteur ${formatMinionTeamLabel(action.target.targetTeam)}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.isTargeted && action.target?.type === "HERO") {
                return `${prefix} : Inflige ${damage} dégâts au héros ${formatHeroTeamLabel(action.target.targetTeam)}.`;
            }

            if (action.target?.type === "MINION") {
                return `${prefix} : Inflige ${damage} dégâts à ${formatMassMinionTeamLabel(action.target.targetTeam, action.target.excludeSelf)}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.target?.type === "ALL") {
                return `${prefix} : Inflige ${damage} dégâts à ${formatAllTeamLabel(action.target.targetTeam, action.target.excludeSelf)}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.target?.type === "HERO") {
                return `${prefix} : Inflige ${damage} dégâts au héros ${formatHeroTeamLabel(action.target.targetTeam)}.`;
            }
            return `${prefix} : Inflige ${damage} dégâts au héros adverse.`;
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
                return `${prefix} : Rend ${action.heal} PV à ${formatMassMinionTeamLabel(action.target.targetTeam, action.target.excludeSelf)}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.target?.type === "ALL") {
                return `${prefix} : Rend ${action.heal} PV à ${formatAllTeamLabel(action.target.targetTeam, action.target.excludeSelf)}${formatTargetFilterSuffix(action)}.`;
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
                return `${prefix} : Donne ${effectText} à ${formatMassMinionTeamLabel(action.target.targetTeam, action.target.excludeSelf)}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.target?.type === "ALL") {
                return `${prefix} : Donne ${effectText} à ${formatAllTeamLabel(action.target.targetTeam, action.target.excludeSelf)}${formatTargetFilterSuffix(action)}.`;
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
