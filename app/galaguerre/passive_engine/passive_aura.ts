import {
    type AuraAppliedTarget,
    type GamePlayer,
    type MinionCard,
    type MinionState,
    type PassiveBoostSnapshot,
    type SpotOwner,
} from "#api_types/game.types";
import { minionMatchesTarget, shouldExcludeSourceMinion } from "#api_types/target_matching";
import { getMinionPowerEffects } from "#api_types/get_minion_power_effects";
import type Game from "#models/game";
import { findMinionOnPlayerBoard } from "../action_engine/find_minion_on_board.js";
import {
    collectMatchingMinionTargets,
    getTargetBoardEntries,
} from "../action_engine/apply_mass_minion_effects.js";
import { applyBoostToHero } from "../action_engine/apply_boost.js";
import { revertBoostFromHero, revertBoostFromMinion } from "../action_engine/revert_boost.js";
import { resolveHeroTargets } from "../action_engine/resolve_hero_target.js";

const getOpponent = (game: Game, player: GamePlayer): GamePlayer => {
    return player === game.data.playerOne ? game.data.playerTwo : game.data.playerOne;
};

const getSpotOwner = (game: Game, player: GamePlayer): SpotOwner => {
    return player === game.data.playerOne ? "PLAYER" : "OPPONENT";
};

const getPlayerFromSpotOwner = (game: Game, owner: SpotOwner): GamePlayer => {
    return owner === "PLAYER" ? game.data.playerOne : game.data.playerTwo;
};

const collectBoostPassives = (card: MinionCard): PassiveBoostSnapshot[] => {
    return (card.passives ?? [])
        .filter((passive) => passive.type === "BOOST" && passive.passiveBoost !== null)
        .map((passive) => passive.passiveBoost!);
};

const applyAuraBoostToMinion = (minion: MinionState, passiveBoost: PassiveBoostSnapshot): void => {
    const { boost } = passiveBoost;
    if (boost.attack !== null) {
        minion.attack += boost.attack;
    }
    if (boost.health !== null) {
        minion.health += boost.health;
        minion.maxHealth += boost.health;
    }
};

type ScaledBoostAmounts = {
    attack: number;
    health: number;
    spellPower: number;
};

const collectPassiveAuraMinionTargets = (
    game: Game,
    sourceOwner: GamePlayer,
    sourceMinion: MinionState,
    target: PassiveBoostSnapshot["target"],
) => {
    if (!target || target.type !== "MINION") return [];

    const opponent = getOpponent(game, sourceOwner);
    return collectMatchingMinionTargets(sourceOwner, opponent, target, sourceMinion, {
        player: sourceOwner,
        opponent,
        sourceMinion,
    });
};

const countMatchingMinions = (
    game: Game,
    sourceOwner: GamePlayer,
    sourceMinion: MinionState,
    target: PassiveBoostSnapshot["target"],
): number => {
    if (!target) return 0;

    if (target.type === "MINION") {
        return collectPassiveAuraMinionTargets(game, sourceOwner, sourceMinion, target).length;
    }

    const opponent = getOpponent(game, sourceOwner);
    let count = 0;

    for (const { board, isOpponent } of getTargetBoardEntries(target, sourceOwner, opponent)) {
        for (const minion of board) {
            if (shouldExcludeSourceMinion(target, sourceMinion, minion)) continue;
            if (!minionMatchesTarget(minion, target, isOpponent)) continue;
            count++;
        }
    }

    return count;
};

const scaleBoostAmounts = (
    boost: PassiveBoostSnapshot["boost"],
    multiplier: number,
): ScaledBoostAmounts => ({
    attack: (boost.attack ?? 0) * multiplier,
    health: (boost.health ?? 0) * multiplier,
    spellPower: (boost.spellPower ?? 0) * multiplier,
});

const applyScaledBoostAmountsToMinion = (minion: MinionState, scaled: ScaledBoostAmounts): void => {
    if (scaled.attack !== 0) {
        minion.attack += scaled.attack;
    }
    if (scaled.health !== 0) {
        minion.health += scaled.health;
        minion.maxHealth += scaled.health;
    }
};

const revertScaledBoostAmountsFromMinion = (
    minion: MinionState,
    scaled: ScaledBoostAmounts,
): void => {
    if (scaled.attack !== 0) {
        minion.attack -= scaled.attack;
    }
    if (scaled.health !== 0) {
        minion.health -= scaled.health;
        minion.maxHealth -= scaled.health;
    }
};

const revertScaledPassiveBoostFromSource = (sourceMinion: MinionState): void => {
    if (!sourceMinion.auraSelfScaledBoost) return;

    revertScaledBoostAmountsFromMinion(sourceMinion, sourceMinion.auraSelfScaledBoost);
    sourceMinion.auraSelfScaledBoost = null;
};

