import { removeMinionByUuid } from "#api_types/board";
import type { GamePlayer, MinionCard, MinionState } from "#api_types/game.types";
import type Game from "#models/game";
import { randomUUID } from "node:crypto";
import { refreshGameDynamicCosts } from "../dynamic_cost/compute_effective_cost.js";
import { giveCardToHand } from "../give_card_to_hand.js";
import { resolveSpotOwner } from "../game_narrative/narrative_effects.js";
import { withNarrativeRecorder } from "../game_narrative/narrative_context.js";
import {
    removeMinionFromAuraTracking,
    reapplyAllPassiveAuras,
    revertAurasReceivedByMinion,
    revertPassiveAurasForSource,
} from "../passive_engine/passive_aura.js";

const createHandCardFromMinion = (minion: MinionState, costReduction: number): MinionCard => {
    const source = minion.originalCard;
    if (source.type !== "MINION") {
        throw new Error("RETURN_TO_HAND requires a minion originalCard");
    }

    return {
        ...structuredClone(source),
        uuid: randomUUID(),
        handCostReduction: (source.handCostReduction ?? 0) + costReduction,
        cost: source.cost,
    };
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
