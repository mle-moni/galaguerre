import {
    MINION_SPOT_IDS,
    type GamePlayer,
    type MinionCard,
    type MinionSpotId,
    type MinionState,
    type TargetSnapshot,
} from "#api_types/game.types";
import { minionMatchesTarget, shouldExcludeSourceMinion } from "#api_types/target_matching";
import type Game from "#models/game";
import { getMinionCardTemplateById } from "../card_catalog.js";
import { getMinionPowerEffects, normalizeMinionPowers } from "../minion_card_metadata.js";
import {
    applyExistingAurasToMinion,
    recalculateMinionKeywords,
    revertPassiveAurasForSource,
} from "../passive_engine/passive_aura.js";
import { getTargetBoardEntries } from "./apply_mass_minion_effects.js";

const emptyPermanentKeywords = (): NonNullable<MinionState["permanentKeywords"]> => ({
    hasTaunt: false,
    hasCharge: false,
    hasWindfury: false,
    isPoisonous: false,
    hasStealth: false,
    hasDivineShield: false,
});

const buildReconvertedMinionCard = (template: MinionCard, boardUuid: string): MinionCard => {
    const minionPowers = normalizeMinionPowers(template.minionPowers);

    return {
        ...template,
        uuid: boardUuid,
        minionPowers,
        effects: getMinionPowerEffects(minionPowers),
    };
};

export const applyReconversionToMinion = (
    game: Game,
    owner: GamePlayer,
    spotId: MinionSpotId,
    reconvertCardId: number,
): void => {
    const minion = owner.board[spotId];
    if (!minion || minion.originalCard.type !== "MINION") return;

    const template = getMinionCardTemplateById(reconvertCardId);
    if (!template) return;

    revertPassiveAurasForSource(game, owner, minion);

    const newCard = buildReconvertedMinionCard(template, minion.uuid);
    const minionPowers = newCard.minionPowers;

    minion.originalCard = newCard;
    minion.attack = newCard.attack;
    minion.maxHealth = newCard.health;
    minion.health = newCard.health;
    minion.attacksThisRound = 0;
    minion.divineShieldConsumed = false;
    minion.initialKeywords = {
        hasTaunt: minionPowers.hasTaunt,
        hasCharge: minionPowers.hasCharge,
        hasWindfury: minionPowers.hasWindfury,
        isPoisonous: minionPowers.isPoisonous,
        hasStealth: minionPowers.hasStealth,
        hasDivineShield: minionPowers.hasDivineShield,
    };
    minion.permanentKeywords = emptyPermanentKeywords();
    minion.isSilenced = true;

    applyExistingAurasToMinion(game, owner, spotId);
    recalculateMinionKeywords(game, minion);
};

export const applyReconversionToAllMinions = (
    game: Game,
    player: GamePlayer,
    opponent: GamePlayer,
    target: TargetSnapshot,
    reconvertCardId: number,
    sourceMinion?: MinionState,
): void => {
    for (const { board, owner, isOpponent } of getTargetBoardEntries(target, player, opponent)) {
        for (const spotId of MINION_SPOT_IDS) {
            const minion = board[spotId];
            if (!minion) continue;
            if (shouldExcludeSourceMinion(target, sourceMinion, minion)) continue;
            if (!minionMatchesTarget(minion, target, isOpponent)) continue;

            applyReconversionToMinion(game, owner, spotId, reconvertCardId);
        }
    }
};
