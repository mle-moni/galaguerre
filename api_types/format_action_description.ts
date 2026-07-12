import type {
    BoostSnapshot,
    CardActionFieldsSnapshot,
    CardActionSnapshot,
    CardFilterSnapshot,
    CardLabelTag,
    CardTag,
    OnTargetResultDefinition,
    ReconvertParametersSnapshot,
    TargetSnapshot,
} from "./game.types.js";
import { GALADRIM_CARDS } from "#database/seed_data/cards/galadrim_cards";
import { CARD_RARITY_LABELS } from "./card_rarity.types.js";
import { CARD_LABEL_TAG_LABELS, formatTagChip } from "./card.types.js";
import { getDisplayedDamage } from "./get_effective_damage.js";
import { cardFilterLabelTags, cardFilterTags } from "./card_filter_matching.js";
import { hasActionTarget } from "./action_fields_utils.js";
import { hasRandomLimitedTarget } from "./target_matching.js";

const CARD_TYPE_LABELS: Record<CardFilterSnapshot["type"], string> = {
    MINION: "Monstre",
    SPELL: "Sort",
    WEAPON: "Arme",
    ANY: "Carte",
};

const CARD_TYPE_DRAW_LABELS: Record<
    CardFilterSnapshot["type"],
    { singular: string; plural: string; article: string }
> = {
    MINION: { singular: "monstre", plural: "monstres", article: "un" },
    SPELL: { singular: "sort", plural: "sorts", article: "un" },
    WEAPON: { singular: "arme", plural: "armes", article: "une" },
    ANY: { singular: "carte", plural: "cartes", article: "une" },
};

const formatDiscoverCardLabel = (
    filter: CardFilterSnapshot,
): { article: string; label: string } => {
    if (filter.type === "ANY") {
        return { article: "une", label: "carte" };
    }
    return { article: "un", label: CARD_TYPE_LABELS[filter.type].toLowerCase() };
};

const formatTagList = (tags: CardTag[]): string => tags.map(formatTagChip).join(", ");

const formatLabelTagList = (labelTags: CardLabelTag[]): string =>
    labelTags.map((tag) => CARD_LABEL_TAG_LABELS[tag].label).join(", ");

const formatRarityFilterLabel = (rarity: NonNullable<CardFilterSnapshot["rarity"]>): string =>
    CARD_RARITY_LABELS[rarity].toLowerCase();

const formatAttackComparisonLabel = (operator: "<" | ">" | "=", threshold: number): string => {
    if (operator === "<") return `d'attaque ${threshold - 1} ou moins`;
    if (operator === ">") return `d'attaque ${threshold + 1} ou plus`;
    return `d'attaque ${threshold}`;
};

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
        parts.push(formatAttackComparisonLabel(comparison.attackComparison, comparison.attack));
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
    return ` ${parts.join(" ")}`;
};

const BATTLECRY_TRIGGER_COUNT_LABELS: Record<number, string> = {
    2: "1 fois de plus",
    3: "2 fois de plus",
    4: "3 fois de plus",
};

export const formatExtraBattlecryTriggersDescription = (extraTriggers: number): string => {
    const triggerCount = 1 + extraTriggers;
    const countLabel = BATTLECRY_TRIGGER_COUNT_LABELS[triggerCount] ?? `${triggerCount} fois`;
    return `Vos Cris de guerre se déclenchent ${countLabel}.`;
};

