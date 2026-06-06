import type { CardActionSnapshot } from "#api_types/game.types";

const formatHeroTeamLabel = (targetTeam: "PLAYER" | "OPPONENT"): string => {
    return targetTeam === "PLAYER" ? "allié" : "adverse";
};

export const formatActionDescription = (action: CardActionSnapshot): string | null => {
    switch (action.type) {
        case "DAMAGE": {
            if (action.damage === null || action.damage <= 0) return null;
            if (action.target?.type === "HERO") {
                return `Cri de guerre : Inflige ${action.damage} dégâts au héros ${formatHeroTeamLabel(action.target.targetTeam)}.`;
            }
            return `Cri de guerre : Inflige ${action.damage} dégâts au héros adverse.`;
        }
        case "HEAL": {
            if (action.heal === null || action.heal <= 0) return null;
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
