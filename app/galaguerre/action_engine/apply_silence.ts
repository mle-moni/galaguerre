import type { GamePlayer, MinionCard, MinionState, TargetSnapshot } from "#api_types/game.types";
import { minionMatchesTarget, shouldExcludeSourceMinion } from "#api_types/target_matching";
import type Game from "#models/game";
import { getMinionPowerEffects } from "../minion_card_metadata.js";
import {
    applyExistingAurasToMinion,
    recalculateMinionKeywords,
    revertPassiveAurasForSource,
} from "../passive_engine/passive_aura.js";
import { getTargetBoardEntries } from "./apply_mass_minion_effects.js";
import { resolveSpotOwner } from "../game_narrative/narrative_effects.js";
import { withNarrativeRecorder } from "../game_narrative/narrative_context.js";

const syncMinionCardEffects = (card: MinionCard): void => {
    card.effects = getMinionPowerEffects(card.minionPowers);
};

const resetMinionKeywordsOnSilence = (minion: MinionState): void => {
    if (minion.originalCard.type !== "MINION") return;

    const card = minion.originalCard;

    minion.permanentKeywords = {
        hasTaunt: false,
        hasCharge: false,
        hasWindfury: false,
        isPoisonous: false,
        hasStealth: false,
        hasDivineShield: false,
    };

    minion.initialKeywords = {
        hasTaunt: false,
        hasCharge: false,
        hasWindfury: false,
        isPoisonous: false,
        hasStealth: false,
        hasDivineShield: false,
    };

    card.minionPowers.hasTaunt = false;
    card.minionPowers.hasCharge = false;
    card.minionPowers.hasWindfury = false;
    card.minionPowers.isPoisonous = false;
    card.minionPowers.hasStealth = false;
    card.minionPowers.hasDivineShield = false;
    syncMinionCardEffects(card);
};

export const applySilenceToMinion = (game: Game, owner: GamePlayer, boardIndex: number): void => {
    const minion = owner.board[boardIndex];
    if (!minion || minion.originalCard.type !== "MINION" || minion.isSilenced) return;

    const card = minion.originalCard;

    revertPassiveAurasForSource(game, owner, minion);

    minion.attack = card.attack;
    minion.maxHealth = card.health;
    minion.health = Math.min(minion.health, minion.maxHealth);

    resetMinionKeywordsOnSilence(minion);
    minion.isSilenced = true;

    withNarrativeRecorder((recorder) => {
        recorder.recordEffect({
            type: "SILENCE",
            cardUuid: minion.uuid,
            owner: resolveSpotOwner(game, owner),
        });
    });

    applyExistingAurasToMinion(game, owner, boardIndex);
    recalculateMinionKeywords(game, minion);
};

export const applySilenceToAllMinions = (
    game: Game,
    player: GamePlayer,
    opponent: GamePlayer,
    target: TargetSnapshot,
    sourceMinion?: MinionState,
): void => {
    for (const { board, owner, isOpponent } of getTargetBoardEntries(target, player, opponent)) {
        for (let boardIndex = 0; boardIndex < board.length; boardIndex++) {
            const minion = board[boardIndex];
            if (shouldExcludeSourceMinion(target, sourceMinion, minion)) continue;
            if (!minionMatchesTarget(minion, target, isOpponent)) continue;

            applySilenceToMinion(game, owner, boardIndex);
        }
    }
};