export const isExtraBattlecryTriggersOnlyAllyHeroBoost = (
    boost: BoostSnapshot,
    target: TargetSnapshot | null | undefined,
): boolean =>
    boost.extraBattlecryTriggers !== null &&
    boost.attack === null &&
    boost.health === null &&
    boost.spellPower === null &&
    boost.minionPowers === null &&
    target?.type === "HERO" &&
    target.targetTeam === "PLAYER";

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
        if (boost.minionPowers?.hasRush) parts.push("Ruée");
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
    adjacency: TargetSnapshot["adjacency"] = null,
): string => {
    if (onlySelf) return "lui-même";

    if (adjacency === "SOURCE") {
        if (targetTeam === "PLAYER") {
            return excludeSelf ? "vos serviteurs adjacents" : "vos monstres adjacents";
        }
        if (targetTeam === "OPPONENT") {
            return excludeSelf
                ? "les serviteurs adverses adjacents"
                : "les monstres adverses adjacents";
        }
        return excludeSelf ? "les serviteurs adjacents" : "les monstres adjacents";
    }

    if (adjacency === "SELECTED_TARGET") {
        if (targetTeam === "OPPONENT") {
            return "les serviteurs adverses adjacents à la cible";
        }
        if (targetTeam === "PLAYER") {
            return "vos serviteurs adjacents à la cible";
        }
        return "les serviteurs adjacents à la cible";
    }

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

const formatDiscoverExtraFilterSuffix = (filter: CardFilterSnapshot): string => {
    const parts: string[] = [];
    const comparison = filter.comparison;

    if (comparison?.attackComparison && comparison.attack !== null) {
        parts.push(formatAttackComparisonLabel(comparison.attackComparison, comparison.attack));
    }
    if (comparison?.healthComparison && comparison.health !== null) {
        parts.push(`pv ${comparison.healthComparison} ${comparison.health}`);
    }
    if (comparison?.costComparison && comparison.cost !== null) {
        if (comparison.costComparison === "=") {
            const crystalLabel = comparison.cost === 1 ? "cristal" : "cristaux";
            parts.push(`coûtant ${comparison.cost} ${crystalLabel}`);
        } else {
            parts.push(`coût ${comparison.costComparison} ${comparison.cost}`);
        }
    }
    if (cardFilterTags(filter).length > 0) {
        parts.push(formatTagList(cardFilterTags(filter)));
    }
    if (cardFilterLabelTags(filter).length > 0) {
        parts.push(formatLabelTagList(cardFilterLabelTags(filter)));
    }
    if (filter.rarity !== null) {
        parts.push(formatRarityFilterLabel(filter.rarity));
    }

    return parts.length > 0 ? ` ${parts.join(" ")}` : "";
};

const hasCardFilterConstraints = (filter: CardFilterSnapshot | null): boolean => {
    if (!filter) return false;

    return (
        filter.type !== "ANY" ||
        filter.comparison !== null ||
        cardFilterTags(filter).length > 0 ||
        cardFilterLabelTags(filter).length > 0 ||
        filter.rarity !== null
    );
};

const hasDrawFilter = (
    filter: CardFilterSnapshot | null,
    alternatives: CardFilterSnapshot[] | null | undefined,
): boolean => (alternatives ?? []).length > 0 || hasCardFilterConstraints(filter);

const formatCardFilterQualifiers = (filter: CardFilterSnapshot): string => {
    const parts: string[] = [];
    const comparison = filter.comparison;

    if (comparison?.attackComparison && comparison.attack !== null) {
        parts.push(formatAttackComparisonLabel(comparison.attackComparison, comparison.attack));
    }
    if (comparison?.healthComparison && comparison.health !== null) {
        parts.push(`pv ${comparison.healthComparison} ${comparison.health}`);
    }
    if (comparison?.costComparison && comparison.cost !== null) {
        parts.push(`coût ${comparison.costComparison} ${comparison.cost}`);
    }
    if (cardFilterTags(filter).length > 0) {
        parts.push(formatTagList(cardFilterTags(filter)));
    }
    if (cardFilterLabelTags(filter).length > 0) {
        parts.push(formatLabelTagList(cardFilterLabelTags(filter)));
    }
    if (filter.rarity !== null) {
        parts.push(formatRarityFilterLabel(filter.rarity));
    }

    return parts.join(" ");
};

const formatDrawTargetPhrase = (filter: CardFilterSnapshot, drawCount: number): string => {
    const typeInfo = CARD_TYPE_DRAW_LABELS[filter.type];
    const qualifiers = formatCardFilterQualifiers(filter);

    if (drawCount === 1) {
        const base = `${typeInfo.article} ${typeInfo.singular}`;
        return qualifiers.length > 0 ? `${base} ${qualifiers}` : base;
    }

    const base = `${drawCount} ${typeInfo.plural}`;
    return qualifiers.length > 0 ? `${base} ${qualifiers}` : base;
};

const formatDrawDescription = (
    drawCount: number,
    filter: CardFilterSnapshot | null,
    alternatives: CardFilterSnapshot[],
    capitalizeFirst = true,
): string => {
    const verb = capitalizeFirst ? "Pioche" : "pioche";

    if (!hasDrawFilter(filter, alternatives)) {
        const suffix = drawCount === 1 ? "carte" : "cartes";
        return `${verb} ${drawCount} ${suffix}`;
    }

    if (alternatives && alternatives.length > 0) {
        const phrases = alternatives.map((alternative) =>
            formatDrawTargetPhrase(alternative, drawCount),
        );
        return `${verb} ${phrases.join(" OU ")}`;
    }

    if (!filter) {
        const suffix = drawCount === 1 ? "carte" : "cartes";
        return `${verb} ${drawCount} ${suffix}`;
    }

    return `${verb} ${formatDrawTargetPhrase(filter, drawCount)}`;
};

const formatEnemyDrawDescription = (
    enemyDrawCount: number,
    filter: CardFilterSnapshot | null,
    capitalizeFirst = true,
): string => {
    const verb = capitalizeFirst ? "L'adversaire pioche" : "l'adversaire pioche";

    if (!hasCardFilterConstraints(filter)) {
        const suffix = enemyDrawCount === 1 ? "carte" : "cartes";
        return `${verb} ${enemyDrawCount} ${suffix}`;
    }

    return `${verb} ${formatDrawTargetPhrase(filter!, enemyDrawCount)}`;
};

const formatCardFilterSuffix = (filter: CardFilterSnapshot | null): string => {
    if (!filter) return "";

    const parts: string[] = [CARD_TYPE_LABELS[filter.type]];
    const comparison = filter.comparison;

    if (comparison?.attackComparison && comparison.attack !== null) {
        parts.push(formatAttackComparisonLabel(comparison.attackComparison, comparison.attack));
    }
    if (comparison?.healthComparison && comparison.health !== null) {
        parts.push(`pv ${comparison.healthComparison} ${comparison.health}`);
    }
    if (comparison?.costComparison && comparison.cost !== null) {
        parts.push(`coût ${comparison.costComparison} ${comparison.cost}`);
    }
    if (cardFilterTags(filter).length > 0) {
        parts.push(formatTagList(cardFilterTags(filter)));
    }
    if (cardFilterLabelTags(filter).length > 0) {
        parts.push(formatLabelTagList(cardFilterLabelTags(filter)));
    }
    if (filter.rarity !== null) {
        parts.push(formatRarityFilterLabel(filter.rarity));
    }

    return ` ${parts.join(" ")}`;
};

export const formatPlayCardPassiveTriggerLabel = (
    playCardFilter: CardFilterSnapshot | null,
): string => {
    if (!playCardFilter) return "carte jouée";

    const parts: string[] = [CARD_TYPE_LABELS[playCardFilter.type].toLowerCase()];
    if (cardFilterTags(playCardFilter).length > 0) {
        parts.push(formatTagList(cardFilterTags(playCardFilter)));
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
    if (cardFilterTags(summonFilter).length > 0) {
        parts.push(formatTagList(cardFilterTags(summonFilter)));
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
        return `${eventLabel} sur ${formatMassMinionTeamLabel(targetTeam, excludeSelf, onlySelf, triggerTargetFilter.adjacency)}`;
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
            labelTags: [],
            rarity: parameters.rarity,
        });
    }

    if (cardFilterTags(parameters).length > 0) {
        label += ` ${formatTagList(cardFilterTags(parameters))}`;
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

const formatDefeatDescription = (targetTeam: "PLAYER" | "OPPONENT" | "ALL"): string => {
    switch (targetTeam) {
        case "OPPONENT":
            return "Vous gagnez la partie";
        case "ALL":
            return "Les deux joueurs perdent la partie";
        default:
            return "Vous perdez la partie";
    }
};

const formatManaTemporaryChange = (amount: number): string => {
    const crystalLabel = amount === 1 ? "cristal de mana" : "cristaux de mana";
    return `Ce tour-ci, gagnez ${amount} ${crystalLabel}.`;
};

const formatScaledManaTemporaryChange = (amountPer: number): string => {
    const crystalLabel = amountPer === 1 ? "cristal de mana" : "cristaux de mana";
    return `Ce tour-ci, gagnez ${amountPer} ${crystalLabel} pour chaque monstre adverse.`;
};

const formatNextSpellCostReduction = (amount: number): string => {
    const costLabel = amount === 1 ? "(1) cristal" : `(${amount}) cristaux`;
    return `Le prochain sort que vous lancez pendant ce tour coûte ${costLabel} de moins.`;
};

const formatManaActionText = (
    action: Extract<CardActionFieldsSnapshot, { type: "MANA" }>,
): string | null => {
    if (action.subtype !== "TEMPORARY_CHANGE") return null;

    if (action.amountScale) {
        return formatScaledManaTemporaryChange(action.amountScale.amountPer);
    }

    if (action.amount <= 0) return null;
    return formatManaTemporaryChange(action.amount);
};

const formatFollowUpActionClause = (action: CardActionFieldsSnapshot): string | null => {
    switch (action.type) {
        case "DRAW": {
            if (action.drawCount === null || action.drawCount <= 0) return null;
            return formatDrawDescription(
                action.drawCount,
                action.drawCardFilter,
                action.drawCardFilterAlternatives,
                false,
            );
        }
        case "ENEMY_DRAW": {
            if (action.enemyDrawCount === null || action.enemyDrawCount <= 0) return null;
            return formatEnemyDrawDescription(
                action.enemyDrawCount,
                action.enemyDrawCardFilter,
                false,
            );
        }
        case "DISCOVER": {
            if (action.optionCount === null || action.optionCount <= 0) return null;
            const { article, label } = formatDiscoverCardLabel(action.discoverCardFilter);
            return `découvrez ${article} ${label}${formatDiscoverExtraFilterSuffix(action.discoverCardFilter)}`;
        }
        case "MANA": {
            const text = formatManaActionText(action);
            if (!text) return null;
            return text.replace(/\.$/, "").toLowerCase();
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

const formatFrenchList = (items: string[]): string => {
    if (items.length === 0) return "";
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} et ${items[1]}`;
    return `${items.slice(0, -1).join(", ")} et ${items[items.length - 1]}`;
};

type HandCardAction = Extract<CardActionSnapshot, { type: "HAND_CARD" }>;
type DiscoverAction = Extract<CardActionSnapshot, { type: "DISCOVER" }>;

const isSameHandCardGroup = (left: HandCardAction, right: HandCardAction): boolean =>
    left.handTargetTeam === right.handTargetTeam && left.copyCount === right.copyCount;

const isSameDiscoverGroup = (left: DiscoverAction, right: DiscoverAction): boolean =>
    left.optionCount === right.optionCount &&
    JSON.stringify(left.discoverCardFilter) === JSON.stringify(right.discoverCardFilter);

const formatMergedHandCardAddDescription = (actions: HandCardAction[], prefix: string): string => {
    const copies = actions.map((action) =>
        formatDeckCardAddCopies(action.copyCount, formatDeckCardName(action.cardId)),
    );

    return `${prefix} : Ajoute ${formatFrenchList(copies)} ${formatHandCardAddLocation(actions[0].handTargetTeam)}.`;
};

const formatMergedDiscoverDescription = (actions: DiscoverAction[], prefix: string): string => {
    const { article, label } = formatDiscoverCardLabel(actions[0].discoverCardFilter);
    const filterSuffix = formatDiscoverExtraFilterSuffix(actions[0].discoverCardFilter);
    const firstClause = `Découvrez ${article} ${label}${filterSuffix}`;
    const additionalClauses = actions
        .slice(1)
        .map(() => `Puis, découvrez un autre ${label}${filterSuffix}`);

    return `${prefix} : ${[firstClause, ...additionalClauses].join(". ")}.`;
};

type ActionDescriptionGroup =
    | { type: "hand_card"; actions: HandCardAction[] }
    | { type: "discover"; actions: DiscoverAction[] }
    | { type: "single"; action: CardActionSnapshot };

const groupActionDescriptions = (actions: CardActionSnapshot[]): ActionDescriptionGroup[] => {
    const groups: ActionDescriptionGroup[] = [];

    for (const action of actions) {
        if (action.type === "HAND_CARD") {
            const last = groups.at(-1);
            if (last?.type === "hand_card" && isSameHandCardGroup(last.actions[0], action)) {
                last.actions.push(action);
                continue;
            }

            groups.push({ type: "hand_card", actions: [action] });
            continue;
        }

        if (action.type === "DISCOVER") {
            const last = groups.at(-1);
            if (last?.type === "discover" && isSameDiscoverGroup(last.actions[0], action)) {
                last.actions.push(action);
                continue;
            }

            groups.push({ type: "discover", actions: [action] });
            continue;
        }

        groups.push({ type: "single", action });
    }

    return groups;
};

export const formatGroupedActionDescriptions = (
    actions: CardActionSnapshot[],
    prefix: string,
    spellPower?: number,
): string[] => {
    return groupActionDescriptions(actions)
        .map((group) => {
            if (group.type === "hand_card") {
                if (group.actions.length === 1) {
                    return formatActionDescription(group.actions[0], prefix, spellPower);
                }

                return formatMergedHandCardAddDescription(group.actions, prefix);
            }

            if (group.type === "discover") {
                if (group.actions.length === 1) {
                    return formatActionDescription(group.actions[0], prefix, spellPower);
                }

                return formatMergedDiscoverDescription(group.actions, prefix);
            }

            return formatActionDescription(group.action, prefix, spellPower);
        })
        .filter((description): description is string => description !== null);
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
                    `${prefix} : Inflige ${damage} dégâts ${withPrepositionA(formatMassMinionTeamLabel(action.target.targetTeam, action.target.excludeSelf, action.target.onlySelf, action.target.adjacency))}${formatTargetFilterSuffix(action)}.`,
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
                return `${prefix} : Rend ${action.heal} PV ${withPrepositionA(formatMassMinionTeamLabel(action.target.targetTeam, action.target.excludeSelf, action.target.onlySelf, action.target.adjacency))}${formatTargetFilterSuffix(action)}.`;
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
            return `${prefix} : ${formatDrawDescription(action.drawCount, action.drawCardFilter, action.drawCardFilterAlternatives)}.`;
        }
        case "ENEMY_DRAW": {
            if (action.enemyDrawCount === null || action.enemyDrawCount <= 0) return null;
            return `${prefix} : ${formatEnemyDrawDescription(action.enemyDrawCount, action.enemyDrawCardFilter)}.`;
        }
        case "DISCOVER": {
            if (action.optionCount === null || action.optionCount <= 0) return null;
            const { article, label } = formatDiscoverCardLabel(action.discoverCardFilter);
            return `${prefix} : Découvrez ${article} ${label}${formatDiscoverExtraFilterSuffix(action.discoverCardFilter)}.`;
        }
        case "BOOST": {
            if (!action.boost) return null;

            if (isExtraBattlecryTriggersOnlyAllyHeroBoost(action.boost, action.target)) {
                return `${prefix} : ${formatExtraBattlecryTriggersDescription(action.boost.extraBattlecryTriggers!)}`;
            }

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
                return `${prefix} : Donne ${effectText} ${withPrepositionA(formatMassMinionTeamLabel(action.target.targetTeam, action.target.excludeSelf, action.target.onlySelf, action.target.adjacency))}${formatTargetFilterSuffix(action)}.`;
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
                    return `${prefix} : Réduit au silence ${formatRandomMinionLabel(target.targetTeam, target.maxTargets!)}${formatTargetFilterSuffix(action)}.`;
                }
                return `${prefix} : Réduit au silence ${formatRandomAllLabel(target.targetTeam, target.maxTargets!, target.excludeSelf)}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.isTargeted && action.target?.type === "MINION") {
                const teamLabel = formatSingleMinionTeamLabel(action.target.targetTeam);
                const teamPart = teamLabel ? ` ${teamLabel}` : "";
                return `${prefix} : Réduit au silence un monstre${teamPart}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.target?.type === "MINION") {
                return `${prefix} : Réduit au silence ${formatMassMinionTeamLabel(action.target.targetTeam, action.target.excludeSelf, action.target.onlySelf, action.target.adjacency)}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.target?.type === "ALL") {
                return `${prefix} : Réduit au silence ${formatAllTeamLabel(action.target.targetTeam, action.target.excludeSelf, action.target.onlySelf)}${formatTargetFilterSuffix(action)}.`;
            }

            return `${prefix} : Réduit au silence un monstre.`;
        }
        case "DESTROY": {
            if (action.target && hasRandomLimitedTarget(action.target)) {
                const { target } = action;
                if (target.type === "MINION") {
                    return `${prefix} : Détruit ${formatRandomMinionLabel(target.targetTeam, target.maxTargets!)}${formatTargetFilterSuffix(action)}.`;
                }
                return `${prefix} : Détruit ${formatRandomAllLabel(target.targetTeam, target.maxTargets!, target.excludeSelf)}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.isTargeted && action.target?.type === "MINION") {
                const teamLabel = formatSingleMinionTeamLabel(action.target.targetTeam);
                const teamPart = teamLabel ? ` ${teamLabel}` : "";
                return `${prefix} : Détruit un monstre${teamPart}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.target?.type === "MINION") {
                return `${prefix} : Détruit ${formatMassMinionTeamLabel(action.target.targetTeam, action.target.excludeSelf, action.target.onlySelf, action.target.adjacency)}${formatTargetFilterSuffix(action)}.`;
            }

            if (action.target?.type === "ALL") {
                return `${prefix} : Détruit ${formatAllTeamLabel(action.target.targetTeam, action.target.excludeSelf, action.target.onlySelf)}${formatTargetFilterSuffix(action)}.`;
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
                return `${prefix} : Reconvertit ${formatMassMinionTeamLabel(action.target.targetTeam, action.target.excludeSelf, action.target.onlySelf, action.target.adjacency)} en ${targetLabel}${formatTargetFilterSuffix(action)}.`;
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
                return `${prefix} : ${conditionPrefix}prend le contrôle ${withPrepositionA(formatMassMinionTeamLabel(action.target.targetTeam, action.target.excludeSelf, action.target.onlySelf, action.target.adjacency))}${formatTargetFilterSuffix(action)}.`;
            }

            return `${prefix} : ${conditionPrefix}prend le contrôle d'un monstre adverse.`;
        }
        case "RETURN_TO_HAND": {
            const costReductionSuffix =
                action.costReduction > 0
                    ? ` Son coût est réduit de ${
                          action.costReduction === 1
                              ? "(1) cristal"
                              : `(${action.costReduction}) cristaux`
                      }.`
                    : "";

            if (action.isTargeted && action.target?.type === "MINION") {
                const teamLabel = formatSingleMinionTeamLabel(action.target.targetTeam);
                const teamPart = teamLabel ? ` ${teamLabel}` : "";
                const handLocation =
                    action.target.targetTeam === "OPPONENT"
                        ? "à la main adverse"
                        : "dans votre main";
                return `${prefix} : Renvoie un monstre${teamPart} ${handLocation}.${costReductionSuffix}`;
            }

            return `${prefix} : Renvoie un monstre allié dans votre main.${costReductionSuffix}`;
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
            if (action.isTargeted && action.deckCardOperation === "ADD") {
                const copies = action.copyCount === 1 ? "1 copie" : `${action.copyCount} copies`;
                const targetLabel =
                    action.target?.targetTeam === "ALL"
                        ? "un monstre sur le plateau"
                        : `un monstre ${formatSingleMinionTeamLabel(action.target!.targetTeam)}`;

                switch (action.deckPlacement) {
                    case "TOP":
                        return `${prefix} : Choisissez ${targetLabel}. Placez ${copies} de celui-ci en haut ${formatDeckCardAddLocationOn(action.deckTargetTeam)}.`;
                    case "BOTTOM":
                        return `${prefix} : Choisissez ${targetLabel}. Placez ${copies} de celui-ci en bas ${formatDeckCardAddLocationOn(action.deckTargetTeam)}.`;
                    default:
                        return `${prefix} : Choisissez ${targetLabel}. Placez ${copies} de celui-ci ${formatDeckCardAddLocationIn(action.deckTargetTeam)}.`;
                }
            }

            const cardName = formatDeckCardName(action.cardId!);
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
            const text = formatManaActionText(action);
            if (!text) return null;
            return prefix ? `${prefix} : ${text}` : text;
        }
        case "NEXT_SPELL_COST_REDUCTION":
            return prefix
                ? `${prefix} : ${formatNextSpellCostReduction(action.amount)}`
                : formatNextSpellCostReduction(action.amount);
        case "DEFEAT":
            return `${prefix} : ${formatDefeatDescription(action.targetTeam)}.`;
        default:
            return null;
    }
};
