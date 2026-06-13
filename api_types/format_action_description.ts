import type {
    BoostSnapshot,
    CardActionSnapshot,
    CardFilterSnapshot,
    CardTag,
    TargetSnapshot,
} from "./game.types.js";
import { CARD_TAG_LABELS } from "./card.types.js";
import { getDisplayedDamage } from "./get_effective_damage.js";
import { hasRandomLimitedTarget } from "./target_matching.js";

const CARD_TYPE_LABELS: Record<CardFilterSnapshot["type"], string> = {
    MINION: "Monstre",
    SPELL: "Sort",
    WEAPON: "Arme",
};

const formatTagChip = (tag: CardTag): string => {
    const meta = CARD_TAG_LABELS[tag];
    return `${meta.symbol} ${meta.label}`;
};

const formatTagList = (tags: CardTag[]): string => tags.map(formatTagChip).join(", ");

const withPrepositionA = (label: string): string => {
    if (label.startsWith("les ")) {
        return `aux ${label.slice(4)}`;
    }
    if (label.startsWith("le ")) {
        return `au ${label.slice(3)}`;
    }
    return `à ${label}`;
};

const formatHeroTeamLabel = (targetTeam: "PLAYER" | "OPPONENT" | "ALL"): string => {
    if (targetTeam === "ALL") return "tous les héros";
    return targetTeam === "PLAYER" ? "allié" : "adverse";
};

const formatSingleMinionTeamLabel = (targetTeam: "PLAYER" | "OPPONENT" | "ALL"): string => {
    if (targetTeam === "ALL") return "";
    return targetTeam === "PLAYER" ? "allié" : "adverse";
};

