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
import { hasActionTarget } from "./action_fields_utils.js";
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
    if (!hasActionTarget(action) || !action.target) return "";

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
        return excludeSelf ? "tous les autres monstres" : "tous les monstres";
    }
    if (targetTeam === "PLAYER") {
        return excludeSelf ? "vos autres monstres" : "vos monstres";
    }
    return excludeSelf ? "les autres monstres adverses" : "les monstres adverses";
};

const formatRandomMinionLabel = (
    targetTeam: TargetSnapshot["targetTeam"],
    maxTargets: number,
): string => {
    if (maxTargets === 1) {
        const teamLabel = formatSingleMinionTeamLabel(targetTeam);
        return teamLabel ? `un monstre ${teamLabel} aléatoire` : "un monstre aléatoire";
    }
    if (targetTeam === "ALL") {
        return `${maxTargets} monstres aléatoires différents`;
    }
    if (targetTeam === "PLAYER") {
        return `${maxTargets} de vos monstres aléatoires différents`;
    }
    return `${maxTargets} monstres adverses aléatoires différents`;
};

const formatRandomHeroLabel = (
    targetTeam: TargetSnapshot["targetTeam"],
    maxTargets: number,
): string => {
    if (maxTargets === 1) {
        return `au héros ${formatHeroTeamLabel(targetTeam)} aléatoire`;
    }
    if (targetTeam === "ALL") {
        return `à ${maxTargets} héros aléatoires différents`;
    }
    if (targetTeam === "PLAYER") {
        return `à ${maxTargets} de vos héros aléatoires différents`;
    }
    return `à ${maxTargets} héros adverses aléatoires différents`;
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
            ? `${maxTargets} autres personnages aléatoires différents`
            : `${maxTargets} personnages aléatoires différents`;
    }
    if (targetTeam === "PLAYER") {
        return excludeSelf
            ? `${maxTargets} de vos autres personnages aléatoires différents`
            : `${maxTargets} de vos personnages aléatoires différents`;
    }
    return excludeSelf
        ? `${maxTargets} autres personnages adverses aléatoires différents`
        : `${maxTargets} personnages adverses aléatoires différents`;
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

export const formatPlayCardPassiveTriggerLabel = (
    playCardFilter: CardFilterSnapshot | null,
): string => {
    if (!playCardFilter) return "carte jouée";

    const parts: string[] = [CARD_TYPE_LABELS[playCardFilter.type].toLowerCase()];
    if (playCardFilter.tags.length > 0) {
        parts.push(formatTagList(playCardFilter.tags));
    }

    const noun = parts.join(" ");
    if (playCardFilter.type === "WEAPON") return `${noun} jouée`;
    return `${noun} joué`;
};

export const formatSummonPassiveTriggerLabel = (
    summonFilter: CardFilterSnapshot | null,
): string => {
    if (!summonFilter) return "monstre invoqué";

    const parts: string[] = [CARD_TYPE_LABELS[summonFilter.type].toLowerCase()];
    if (summonFilter.tags.length > 0) {
        parts.push(formatTagList(summonFilter.tags));
    }

    return `${parts.join(" ")} invoqué`;
};

