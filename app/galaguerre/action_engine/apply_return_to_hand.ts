import { removeMinionByUuid } from "#api_types/board";
import { getMinionCardDescription } from "#api_types/minion_card_description";
import type { GamePlayer, MinionCard, MinionState } from "#api_types/game.types";
import type Game from "#models/game";
import { randomUUID } from "node:crypto";
import { refreshGameDynamicCosts } from "../dynamic_cost/compute_effective_cost.js";
import { instantiateDeckCard } from "../deck_card_operations.js";
import { giveCardToHand } from "../give_card_to_hand.js";
import { resolveSpotOwner } from "../game_narrative/narrative_effects.js";
import { withNarrativeRecorder } from "../game_narrative/narrative_context.js";
import {
    getAttackDescription,
    getBattlecryDescription,
    getComboDescription,
    getDeathrattleDescription,
    getMinionPowerEffects,
    getPassiveDescription,
    normalizeMinionPowers,
} from "../minion_card_metadata.js";
import {
    removeMinionFromAuraTracking,
    reapplyAllPassiveAuras,
    revertAurasReceivedByMinion,
    revertPassiveAurasForSource,
} from "../passive_engine/passive_aura.js";

const buildHandCardFromPrintedTemplate = (
    template: MinionCard,
    source: MinionCard,
    costReduction: number,
): MinionCard => ({
    ...template,
    uuid: randomUUID(),
    isGolden: source.isGolden,
    handCostReduction: (source.handCostReduction ?? 0) + costReduction,
});

const reprintMinionCardFromBoardState = (
    minion: MinionState,
    source: MinionCard,
    costReduction: number,
): MinionCard => {
    const minionPowers = normalizeMinionPowers(minion.initialKeywords);
    const effects = getMinionPowerEffects(minionPowers);
    const battlecryLines = getBattlecryDescription(source.battlecryActions);
    const comboLines = getComboDescription(source.comboActions ?? []);
    const deathrattleLines = getDeathrattleDescription(source.deathrattleActions);
    const attackLines = getAttackDescription(source.attackActions ?? []);
    const passiveLines = getPassiveDescription(source.passives);

    return {
        ...structuredClone(source),
        uuid: randomUUID(),
        attack: source.attack,
        health: source.health,
        minionPowers,
        effects,
        description: getMinionCardDescription(
            source.attack,
            source.health,
            effects,
            battlecryLines,
            deathrattleLines,
            passiveLines,
            source.dynamicCost,
            attackLines,
            comboLines,
        ),
        isGolden: source.isGolden,
        handCostReduction: (source.handCostReduction ?? 0) + costReduction,
    };
};

const createHandCardFromMinion = (minion: MinionState, costReduction: number): MinionCard => {
    const source = minion.originalCard;
    if (source.type !== "MINION") {
        throw new Error("RETURN_TO_HAND requires a minion originalCard");
    }

    const catalogCard = instantiateDeckCard(source.cardId);
    if (catalogCard?.type === "MINION") {
        return buildHandCardFromPrintedTemplate(catalogCard, source, costReduction);
    }

    return reprintMinionCardFromBoardState(minion, source, costReduction);
};

export const applyReturnToHand = (
    game: Game,
    owner: GamePlayer,
    boardIndex: number,
    minion: MinionState,
    costReduction: number,
): boolean => {
    const boardMinion = owner.board[boardIndex];
    if (!boardMinion || boardMinion.uuid !== minion.uuid) return false;

    revertPassiveAurasForSource(game, owner, minion);
    revertAurasReceivedByMinion(game, minion);
    removeMinionFromAuraTracking(game, minion);
    removeMinionByUuid(owner.board, minion.uuid);

    const handCard = createHandCardFromMinion(minion, costReduction);
    giveCardToHand(owner, handCard, game, { source: "GENERATED" });
    reapplyAllPassiveAuras(game);
    refreshGameDynamicCosts(game.data);

    const ownerSpot = resolveSpotOwner(game, owner);
    const cardSnapshot = structuredClone(handCard);
    withNarrativeRecorder((recorder) => {
        recorder.recordEffect({
            type: "RETURN_TO_HAND",
            owner: ownerSpot,
            card: cardSnapshot,
            fromBoardIndex: boardIndex,
        });
    });

    return true;
};
