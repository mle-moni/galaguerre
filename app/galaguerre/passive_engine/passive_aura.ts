import {
    MINION_SPOT_IDS,
    type AuraAppliedTarget,
    type GamePlayer,
    type MinionCard,
    type MinionSpotId,
    type MinionState,
    type PassiveBoostSnapshot,
    type SpotOwner,
} from "#api_types/game.types";
import { minionMatchesTarget, shouldExcludeSourceMinion } from "#api_types/target_matching";
import { getMinionPowerEffects } from "#api_types/get_minion_power_effects";
import type Game from "#models/game";
import { getTargetBoardEntries } from "../action_engine/apply_mass_minion_effects.js";
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

export const recalculateMinionKeywords = (game: Game, minion: MinionState): void => {
    if (minion.originalCard.type !== "MINION") return;

    const card = minion.originalCard;
    const initial = minion.initialKeywords ?? {
        hasTaunt: card.minionPowers.hasTaunt,
        hasCharge: card.minionPowers.hasCharge,
        hasWindfury: card.minionPowers.hasWindfury,
        isPoisonous: card.minionPowers.isPoisonous,
        hasStealth: card.minionPowers.hasStealth,
        hasDivineShield: card.minionPowers.hasDivineShield,
    };
    const permanent = minion.permanentKeywords ?? {
        hasTaunt: false,
        hasCharge: false,
        hasWindfury: false,
        isPoisonous: false,
    };

    const keywords = minion.isSilenced
        ? {
              hasTaunt: false,
              hasCharge: false,
              hasWindfury: false,
              isPoisonous: false,
              hasStealth: false,
              hasDivineShield: false,
          }
        : {
              hasTaunt: initial.hasTaunt || permanent.hasTaunt,
              hasCharge: initial.hasCharge || permanent.hasCharge,
              hasWindfury: initial.hasWindfury || permanent.hasWindfury,
              isPoisonous: initial.isPoisonous || permanent.isPoisonous,
              hasStealth: initial.hasStealth || permanent.hasStealth,
              hasDivineShield: initial.hasDivineShield || permanent.hasDivineShield,
          };

    const targetBoardOwner = getBoardOwnerForMinion(game, minion);
    if (!targetBoardOwner) return;

    const targetSpotOwner = getSpotOwner(game, targetBoardOwner);

    for (const sourceOwner of [game.data.playerOne, game.data.playerTwo]) {
        const sourceOpponent = getOpponent(game, sourceOwner);

        for (const sourceSpotId of MINION_SPOT_IDS) {
            const sourceMinion = sourceOwner.board[sourceSpotId];
            if (
                !sourceMinion ||
                sourceMinion.originalCard.type !== "MINION" ||
                sourceMinion.isSilenced
            ) {
                continue;
            }

            const sourceCard = sourceMinion.originalCard as MinionCard;
            for (const passiveBoost of collectBoostPassives(sourceCard)) {
                const { boost, target } = passiveBoost;
                if (!boost.minionPowers || !target || target.type !== "MINION") continue;

                for (const { board, isOpponent } of getTargetBoardEntries(
                    target,
                    sourceOwner,
                    sourceOpponent,
                )) {
                    const boardSpotOwner = isOpponent
                        ? getSpotOwner(game, sourceOpponent)
                        : getSpotOwner(game, sourceOwner);

                    if (boardSpotOwner !== targetSpotOwner) continue;

                    const spotId = MINION_SPOT_IDS.find((id) => board[id]?.uuid === minion.uuid);
                    if (!spotId) continue;

                    const boardMinion = board[spotId];
                    if (!boardMinion) continue;
                    if (shouldExcludeSourceMinion(target, sourceMinion, boardMinion)) continue;
                    if (!minionMatchesTarget(boardMinion, target, isOpponent)) continue;

                    if (boost.minionPowers.hasTaunt) keywords.hasTaunt = true;
                    if (boost.minionPowers.hasCharge) keywords.hasCharge = true;
                    if (boost.minionPowers.hasWindfury) keywords.hasWindfury = true;
                    if (boost.minionPowers.isPoisonous) keywords.isPoisonous = true;
                    if (boost.minionPowers.hasStealth) keywords.hasStealth = true;
                    if (boost.minionPowers.hasDivineShield) keywords.hasDivineShield = true;
                }
            }
        }
    }

    card.minionPowers.hasTaunt = keywords.hasTaunt;
    card.minionPowers.hasCharge = keywords.hasCharge;
    card.minionPowers.hasWindfury = keywords.hasWindfury;
    card.minionPowers.isPoisonous = keywords.isPoisonous;
    card.minionPowers.hasStealth = keywords.hasStealth;
    card.minionPowers.hasDivineShield = keywords.hasDivineShield && !minion.divineShieldConsumed;

    card.effects = getMinionPowerEffects(card.minionPowers);
};

