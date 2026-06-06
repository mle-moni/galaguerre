import type { CardActionSnapshot } from "#api_types/game.types";

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

export const formatActionDescription = (action: CardActionSnapshot): string | null => {
    switch (action.type) {
        case "DAMAGE": {
            if (action.damage === null || action.damage <= 0) return null;

            if (action.isTargeted && action.target?.type === "MINION") {
                return `Cri de guerre : Inflige ${action.damage} dégâts à un serviteur ${formatMinionTeamLabel(action.target.targetTeam)}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.isTargeted && action.target?.type === "HERO") {
                return `Cri de guerre : Inflige ${action.damage} dégâts au héros ${formatHeroTeamLabel(action.target.targetTeam)}.`;
            }

            if (action.target?.type === "HERO") {
                return `Cri de guerre : Inflige ${action.damage} dégâts au héros ${formatHeroTeamLabel(action.target.targetTeam)}.`;
            }
            return `Cri de guerre : Inflige ${action.damage} dégâts au héros adverse.`;
        }
        case "HEAL": {
            if (action.heal === null || action.heal <= 0) return null;

            if (action.isTargeted && action.target?.type === "MINION") {
                return `Cri de guerre : Rend ${action.heal} PV à un serviteur ${formatMinionTeamLabel(action.target.targetTeam)}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.isTargeted && action.target?.type === "HERO") {
                return `Cri de guerre : Rend ${action.heal} PV au héros ${formatHeroTeamLabel(action.target.targetTeam)}.`;
            }

            if (action.target?.type === "HERO") {
                return `Cri de guerre : Rend ${action.heal} PV au héros ${formatHeroTeamLabel(action.target.targetTeam)}.`;
            }
            return `Cri de guerre : Rend ${action.heal} PV au héros allié.`;
        }
        case "DRAW": {
            if (action.drawCount === null || action.drawCount <= 0) return null;
            const suffix = action.drawCount === 1 ? "carte" : "cartes";
            return `Cri de guerre : Pioche ${action.drawCount} ${suffix}.`;
        }
        case "ENEMY_DRAW": {
            if (action.enemyDrawCount === null || action.enemyDrawCount <= 0) return null;
            const suffix = action.enemyDrawCount === 1 ? "carte" : "cartes";
            return `Cri de guerre : L'adversaire pioche ${action.enemyDrawCount} ${suffix}.`;
        }
        default:
            return null;
    }
};
