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
import {
    applyExistingAurasToMinion,
    recalculateMinionKeywords,
    revertPassiveAurasForSource,
} from "../passive_engine/passive_aura.js";
import { getTargetBoardEntries } from "./apply_mass_minion_effects.js";

const syncMinionCardEffects = (card: MinionCard): void => {
    const effects: string[] = [];
    if (card.hasTaunt) effects.push("Provocation");
    if (card.hasCharge) effects.push("Charge");
    if (card.hasWindfury) effects.push("Furie des vents");
    if (card.isPoisonous) effects.push("Toxique");
    card.effects = effects;
};

const resetMinionKeywordsOnSilence = (minion: MinionState): void => {
    if (minion.originalCard.type !== "MINION") return;

    const card = minion.originalCard;

    minion.permanentKeywords = {
        hasTaunt: false,
        hasCharge: false,
        hasWindfury: false,
        isPoisonous: false,
    };

    card.hasTaunt = false;
    card.hasCharge = false;
    card.hasWindfury = false;
    card.isPoisonous = false;
    syncMinionCardEffects(card);
};

export const applySilenceToMinion = (game: Game, owner: GamePlayer, spotId: MinionSpotId): void => {
    const minion = owner.board[spotId];
    if (!minion || minion.originalCard.type !== "MINION" || minion.isSilenced) return;

    const card = minion.originalCard;

    revertPassiveAurasForSource(game, owner, minion);

    minion.attack = card.attack;
    minion.maxHealth = card.health;
    minion.health = Math.min(minion.health, minion.maxHealth);

    resetMinionKeywordsOnSilence(minion);
    minion.isSilenced = true;

    applyExistingAurasToMinion(game, owner, spotId);
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
        for (const spotId of MINION_SPOT_IDS) {
            const minion = board[spotId];
            if (!minion) continue;
            if (shouldExcludeSourceMinion(target, sourceMinion, minion)) continue;
            if (!minionMatchesTarget(minion, target, isOpponent)) continue;

            applySilenceToMinion(game, owner, spotId);
        }
    }
};