const getBoardOwnerForMinion = (game: Game, minion: MinionState): GamePlayer | null => {
    for (const boardOwner of [game.data.playerOne, game.data.playerTwo]) {
        for (const spotId of MINION_SPOT_IDS) {
            if (boardOwner.board[spotId]?.uuid === minion.uuid) {
                return boardOwner;
            }
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
    const { boost, target } = passiveBoost;
    if (!target) return;

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

            for (const spotId of MINION_SPOT_IDS) {
                const minion = board[spotId];
                if (!minion) continue;
                if (shouldExcludeSourceMinion(target, sourceMinion, minion)) continue;
                if (!minionMatchesTarget(minion, target, isOpponent)) continue;

                applyAuraBoostToMinion(minion, passiveBoost);
                recalculateMinionKeywords(game, minion);
                trackAuraTarget(sourceMinion, minion, {
                    owner: getSpotOwner(game, boardOwner),
                    spotId,
                });
            }
        }
        return;
    }

    if (target.type === "MINION") {
        for (const { board, isOpponent } of getTargetBoardEntries(target, sourceOwner, opponent)) {
            const boardOwner = isOpponent ? opponent : sourceOwner;

            for (const spotId of MINION_SPOT_IDS) {
                const minion = board[spotId];
                if (!minion) continue;
                if (shouldExcludeSourceMinion(target, sourceMinion, minion)) continue;
                if (!minionMatchesTarget(minion, target, isOpponent)) continue;

                applyAuraBoostToMinion(minion, passiveBoost);
                recalculateMinionKeywords(game, minion);
                trackAuraTarget(sourceMinion, minion, {
                    owner: getSpotOwner(game, boardOwner),
                    spotId,
                });
            }
        }
        return;
    }

    if (target.type === "HERO" && boost.spellPower !== null) {
        for (const hero of resolveHeroTargets(target, sourceOwner, opponent)) {
            applyBoostToHero(hero, boost);
        }
        sourceMinion.auraHeroSpellPowerAppliedTo = target.targetTeam;
    }
};

export const applyPassiveAurasForSource = (
    game: Game,
    sourceOwner: GamePlayer,
    sourceSpotId: MinionSpotId,
): void => {
    const sourceMinion = sourceOwner.board[sourceSpotId];
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
    targetSpotId: MinionSpotId,
): void => {
    const targetMinion = targetOwner.board[targetSpotId];
    if (!targetMinion) return;

    for (const sourceOwner of [game.data.playerOne, game.data.playerTwo]) {
        const sourceOpponent = getOpponent(game, sourceOwner);

        for (const sourceSpotId of MINION_SPOT_IDS) {
            const sourceMinion = sourceOwner.board[sourceSpotId];
            if (
                !sourceMinion ||
                sourceMinion.originalCard.type !== "MINION" ||
                sourceMinion.isSilenced
            ) {
                continue;
            }
            if (sourceMinion.uuid === targetMinion.uuid) continue;

            const sourceCard = sourceMinion.originalCard as MinionCard;
            for (const passiveBoost of collectBoostPassives(sourceCard)) {
                const { target } = passiveBoost;
                if (!target || target.type !== "MINION") continue;

                for (const { board, isOpponent } of getTargetBoardEntries(
                    target,
                    sourceOwner,
                    sourceOpponent,
                )) {
                    const boardOwner = isOpponent ? sourceOpponent : sourceOwner;
                    if (boardOwner !== targetOwner) continue;

                    const minion = board[targetSpotId];
                    if (!minion) continue;
                    if (shouldExcludeSourceMinion(target, sourceMinion, minion)) continue;
                    if (!minionMatchesTarget(minion, target, isOpponent)) continue;

                    applyAuraBoostToMinion(minion, passiveBoost);
                    recalculateMinionKeywords(game, minion);
                    trackAuraTarget(sourceMinion, minion, {
                        owner: getSpotOwner(game, targetOwner),
                        spotId: targetSpotId,
                    });
                }
            }
        }
    }
};

export const removeMinionFromAuraTracking = (game: Game, targetMinion: MinionState): void => {
    for (const boardOwner of [game.data.playerOne, game.data.playerTwo]) {
        for (const spotId of MINION_SPOT_IDS) {
            const sourceMinion = boardOwner.board[spotId];
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

    for (const appliedTarget of sourceMinion.auraAppliedTo ?? []) {
        const targetOwner = getPlayerFromSpotOwner(game, appliedTarget.owner);
        const targetMinion = targetOwner.board[appliedTarget.spotId];
        if (!targetMinion || targetMinion.uuid !== appliedTarget.minionUuid) continue;

        const isOpponent = targetOwner !== sourceOwner;

        for (const passiveBoost of passiveBoosts) {
            const { boost, target } = passiveBoost;
            if (!target || (target.type !== "MINION" && target.type !== "ALL")) continue;
            if (shouldExcludeSourceMinion(target, sourceMinion, targetMinion)) continue;
            if (!minionMatchesTarget(targetMinion, target, isOpponent)) continue;

            revertBoostFromMinion(targetMinion, boost);
            recalculateMinionKeywords(game, targetMinion);
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