const applyScaledPassiveBoostToSource = (
    game: Game,
    sourceOwner: GamePlayer,
    sourceMinion: MinionState,
    passiveBoost: PassiveBoostSnapshot,
): void => {
    const { boost, target } = passiveBoost;
    if (!target || target.type !== "MINION") return;

    revertScaledPassiveBoostFromSource(sourceMinion);

    const count = countMatchingMinions(game, sourceOwner, sourceMinion, target);
    if (count === 0) return;

    const scaled = scaleBoostAmounts(boost, count);
    applyScaledBoostAmountsToMinion(sourceMinion, scaled);
    sourceMinion.auraSelfScaledBoost = scaled;
};

export const refreshScaledPassiveAuras = (game: Game): void => {
    for (const owner of [game.data.playerOne, game.data.playerTwo]) {
        for (const sourceMinion of owner.board) {
            if (sourceMinion.originalCard.type !== "MINION" || sourceMinion.isSilenced) {
                continue;
            }

            const sourceCard = sourceMinion.originalCard as MinionCard;
            for (const passiveBoost of collectBoostPassives(sourceCard)) {
                if (passiveBoost.scaleToSource !== true) continue;
                applyScaledPassiveBoostToSource(game, owner, sourceMinion, passiveBoost);
            }
        }
    }
};

export const recalculateMinionKeywords = (game: Game, minion: MinionState): void => {
    if (minion.originalCard.type !== "MINION") return;

    const card = minion.originalCard;
    const initial = minion.initialKeywords ?? {
        hasTaunt: card.minionPowers.hasTaunt,
        hasCharge: card.minionPowers.hasCharge,
        hasRush: card.minionPowers.hasRush,
        hasWindfury: card.minionPowers.hasWindfury,
        isPoisonous: card.minionPowers.isPoisonous,
        hasStealth: card.minionPowers.hasStealth,
        hasDivineShield: card.minionPowers.hasDivineShield,
    };
    const permanent = minion.permanentKeywords ?? {
        hasTaunt: false,
        hasCharge: false,
        hasRush: false,
        hasWindfury: false,
        isPoisonous: false,
    };

    // Silence clears both initial and permanent keywords. Permanent then holds
    // only post-silence grants (e.g. Sprint Review giving Provocation again).
    const keywords = {
        hasTaunt: initial.hasTaunt || permanent.hasTaunt,
        hasCharge: initial.hasCharge || permanent.hasCharge,
        hasRush: initial.hasRush || permanent.hasRush,
        hasWindfury: initial.hasWindfury || permanent.hasWindfury,
        isPoisonous: initial.isPoisonous || permanent.isPoisonous,
        hasStealth: (initial.hasStealth || permanent.hasStealth) && !minion.stealthConsumed,
        hasDivineShield: initial.hasDivineShield || permanent.hasDivineShield,
    };

    const targetBoardOwner = getBoardOwnerForMinion(game, minion);
    if (!targetBoardOwner) return;

    for (const sourceOwner of [game.data.playerOne, game.data.playerTwo]) {
        for (const sourceMinion of sourceOwner.board) {
            if (sourceMinion.originalCard.type !== "MINION" || sourceMinion.isSilenced) {
                continue;
            }

            const sourceCard = sourceMinion.originalCard as MinionCard;
            for (const passiveBoost of collectBoostPassives(sourceCard)) {
                const { boost, target } = passiveBoost;
                if (!boost.minionPowers || !target || target.type !== "MINION") continue;

                const matchingTargets = collectPassiveAuraMinionTargets(
                    game,
                    sourceOwner,
                    sourceMinion,
                    target,
                );
                const isAffected = matchingTargets.some(
                    (entry) => entry.minion.uuid === minion.uuid,
                );
                if (!isAffected) continue;

                if (boost.minionPowers.hasTaunt) keywords.hasTaunt = true;
                if (boost.minionPowers.hasCharge) keywords.hasCharge = true;
                if (boost.minionPowers.hasRush) keywords.hasRush = true;
                if (boost.minionPowers.hasWindfury) keywords.hasWindfury = true;
                if (boost.minionPowers.isPoisonous) keywords.isPoisonous = true;
                if (boost.minionPowers.hasDivineShield) keywords.hasDivineShield = true;
            }
        }
    }

    card.minionPowers.hasTaunt = keywords.hasTaunt;
    card.minionPowers.hasCharge = keywords.hasCharge;
    card.minionPowers.hasRush = keywords.hasRush;
    card.minionPowers.hasWindfury = keywords.hasWindfury;
    card.minionPowers.isPoisonous = keywords.isPoisonous;
    card.minionPowers.hasStealth = keywords.hasStealth && !minion.stealthConsumed;
    card.minionPowers.hasDivineShield = keywords.hasDivineShield && !minion.divineShieldConsumed;

    card.effects = getMinionPowerEffects(card.minionPowers);
};