export const formatHealDamagePassiveTriggerLabel = (
    triggersOn: "HEAL" | "DAMAGE",
    triggerTargetFilter: TargetSnapshot | null,
): string => {
    const eventLabel = triggersOn === "HEAL" ? "soin" : "dégâts";

    if (!triggerTargetFilter) return eventLabel;

    const { type, targetTeam, excludeSelf, onlySelf } = triggerTargetFilter;

    if (type === "HERO") {
        return `${eventLabel} sur héros ${formatHeroTeamLabel(targetTeam)}`;
    }

    if (type === "MINION") {
        return `${eventLabel} sur ${formatMassMinionTeamLabel(targetTeam, excludeSelf, onlySelf)}`;
    }

    return `${eventLabel} sur ${formatAllTeamLabel(targetTeam, excludeSelf, onlySelf)}`;
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

    let label = "un monstre aléatoire";

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

const formatDeckCardName = (cardId: number): string =>
    GALADRIM_CARDS.find((entry) => entry.id === cardId)?.data.name ?? "une carte";

const formatDeckCardAddCopies = (copyCount: number, cardName: string): string =>
    copyCount === 1 ? `1 copie de ${cardName}` : `${copyCount} copies de ${cardName}`;

const formatDeckCardDeleteCopies = (copyCount: number, cardName: string): string =>
    copyCount === 1
        ? `1 copie de la carte ${cardName}`
        : `${copyCount} copies de la carte ${cardName}`;

const formatDeckCardDeleteLocation = (targetTeam: "PLAYER" | "OPPONENT" | "ALL"): string => {
    switch (targetTeam) {
        case "OPPONENT":
            return "du deck adverse";
        case "ALL":
            return "de chaque deck";
        default:
            return "de votre deck";
    }
};

const formatDeckCardAddLocationIn = (targetTeam: "PLAYER" | "OPPONENT" | "ALL"): string => {
    switch (targetTeam) {
        case "OPPONENT":
            return "dans le deck adverse";
        case "ALL":
            return "dans chaque deck";
        default:
            return "dans votre deck";
    }
};

const formatDeckCardAddLocationOn = (targetTeam: "PLAYER" | "OPPONENT" | "ALL"): string => {
    switch (targetTeam) {
        case "OPPONENT":
            return "du deck adverse";
        case "ALL":
            return "de chaque deck";
        default:
            return "de votre deck";
    }
};

const formatHandCardAddLocation = (targetTeam: "PLAYER" | "OPPONENT" | "ALL"): string => {
    switch (targetTeam) {
        case "OPPONENT":
            return "à la main adverse";
        case "ALL":
            return "à chaque main";
        default:
            return "à votre main";
    }
};

const formatManaTemporaryChange = (amount: number): string => {
    const crystalLabel = amount === 1 ? "cristal de mana" : "cristaux de mana";
    return `Ce tour-ci, gagnez ${amount} ${crystalLabel}.`;
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
        case "MANA": {
            if (action.subtype !== "TEMPORARY_CHANGE" || action.amount <= 0) return null;
            return formatManaTemporaryChange(action.amount).replace(/\.$/, "").toLowerCase();
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

const formatActionConditionPrefix = (action: CardActionSnapshot): string => {
    if (!action.actionCondition?.opponentMinionCountMin) return "";

    const count = action.actionCondition.opponentMinionCountMin;
    return `Si votre adversaire a ${count} monstres ou plus, `;
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
                    `${prefix} : Inflige ${damage} dégâts à un monstre${teamPart}${formatTargetFilterSuffix(action)}.`,
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
                return `${prefix} : Rend ${action.heal} PV à un monstre${teamPart}${formatTargetFilterSuffix(action)}.`;
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
                return `${prefix} : Donne ${effectText} à un monstre${teamPart}${formatTargetFilterSuffix(action)}.`;
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
                return `${prefix} : Réduit au silence un monstre${teamPart}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.target?.type === "MINION") {
                return `${prefix} : Réduit au silence ${withPrepositionA(formatMassMinionTeamLabel(action.target.targetTeam, action.target.excludeSelf, action.target.onlySelf))}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.target?.type === "ALL") {
                return `${prefix} : Réduit au silence ${withPrepositionA(formatAllTeamLabel(action.target.targetTeam, action.target.excludeSelf, action.target.onlySelf))}${formatTargetFilterSuffix(action)}.`;
            }

            return `${prefix} : Réduit au silence un monstre.`;
        }
        case "DESTROY": {
            if (action.target && hasRandomLimitedTarget(action.target)) {
                const { target } = action;
                if (target.type === "MINION") {
                    return `${prefix} : Détruit ${withPrepositionA(formatRandomMinionLabel(target.targetTeam, target.maxTargets!))}${formatTargetFilterSuffix(action)}.`;
                }
                return `${prefix} : Détruit ${withPrepositionA(formatRandomAllLabel(target.targetTeam, target.maxTargets!, target.excludeSelf))}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.isTargeted && action.target?.type === "MINION") {
                const teamLabel = formatSingleMinionTeamLabel(action.target.targetTeam);
                const teamPart = teamLabel ? ` ${teamLabel}` : "";
                return `${prefix} : Détruit un monstre${teamPart}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.target?.type === "MINION") {
                return `${prefix} : Détruit ${withPrepositionA(formatMassMinionTeamLabel(action.target.targetTeam, action.target.excludeSelf, action.target.onlySelf))}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.target?.type === "ALL") {
                return `${prefix} : Détruit ${withPrepositionA(formatAllTeamLabel(action.target.targetTeam, action.target.excludeSelf, action.target.onlySelf))}${formatTargetFilterSuffix(action)}.`;
            }

            return `${prefix} : Détruit un monstre.`;
        }
        case "BREAK_WEAPON": {
            if (action.isTargeted && action.target?.type === "HERO") {
                return `${prefix} : Détruit l'arme du héros ${formatHeroTeamLabel(action.target.targetTeam)}.`;
            }

            if (action.target?.type === "HERO") {
                return `${prefix} : Détruit l'arme du héros ${formatHeroTeamLabel(action.target.targetTeam)}.`;
            }

            return `${prefix} : Détruit l'arme du héros adverse.`;
        }
        case "RECONVERSION": {
            const targetLabel = formatReconvertTargetLabel(action.reconvertParameters);

            if (action.target && hasRandomLimitedTarget(action.target)) {
                const { target } = action;
                if (target.type === "MINION") {
                    return `${prefix} : Reconvertit ${formatRandomMinionLabel(target.targetTeam, target.maxTargets!)} en ${targetLabel}${formatTargetFilterSuffix(action)}.`;
                }
                return `${prefix} : Reconvertit ${formatRandomAllLabel(target.targetTeam, target.maxTargets!, target.excludeSelf)} en ${targetLabel}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.isTargeted && action.target?.type === "MINION") {
                const teamLabel = formatSingleMinionTeamLabel(action.target.targetTeam);
                const teamPart = teamLabel ? ` ${teamLabel}` : "";
                return `${prefix} : Reconvertit un monstre${teamPart} en ${targetLabel}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.target?.type === "MINION") {
                return `${prefix} : Reconvertit ${formatMassMinionTeamLabel(action.target.targetTeam, action.target.excludeSelf, action.target.onlySelf)} en ${targetLabel}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.target?.type === "ALL") {
                return `${prefix} : Reconvertit ${formatAllTeamLabel(action.target.targetTeam, action.target.excludeSelf, action.target.onlySelf)} en ${targetLabel}${formatTargetFilterSuffix(action)}.`;
            }

            return `${prefix} : Reconvertit un monstre en ${targetLabel}.`;
        }
        case "MIND_CONTROL": {
            const conditionPrefix = formatActionConditionPrefix(action);

            if (action.target && hasRandomLimitedTarget(action.target)) {
                const { target } = action;
                if (target.type === "MINION") {
                    return `${prefix} : ${conditionPrefix}prend le contrôle ${withPrepositionA(formatRandomMinionLabel(target.targetTeam, target.maxTargets!))}${formatTargetFilterSuffix(action)}.`;
                }
                return `${prefix} : ${conditionPrefix}prend le contrôle ${withPrepositionA(formatRandomAllLabel(target.targetTeam, target.maxTargets!, target.excludeSelf))}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.isTargeted && action.target?.type === "MINION") {
                const teamLabel = formatSingleMinionTeamLabel(action.target.targetTeam);
                const teamPart = teamLabel ? ` ${teamLabel}` : "";
                return `${prefix} : ${conditionPrefix}prend le contrôle d'un monstre${teamPart}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.target?.type === "MINION") {
                return `${prefix} : ${conditionPrefix}prend le contrôle ${withPrepositionA(formatMassMinionTeamLabel(action.target.targetTeam, action.target.excludeSelf, action.target.onlySelf))}${formatTargetFilterSuffix(action)}.`;
            }

            return `${prefix} : ${conditionPrefix}prend le contrôle d'un monstre adverse.`;
        }
        case "SUMMON": {
            const count = action.summonCount ?? 1;
            const targetLabel = formatReconvertTargetLabel(action.summonParameters);
            const boardLabel =
                action.summonTargetTeam === "OPPONENT"
                    ? "sur le plateau adverse"
                    : "sur votre plateau";
            const countLabel = count > 1 ? `${count} monstres` : "un monstre";

            return `${prefix} : Invoque ${countLabel} (${targetLabel}) ${boardLabel}.`;
        }
        case "DECK_CARD": {
            const cardName = formatDeckCardName(action.cardId);
            const deleteLocation = formatDeckCardDeleteLocation(action.deckTargetTeam);

            if (action.deckCardOperation === "DELETE") {
                if (action.copyCount === null) {
                    return `${prefix} : Supprime toutes les copies de la carte ${cardName} ${deleteLocation}.`;
                }

                return `${prefix} : Retire ${formatDeckCardDeleteCopies(action.copyCount, cardName)} ${deleteLocation}.`;
            }

            const copies = formatDeckCardAddCopies(action.copyCount!, cardName);

            switch (action.deckPlacement) {
                case "TOP":
                    return `${prefix} : Place ${copies} en haut ${formatDeckCardAddLocationOn(action.deckTargetTeam)}.`;
                case "BOTTOM":
                    return `${prefix} : Place ${copies} en bas ${formatDeckCardAddLocationOn(action.deckTargetTeam)}.`;
                default:
                    return `${prefix} : Mélange ${copies} ${formatDeckCardAddLocationIn(action.deckTargetTeam)}.`;
            }
        }
        case "HAND_CARD": {
            const cardName = formatDeckCardName(action.cardId);
            const copies = formatDeckCardAddCopies(action.copyCount, cardName);

            return `${prefix} : Ajoute ${copies} ${formatHandCardAddLocation(action.handTargetTeam)}.`;
        }
        case "MANA": {
            if (action.subtype !== "TEMPORARY_CHANGE" || action.amount <= 0) return null;
            return prefix
                ? `${prefix} : ${formatManaTemporaryChange(action.amount)}`
                : formatManaTemporaryChange(action.amount);
        }
        default:
            return null;
    }
};
