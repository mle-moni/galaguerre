import type {
    MinionCard,
    MinionState,
    ReconvertParametersSnapshot,
    TargetSnapshot,
} from "#api_types/game.types";
import { type GamePlayer } from "#api_types/game.types";
import { minionMatchesTarget, shouldExcludeSourceMinion } from "#api_types/target_matching";
import type Game from "#models/game";
import {
    getAttackDescription,
    getBattlecryDescription,
    getDeathrattleDescription,
    getMinionPowerEffects,
    getPassiveDescription,
    normalizeMinionPowers,
} from "../minion_card_metadata.js";
import { getMinionCardDescription } from "#api_types/minion_card_description";
import {
    recalculateMinionKeywords,
    removeMinionFromAuraTracking,
    revertPassiveAurasForSource,
} from "../passive_engine/passive_aura.js";
import { refreshAurasAfterMinionPlayed } from "../passive_engine/refresh_passive_auras.js";
import { getTargetBoardEntries } from "./apply_mass_minion_effects.js";
import { resolveReconvertTemplate } from "./resolve_reconvert_template.js";

const emptyPermanentKeywords = (): NonNullable<MinionState["permanentKeywords"]> => ({
    hasTaunt: false,
    hasCharge: false,
    hasRush: false,
    hasWindfury: false,
    isPoisonous: false,
    hasStealth: false,
    hasDivineShield: false,
});

const buildReconvertedMinionCard = (template: MinionCard, boardUuid: string): MinionCard => {
    const minionPowers = normalizeMinionPowers(template.minionPowers);
    const effects = getMinionPowerEffects(minionPowers);
    const battlecryLines = getBattlecryDescription(template.battlecryActions);
    const deathrattleLines = getDeathrattleDescription(template.deathrattleActions);
    const attackLines = getAttackDescription(template.attackActions ?? []);
    const passiveLines = getPassiveDescription(template.passives);

    return {
        ...template,
        uuid: boardUuid,
        minionPowers,
        effects,
        battlecryActions: template.battlecryActions,
        deathrattleActions: template.deathrattleActions,
        attackActions: template.attackActions ?? [],
        passives: template.passives,
        description: getMinionCardDescription(
            template.attack,
            template.health,
            effects,
            battlecryLines,
            deathrattleLines,
            passiveLines,
            template.dynamicCost,
            attackLines,
        ),
    };
};

export const applyReconversionWithTemplate = (
    game: Game,
    owner: GamePlayer,
    boardIndex: number,
    template: MinionCard,
    controller: GamePlayer,
): void => {
    const minion = owner.board[boardIndex];
    if (!minion || minion.originalCard.type !== "MINION") return;

    revertPassiveAurasForSource(game, owner, minion);
    removeMinionFromAuraTracking(game, minion);

    const newCard = buildReconvertedMinionCard(template, minion.uuid);
    const minionPowers = newCard.minionPowers;

    minion.originalCard = newCard;
    minion.attack = newCard.attack;
    minion.maxHealth = newCard.health;
    minion.health = newCard.health;
    minion.attacksThisRound = 0;
    if (owner === controller) {
        minion.placedAtRound = game.data.currentRound;
    }
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
    minion.isSilenced = false;

    refreshAurasAfterMinionPlayed(game, owner, boardIndex);
    recalculateMinionKeywords(game, minion);
};

export const applyReconversionToMinion = (
    game: Game,
    owner: GamePlayer,
    boardIndex: number,
    parameters: ReconvertParametersSnapshot,
    sourceMinionForRelative: MinionState,
    controller: GamePlayer,
): void => {
    const minion = owner.board[boardIndex];
    if (!minion || minion.originalCard.type !== "MINION") return;

    const template = resolveReconvertTemplate(parameters, sourceMinionForRelative);
    if (!template) return;

    applyReconversionWithTemplate(game, owner, boardIndex, template, controller);
};

export const applyReconversionToAllMinions = (
    game: Game,
    player: GamePlayer,
    opponent: GamePlayer,
    target: TargetSnapshot,
    parameters: ReconvertParametersSnapshot,
    sourceMinion?: MinionState,
): void => {
    for (const { board, owner, isOpponent } of getTargetBoardEntries(target, player, opponent)) {
        for (let boardIndex = 0; boardIndex < board.length; boardIndex++) {
            const minion = board[boardIndex];
            if (shouldExcludeSourceMinion(target, sourceMinion, minion)) continue;
            if (!minionMatchesTarget(minion, target, isOpponent)) continue;

            applyReconversionToMinion(game, owner, boardIndex, parameters, minion, player);
        }
    }
};