const formatSingleCharacterTeamLabel = (targetTeam: "PLAYER" | "OPPONENT" | "ALL"): string => {
    if (targetTeam === "ALL") return "un personnage";
    return targetTeam === "PLAYER" ? "un de vos personnages" : "un personnage adverse";
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
    if (action.target.tag) {
        parts.push(formatTagChip(action.target.tag));
    }

    if (parts.length === 0) return "";
    return ` ${parts.join(" + ")}`;
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

const formatRandomMinionLabel = (
    targetTeam: TargetSnapshot["targetTeam"],
    maxTargets: number,
): string => {
    if (maxTargets === 1) {
        const teamLabel = formatSingleMinionTeamLabel(targetTeam);
        return teamLabel ? `un serviteur ${teamLabel} aléatoire` : "un serviteur aléatoire";
    }
    if (targetTeam === "ALL") {
        return `${maxTargets} serviteurs aléatoires`;
    }
    if (targetTeam === "PLAYER") {
        return `${maxTargets} de vos serviteurs aléatoires`;
    }
    return `${maxTargets} serviteurs adverses aléatoires`;
};

const formatRandomHeroLabel = (
    targetTeam: TargetSnapshot["targetTeam"],
    maxTargets: number,
): string => {
    if (maxTargets === 1) {
        return `au héros ${formatHeroTeamLabel(targetTeam)} aléatoire`;
    }
    if (targetTeam === "ALL") {
        return `à ${maxTargets} héros aléatoires`;
    }
    if (targetTeam === "PLAYER") {
        return `à ${maxTargets} de vos héros aléatoires`;
    }
    return `à ${maxTargets} héros adverses aléatoires`;
};

const formatRandomAllLabel = (
    targetTeam: TargetSnapshot["targetTeam"],
    maxTargets: number,
    excludeSelf: boolean,
): string => {
    if (maxTargets === 1) {
        if (targetTeam === "ALL") {
            return excludeSelf ? "un autre personnage aléatoire" : "un personnage aléatoire";
        }
        if (targetTeam === "PLAYER") {
            return excludeSelf
                ? "un de vos autres personnages aléatoire"
                : "un de vos personnages aléatoire";
        }
        return excludeSelf
            ? "un autre personnage adverse aléatoire"
            : "un personnage adverse aléatoire";
    }
    if (targetTeam === "ALL") {
        return excludeSelf
            ? `${maxTargets} autres personnages aléatoires`
            : `${maxTargets} personnages aléatoires`;
    }
    if (targetTeam === "PLAYER") {
        return excludeSelf
            ? `${maxTargets} de vos autres personnages aléatoires`
            : `${maxTargets} de vos personnages aléatoires`;
    }
    return excludeSelf
        ? `${maxTargets} autres personnages adverses aléatoires`
        : `${maxTargets} personnages adverses aléatoires`;
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
    if (filter.tags.length > 0) {
        parts.push(formatTagList(filter.tags));
    }

    return ` ${parts.join(" + ")}`;
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

            if (action.target && hasRandomLimitedTarget(action.target)) {
                const { target } = action;
                if (target.type === "MINION") {
                    return `${prefix} : Inflige ${damage} dégâts ${withPrepositionA(formatRandomMinionLabel(target.targetTeam, target.maxTargets!))}${formatTargetFilterSuffix(action)}.`;
                }
                if (target.type === "HERO") {
                    return `${prefix} : Inflige ${damage} dégâts ${formatRandomHeroLabel(target.targetTeam, target.maxTargets!)}.`;
                }
                return `${prefix} : Inflige ${damage} dégâts ${withPrepositionA(formatRandomAllLabel(target.targetTeam, target.maxTargets!, target.excludeSelf))}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.isTargeted && action.target?.type === "MINION") {
                const teamLabel = formatSingleMinionTeamLabel(action.target.targetTeam);
                const teamPart = teamLabel ? ` ${teamLabel}` : "";
                return `${prefix} : Inflige ${damage} dégâts à un serviteur${teamPart}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.isTargeted && action.target?.type === "HERO") {
                return `${prefix} : Inflige ${damage} dégâts au héros ${formatHeroTeamLabel(action.target.targetTeam)}.`;
            }

            if (action.isTargeted && action.target?.type === "ALL") {
                return `${prefix} : Inflige ${damage} dégâts ${withPrepositionA(formatSingleCharacterTeamLabel(action.target.targetTeam))}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.target?.type === "MINION") {
                return `${prefix} : Inflige ${damage} dégâts ${withPrepositionA(formatMassMinionTeamLabel(action.target.targetTeam, action.target.excludeSelf))}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.target?.type === "ALL") {
                return `${prefix} : Inflige ${damage} dégâts ${withPrepositionA(formatAllTeamLabel(action.target.targetTeam, action.target.excludeSelf))}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.target?.type === "HERO") {
                return `${prefix} : Inflige ${damage} dégâts au héros ${formatHeroTeamLabel(action.target.targetTeam)}.`;
            }
            return `${prefix} : Inflige ${damage} dégâts au héros adverse.`;
        }
        case "HEAL": {
            if (action.heal === null || action.heal <= 0) return null;

            if (action.target && hasRandomLimitedTarget(action.target)) {
                const { target } = action;
                if (target.type === "MINION") {
                    return `${prefix} : Rend ${action.heal} PV ${withPrepositionA(formatRandomMinionLabel(target.targetTeam, target.maxTargets!))}${formatTargetFilterSuffix(action)}.`;
                }
                if (target.type === "HERO") {
                    return `${prefix} : Rend ${action.heal} PV ${formatRandomHeroLabel(target.targetTeam, target.maxTargets!)}.`;
                }
                return `${prefix} : Rend ${action.heal} PV ${withPrepositionA(formatRandomAllLabel(target.targetTeam, target.maxTargets!, target.excludeSelf))}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.isTargeted && action.target?.type === "MINION") {
                const teamLabel = formatSingleMinionTeamLabel(action.target.targetTeam);
                const teamPart = teamLabel ? ` ${teamLabel}` : "";
                return `${prefix} : Rend ${action.heal} PV à un serviteur${teamPart}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.isTargeted && action.target?.type === "HERO") {
                return `${prefix} : Rend ${action.heal} PV au héros ${formatHeroTeamLabel(action.target.targetTeam)}.`;
            }

            if (action.isTargeted && action.target?.type === "ALL") {
                return `${prefix} : Rend ${action.heal} PV ${withPrepositionA(formatSingleCharacterTeamLabel(action.target.targetTeam))}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.target?.type === "MINION") {
                return `${prefix} : Rend ${action.heal} PV ${withPrepositionA(formatMassMinionTeamLabel(action.target.targetTeam, action.target.excludeSelf))}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.target?.type === "ALL") {
                return `${prefix} : Rend ${action.heal} PV ${withPrepositionA(formatAllTeamLabel(action.target.targetTeam, action.target.excludeSelf))}${formatTargetFilterSuffix(action)}.`;
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

            if (action.target && hasRandomLimitedTarget(action.target)) {
                const { target } = action;
                if (target.type === "MINION") {
                    return `${prefix} : Donne ${effectText} ${withPrepositionA(formatRandomMinionLabel(target.targetTeam, target.maxTargets!))}${formatTargetFilterSuffix(action)}.`;
                }
                if (target.type === "HERO") {
                    return `${prefix} : Donne ${effectText} ${formatRandomHeroLabel(target.targetTeam, target.maxTargets!)}.`;
                }
                return `${prefix} : Donne ${effectText} ${withPrepositionA(formatRandomAllLabel(target.targetTeam, target.maxTargets!, target.excludeSelf))}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.isTargeted && action.target?.type === "MINION") {
                const teamLabel = formatSingleMinionTeamLabel(action.target.targetTeam);
                const teamPart = teamLabel ? ` ${teamLabel}` : "";
                return `${prefix} : Donne ${effectText} à un serviteur${teamPart}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.isTargeted && action.target?.type === "HERO") {
                return `${prefix} : Donne ${effectText} au héros ${formatHeroTeamLabel(action.target.targetTeam)}.`;
            }

            if (action.isTargeted && action.target?.type === "ALL") {
                return `${prefix} : Donne ${effectText} ${withPrepositionA(formatSingleCharacterTeamLabel(action.target.targetTeam))}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.target?.type === "MINION") {
                return `${prefix} : Donne ${effectText} ${withPrepositionA(formatMassMinionTeamLabel(action.target.targetTeam, action.target.excludeSelf))}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.target?.type === "ALL") {
                return `${prefix} : Donne ${effectText} ${withPrepositionA(formatAllTeamLabel(action.target.targetTeam, action.target.excludeSelf))}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.target?.type === "HERO") {
                return `${prefix} : Donne ${effectText} au héros ${formatHeroTeamLabel(action.target.targetTeam)}.`;
            }

            return `${prefix} : Donne ${effectText}.`;
        }
        case "SILENCE": {
            if (action.target && hasRandomLimitedTarget(action.target)) {
                const { target } = action;
                if (target.type === "MINION") {
                    return `${prefix} : Réduit au silence ${withPrepositionA(formatRandomMinionLabel(target.targetTeam, target.maxTargets!))}${formatTargetFilterSuffix(action)}.`;
                }
                return `${prefix} : Réduit au silence ${withPrepositionA(formatRandomAllLabel(target.targetTeam, target.maxTargets!, target.excludeSelf))}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.isTargeted && action.target?.type === "MINION") {
                const teamLabel = formatSingleMinionTeamLabel(action.target.targetTeam);
                const teamPart = teamLabel ? ` ${teamLabel}` : "";
                return `${prefix} : Réduit au silence un serviteur${teamPart}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.target?.type === "MINION") {
                return `${prefix} : Réduit au silence ${withPrepositionA(formatMassMinionTeamLabel(action.target.targetTeam, action.target.excludeSelf))}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.target?.type === "ALL") {
                return `${prefix} : Réduit au silence ${withPrepositionA(formatAllTeamLabel(action.target.targetTeam, action.target.excludeSelf))}${formatTargetFilterSuffix(action)}.`;
            }

            return `${prefix} : Réduit au silence un serviteur.`;
        }
        default:
            return null;
    }
};