const getBoardOwnerForMinion = (game: Game, minion: MinionState): GamePlayer | null => {
    for (const boardOwner of [game.data.playerOne, game.data.playerTwo]) {
        if (boardOwner.board.some((entry) => entry.uuid === minion.uuid)) {
            return boardOwner;
        }
    }
    return null;
};

const trackAuraTarget = (
    sourceMinion: MinionState,
    minion: MinionState,
    appliedTarget: Omit<AuraAppliedTarget, "minionUuid">,
): void => {
    sourceMinion.auraAppliedTo ??= [];
    const alreadyTracked = sourceMinion.auraAppliedTo.some(
        (entry) => entry.minionUuid === minion.uuid,
    );
    if (!alreadyTracked) {
        sourceMinion.auraAppliedTo.push({ ...appliedTarget, minionUuid: minion.uuid });
    }
};

const applyPassiveBoostAura = (
    game: Game,
    sourceOwner: GamePlayer,
    sourceMinion: MinionState,
    passiveBoost: PassiveBoostSnapshot,
): void => {
    const { boost, target, scaleToSource } = passiveBoost;
    if (!target) return;

    if (scaleToSource === true) {
        applyScaledPassiveBoostToSource(game, sourceOwner, sourceMinion, passiveBoost);
        return;
    }

    const opponent = getOpponent(game, sourceOwner);

    if (target.type === "ALL") {
        if (boost.spellPower !== null) {
            for (const hero of resolveHeroTargets(target, sourceOwner, opponent)) {
                applyBoostToHero(hero, boost);
            }
            sourceMinion.auraHeroSpellPowerAppliedTo = target.targetTeam;
        }

        for (const { board, isOpponent } of getTargetBoardEntries(target, sourceOwner, opponent)) {
            const boardOwner = isOpponent ? opponent : sourceOwner;

            for (const minion of board) {
                if (shouldExcludeSourceMinion(target, sourceMinion, minion)) continue;
                if (!minionMatchesTarget(minion, target, isOpponent)) continue;

                applyAuraBoostToMinion(minion, passiveBoost);
                recalculateMinionKeywords(game, minion);
                trackAuraTarget(sourceMinion, minion, {
                    owner: getSpotOwner(game, boardOwner),
                });
            }
        }
        return;
    }

    if (target.type === "MINION") {
        for (const { owner, minion } of collectPassiveAuraMinionTargets(
            game,
            sourceOwner,
            sourceMinion,
            target,
        )) {
            applyAuraBoostToMinion(minion, passiveBoost);
            recalculateMinionKeywords(game, minion);
            trackAuraTarget(sourceMinion, minion, {
                owner: getSpotOwner(game, owner),
            });
        }
        return;
    }

    if (
        target.type === "HERO" &&
        (boost.spellPower !== null || boost.extraBattlecryTriggers !== null)
    ) {
        for (const hero of resolveHeroTargets(target, sourceOwner, opponent)) {
            applyBoostToHero(hero, boost);
        }
        sourceMinion.auraHeroSpellPowerAppliedTo = target.targetTeam;
    }
};

export const applyPassiveAurasForSource = (
    game: Game,
    sourceOwner: GamePlayer,
    sourceBoardIndex: number,
): void => {
    const sourceMinion = sourceOwner.board[sourceBoardIndex];
    if (!sourceMinion || sourceMinion.originalCard.type !== "MINION" || sourceMinion.isSilenced) {
        return;
    }

    const card = sourceMinion.originalCard as MinionCard;
    sourceMinion.auraAppliedTo = [];
    sourceMinion.auraHeroSpellPowerAppliedTo = null;

    for (const passiveBoost of collectBoostPassives(card)) {
        applyPassiveBoostAura(game, sourceOwner, sourceMinion, passiveBoost);
    }
};

export const applyExistingAurasToMinion = (
    game: Game,
    targetOwner: GamePlayer,
    targetBoardIndex: number,
): void => {
    const targetMinion = targetOwner.board[targetBoardIndex];
    if (!targetMinion) return;

    for (const sourceOwner of [game.data.playerOne, game.data.playerTwo]) {
        for (const sourceMinion of sourceOwner.board) {
            if (sourceMinion.originalCard.type !== "MINION" || sourceMinion.isSilenced) {
                continue;
            }

            const sourceCard = sourceMinion.originalCard as MinionCard;
            for (const passiveBoost of collectBoostPassives(sourceCard)) {
                const { target } = passiveBoost;
                if (!target || target.type !== "MINION") continue;

                const matchingTargets = collectPassiveAuraMinionTargets(
                    game,
                    sourceOwner,
                    sourceMinion,
                    target,
                );
                const isAffected = matchingTargets.some(
                    (entry) => entry.minion.uuid === targetMinion.uuid,
                );
                if (!isAffected) continue;

                applyAuraBoostToMinion(targetMinion, passiveBoost);
                recalculateMinionKeywords(game, targetMinion);
                trackAuraTarget(sourceMinion, targetMinion, {
                    owner: getSpotOwner(game, targetOwner),
                });
            }
        }
    }
};

