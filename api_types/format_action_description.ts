import type {
    BoostSnapshot,
    CardActionFieldsSnapshot,
    CardActionSnapshot,
    CardFilterSnapshot,
    CardTag,
    OnTargetResultDefinition,
    ReconvertParametersSnapshot,
    TargetSnapshot,
} from "./game.types.js";
import { GALADRIM_CARDS } from "#database/seed_data/cards/galadrim_cards";
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
    onlySelf = false,
): string => {
    if (onlySelf) return "lui-même";

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

    if (boost.minionPowers) {
        if (boost.minionPowers?.hasTaunt) parts.push("Provocation");
        if (boost.minionPowers?.hasCharge) parts.push("Charge");
        if (boost.minionPowers?.hasWindfury) parts.push("Furie des vents");
        if (boost.minionPowers?.isPoisonous) parts.push("Toxique");
        if (boost.minionPowers?.hasStealth) parts.push("Discrétion");
        if (boost.minionPowers?.hasDivineShield) parts.push("Immunité");
    }

    return parts.join(", ");
};

const formatMassMinionTeamLabel = (
    targetTeam: "PLAYER" | "OPPONENT" | "ALL",
    excludeSelf = false,
    onlySelf = false,
): string => {
    if (onlySelf) return "lui-même";

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

const formatRelativeReconvertSuffix = (parameters: ReconvertParametersSnapshot): string => {
    if (!parameters.relativeToSource || !parameters.comparison) return "";

    const parts: string[] = [];
    const comparison = parameters.comparison;

    if (comparison.costComparison !== null && comparison.cost !== null) {
        const offset = comparison.cost;
        if (offset === 0) {
            parts.push("du même coût que la cible");
        } else if (offset > 0) {
            parts.push(`coûtant ${offset} de plus que la cible`);
        } else {
            parts.push(`coûtant ${Math.abs(offset)} de moins que la cible`);
        }
    }
    if (comparison.attackComparison !== null && comparison.attack !== null) {
        const offset = comparison.attack;
        if (offset === 0) {
            parts.push("de la même attaque que la cible");
        } else if (offset > 0) {
            parts.push(`avec ${offset} d'attaque de plus que la cible`);
        } else {
            parts.push(`avec ${Math.abs(offset)} d'attaque de moins que la cible`);
        }
    }
    if (comparison.healthComparison !== null && comparison.health !== null) {
        const offset = comparison.health;
        if (offset === 0) {
            parts.push("avec les mêmes pv que la cible");
        } else if (offset > 0) {
            parts.push(`avec ${offset} pv de plus que la cible`);
        } else {
            parts.push(`avec ${Math.abs(offset)} pv de moins que la cible`);
        }
    }

    return parts.length > 0 ? ` ${parts.join(", ")}` : "";
};

const formatReconvertTargetLabel = (parameters: ReconvertParametersSnapshot | null): string => {
    if (!parameters) return "une autre carte";

    if (parameters.cardId !== null) {
        return (
            GALADRIM_CARDS.find((entry) => entry.id === parameters.cardId)?.data.name ??
            "une autre carte"
        );
    }

    let label = "un serviteur aléatoire";

    if (parameters.relativeToSource) {
        label += formatRelativeReconvertSuffix(parameters);
    } else {
        label += formatCardFilterSuffix({
            type: parameters.type,
            comparison: parameters.comparison,
            tags: [],
        });
    }

    if (parameters.tags.length > 0) {
        label += ` ${formatTagList(parameters.tags)}`;
    }

    return label;
};

const formatFollowUpActionClause = (action: CardActionFieldsSnapshot): string | null => {
    switch (action.type) {
        case "DRAW": {
            if (action.drawCount === null || action.drawCount <= 0) return null;
            const suffix = action.drawCount === 1 ? "carte" : "cartes";
            return `pioche ${action.drawCount} ${suffix}${formatCardFilterSuffix(action.drawCardFilter)}`;
        }
        case "ENEMY_DRAW": {
            if (action.enemyDrawCount === null || action.enemyDrawCount <= 0) return null;
            const suffix = action.enemyDrawCount === 1 ? "carte" : "cartes";
            return `l'adversaire pioche ${action.enemyDrawCount} ${suffix}${formatCardFilterSuffix(action.enemyDrawCardFilter)}`;
        }
        default:
            return (
                formatActionDescription({ ...action, onTargetResult: null }, "")?.replace(
                    /^ : /,
                    "",
                ) ?? null
            );
    }
};

const formatOnTargetResultClause = (onTargetResult: OnTargetResultDefinition): string | null => {
    const followUp = formatFollowUpActionClause(onTargetResult.action);
    if (!followUp) return null;

    if (onTargetResult.when === "KILLED") {
        return `Si la cible est détruite, ${followUp}.`;
    }

    const comparison = onTargetResult.healthComparison;
    if (comparison?.healthComparison === "=" && comparison.health !== null) {
        return `Si la cible survit avec ${comparison.health} PV, ${followUp}.`;
    }

    if (comparison?.healthComparison && comparison.health !== null) {
        const operatorLabel = comparison.healthComparison === "<" ? "moins de" : "plus de";
        return `Si la cible survit avec ${operatorLabel} ${comparison.health} PV, ${followUp}.`;
    }

    return `Si la cible survit, ${followUp}.`;
};

const appendOnTargetResultClause = (description: string, action: CardActionSnapshot): string => {
    if (!action.onTargetResult) return description;

    const clause = formatOnTargetResultClause(action.onTargetResult);
    if (!clause) return description;

    return `${description.replace(/\.$/, "")}. ${clause}`;
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
                    return appendOnTargetResultClause(
                        `${prefix} : Inflige ${damage} dégâts ${withPrepositionA(formatRandomMinionLabel(target.targetTeam, target.maxTargets!))}${formatTargetFilterSuffix(action)}.`,
                        action,
                    );
                }
                if (target.type === "HERO") {
                    return appendOnTargetResultClause(
                        `${prefix} : Inflige ${damage} dégâts ${formatRandomHeroLabel(target.targetTeam, target.maxTargets!)}.`,
                        action,
                    );
                }
                return appendOnTargetResultClause(
                    `${prefix} : Inflige ${damage} dégâts ${withPrepositionA(formatRandomAllLabel(target.targetTeam, target.maxTargets!, target.excludeSelf))}${formatTargetFilterSuffix(action)}.`,
                    action,
                );
            }

            if (action.isTargeted && action.target?.type === "MINION") {
                const teamLabel = formatSingleMinionTeamLabel(action.target.targetTeam);
                const teamPart = teamLabel ? ` ${teamLabel}` : "";
                return appendOnTargetResultClause(
                    `${prefix} : Inflige ${damage} dégâts à un serviteur${teamPart}${formatTargetFilterSuffix(action)}.`,
                    action,
                );
            }

            if (action.isTargeted && action.target?.type === "HERO") {
                return appendOnTargetResultClause(
                    `${prefix} : Inflige ${damage} dégâts au héros ${formatHeroTeamLabel(action.target.targetTeam)}.`,
                    action,
                );
            }

            if (action.isTargeted && action.target?.type === "ALL") {
                return appendOnTargetResultClause(
                    `${prefix} : Inflige ${damage} dégâts ${withPrepositionA(formatSingleCharacterTeamLabel(action.target.targetTeam))}${formatTargetFilterSuffix(action)}.`,
                    action,
                );
            }

            if (action.target?.type === "MINION") {
                return appendOnTargetResultClause(
                    `${prefix} : Inflige ${damage} dégâts ${withPrepositionA(formatMassMinionTeamLabel(action.target.targetTeam, action.target.excludeSelf, action.target.onlySelf))}${formatTargetFilterSuffix(action)}.`,
                    action,
                );
            }

            if (action.target?.type === "ALL") {
                return appendOnTargetResultClause(
                    `${prefix} : Inflige ${damage} dégâts ${withPrepositionA(formatAllTeamLabel(action.target.targetTeam, action.target.excludeSelf, action.target.onlySelf))}${formatTargetFilterSuffix(action)}.`,
                    action,
                );
            }

            if (action.target?.type === "HERO") {
                return appendOnTargetResultClause(
                    `${prefix} : Inflige ${damage} dégâts au héros ${formatHeroTeamLabel(action.target.targetTeam)}.`,
                    action,
                );
            }
            return appendOnTargetResultClause(
                `${prefix} : Inflige ${damage} dégâts au héros adverse.`,
                action,
            );
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
                return `${prefix} : Rend ${action.heal} PV ${withPrepositionA(formatMassMinionTeamLabel(action.target.targetTeam, action.target.excludeSelf, action.target.onlySelf))}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.target?.type === "ALL") {
                return `${prefix} : Rend ${action.heal} PV ${withPrepositionA(formatAllTeamLabel(action.target.targetTeam, action.target.excludeSelf, action.target.onlySelf))}${formatTargetFilterSuffix(action)}.`;
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
                return `${prefix} : Donne ${effectText} ${withPrepositionA(formatMassMinionTeamLabel(action.target.targetTeam, action.target.excludeSelf, action.target.onlySelf))}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.target?.type === "ALL") {
                return `${prefix} : Donne ${effectText} ${withPrepositionA(formatAllTeamLabel(action.target.targetTeam, action.target.excludeSelf, action.target.onlySelf))}${formatTargetFilterSuffix(action)}.`;
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
                return `${prefix} : Réduit au silence ${withPrepositionA(formatMassMinionTeamLabel(action.target.targetTeam, action.target.excludeSelf, action.target.onlySelf))}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.target?.type === "ALL") {
                return `${prefix} : Réduit au silence ${withPrepositionA(formatAllTeamLabel(action.target.targetTeam, action.target.excludeSelf, action.target.onlySelf))}${formatTargetFilterSuffix(action)}.`;
            }

            return `${prefix} : Réduit au silence un serviteur.`;
        }
        case "RECONVERSION": {
            const targetLabel = formatReconvertTargetLabel(action.reconvertParameters);

            if (action.target && hasRandomLimitedTarget(action.target)) {
                const { target } = action;
                if (target.type === "MINION") {
                    return `${prefix} : Reconvertit ${withPrepositionA(formatRandomMinionLabel(target.targetTeam, target.maxTargets!))} en ${targetLabel}${formatTargetFilterSuffix(action)}.`;
                }
                return `${prefix} : Reconvertit ${withPrepositionA(formatRandomAllLabel(target.targetTeam, target.maxTargets!, target.excludeSelf))} en ${targetLabel}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.isTargeted && action.target?.type === "MINION") {
                const teamLabel = formatSingleMinionTeamLabel(action.target.targetTeam);
                const teamPart = teamLabel ? ` ${teamLabel}` : "";
                return `${prefix} : Reconvertit un serviteur${teamPart} en ${targetLabel}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.target?.type === "MINION") {
                return `${prefix} : Reconvertit ${withPrepositionA(formatMassMinionTeamLabel(action.target.targetTeam, action.target.excludeSelf, action.target.onlySelf))} en ${targetLabel}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.target?.type === "ALL") {
                return `${prefix} : Reconvertit ${withPrepositionA(formatAllTeamLabel(action.target.targetTeam, action.target.excludeSelf, action.target.onlySelf))} en ${targetLabel}${formatTargetFilterSuffix(action)}.`;
            }

            return `${prefix} : Reconvertit un serviteur en ${targetLabel}.`;
        }
        default:
            return null;
    }
};
