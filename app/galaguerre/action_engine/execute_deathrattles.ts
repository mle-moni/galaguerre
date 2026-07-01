import type { GamePlayer, MinionCard } from "#api_types/game.types";
import type Game from "#models/game";
import { recordDeathrattle } from "../game_log/record_game_log.js";
import { beginLoggedBeatIfNone, endCurrentBeat } from "../game_narrative/narrative_beats.js";
import { resolveSpotOwner } from "../game_narrative/narrative_effects.js";
import { withNarrativeRecorder } from "../game_narrative/narrative_context.js";
import { executeDeathrattleAction } from "./execute_deathrattle_action.js";
import { executeActionSequence } from "./execute_action_sequence.js";
import { isDeathrattleV1Action } from "./is_deathrattle_v1_action.js";

const getOpponent = (game: Game, player: GamePlayer): GamePlayer => {
    return player === game.data.playerOne ? game.data.playerTwo : game.data.playerOne;
};

const isGameOver = (game: Game): boolean => {
    return game.data.playerOne.health <= 0 || game.data.playerTwo.health <= 0;
};

const isMassDeathrattleAction = (action: MinionCard["deathrattleActions"][number]): boolean => {
    if (!isDeathrattleV1Action(action)) return false;
    return (
        (action.type === "DAMAGE" && action.target?.type === "MINION") ||
        (action.type === "HEAL" && action.target?.type === "MINION") ||
        (action.type === "DESTROY" && action.target?.type === "MINION")
    );
};

export const executeDeathrattles = (
    game: Game,
    player: GamePlayer,
    card: MinionCard,
): { gameEnded: boolean; discoverPending: boolean } => {
    const opponent = getOpponent(game, player);
    const actions = card.deathrattleActions ?? [];

    if (actions.length > 0) {
        recordDeathrattle(game, player, card);
        const owner = resolveSpotOwner(game, player);

        withNarrativeRecorder((recorder) => {
            beginLoggedBeatIfNone(game, "TRIGGER");
            recorder.recordEffect({
                type: "TRIGGER",
                cardUuid: card.uuid,
                owner,
                trigger: "DEATHRATTLE",
            });
        });
    }

    for (const action of actions) {
        if (isMassDeathrattleAction(action)) {
            const result = executeDeathrattleAction(game, player, opponent, action);
            if (result.gameEnded || isGameOver(game)) {
                return { gameEnded: true, discoverPending: false };
            }
            continue;
        }

        if (!isDeathrattleV1Action(action)) continue;

        const result = executeActionSequence(game, player, opponent, [action], {
            sourceCard: { cardId: card.cardId, label: card.label, uuid: card.uuid },
            effectKind: "DEATHRATTLE",
        });

        if (result.discoverPending) {
            return result;
        }

        if (result.gameEnded || isGameOver(game)) {
            return { gameEnded: true, discoverPending: false };
        }
    }

    if (actions.length > 0) {
        endCurrentBeat(game);
    }
    return { gameEnded: false, discoverPending: false };
};