export const revertAurasReceivedByMinion = (game: Game, targetMinion: MinionState): void => {
    const targetBoardOwner = getBoardOwnerForMinion(game, targetMinion);
    if (!targetBoardOwner) return;

    for (const sourceOwner of [game.data.playerOne, game.data.playerTwo]) {
        for (const sourceMinion of sourceOwner.board) {
            if (!sourceMinion?.auraAppliedTo) continue;

            const hasTarget = sourceMinion.auraAppliedTo.some(
                (entry) => entry.minionUuid === targetMinion.uuid,
            );
            if (!hasTarget) continue;

            const card = sourceMinion.originalCard as MinionCard;

            for (const passiveBoost of collectBoostPassives(card)) {
                const { boost, target } = passiveBoost;
                if (!target || (target.type !== "MINION" && target.type !== "ALL")) continue;

                revertBoostFromMinion(targetMinion, boost);
            }

            sourceMinion.auraAppliedTo = sourceMinion.auraAppliedTo.filter(
                (entry) => entry.minionUuid !== targetMinion.uuid,
            );
        }
    }
};

export const removeMinionFromAuraTracking = (game: Game, targetMinion: MinionState): void => {
    for (const boardOwner of [game.data.playerOne, game.data.playerTwo]) {
        for (const sourceMinion of boardOwner.board) {
            if (!sourceMinion?.auraAppliedTo) continue;

            sourceMinion.auraAppliedTo = sourceMinion.auraAppliedTo.filter(
                (entry) => entry.minionUuid !== targetMinion.uuid,
            );
        }
    }
};

export const revertPassiveAurasForSource = (
    game: Game,
    sourceOwner: GamePlayer,
    sourceMinion: MinionState,
): void => {
    const card = sourceMinion.originalCard as MinionCard;
    const passiveBoosts = collectBoostPassives(card);

    revertScaledPassiveBoostFromSource(sourceMinion);

    for (const appliedTarget of sourceMinion.auraAppliedTo ?? []) {
        const targetOwner = getPlayerFromSpotOwner(game, appliedTarget.owner);
        const targetMinion = findMinionOnPlayerBoard(targetOwner, appliedTarget.minionUuid);
        if (!targetMinion) continue;

        for (const passiveBoost of passiveBoosts) {
            const { boost, target } = passiveBoost;
            if (!target || (target.type !== "MINION" && target.type !== "ALL")) continue;

            revertBoostFromMinion(targetMinion, boost);
        }
    }

    if (sourceMinion.auraHeroSpellPowerAppliedTo) {
        const opponent = getOpponent(game, sourceOwner);
        for (const passiveBoost of passiveBoosts) {
            const { boost, target } = passiveBoost;
            if (!target || target.type !== "HERO") continue;

            for (const hero of resolveHeroTargets(target, sourceOwner, opponent)) {
                revertBoostFromHero(hero, boost);
            }
        }
    }

    sourceMinion.auraAppliedTo = [];
    sourceMinion.auraHeroSpellPowerAppliedTo = null;
};

export const reapplyAllPassiveAuras = (game: Game): void => {
    const damageByMinionUuid = new Map<string, number>();

    for (const owner of [game.data.playerOne, game.data.playerTwo]) {
        for (const minion of owner.board) {
            damageByMinionUuid.set(minion.uuid, minion.maxHealth - minion.health);
        }
    }

    for (const owner of [game.data.playerOne, game.data.playerTwo]) {
        for (const sourceMinion of [...owner.board]) {
            revertPassiveAurasForSource(game, owner, sourceMinion);
        }
    }

    for (const owner of [game.data.playerOne, game.data.playerTwo]) {
        for (let boardIndex = 0; boardIndex < owner.board.length; boardIndex++) {
            applyPassiveAurasForSource(game, owner, boardIndex);
        }
    }

    refreshScaledPassiveAuras(game);

    for (const owner of [game.data.playerOne, game.data.playerTwo]) {
        for (const minion of owner.board) {
            const damage = damageByMinionUuid.get(minion.uuid);
            if (damage !== undefined && damage > 0) {
                minion.health = Math.max(1, minion.maxHealth - damage);
            }
            recalculateMinionKeywords(game, minion);
        }
    }
};
