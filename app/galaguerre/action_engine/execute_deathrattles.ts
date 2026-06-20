import type { GamePlayer, MinionCard } from "#api_types/game.types";
import type Game from "#models/game";
import { recordDeathrattle } from "../game_log/record_game_log.js";
import { beginLoggedBeat, endCurrentBeat } from "../game_narrative/narrative_beats.js";
import { resolveSpotOwner } from "../game_narrative/narrative_effects.js";
import { withNarrativeRecorder } from "../game_narrative/narrative_context.js";
import { executeDeathrattleAction } from "./execute_deathrattle_action.js";

const getOpponent = (game: Game, player: GamePlayer): GamePlayer => {
    return player === game.data.playerOne ? game.data.playerTwo : game.data.playerOne;
};

const isGameOver = (game: Game): boolean => {
    return game.data.playerOne.health <= 0 || game.data.playerTwo.health <= 0;
};

export const executeDeathrattles = (
    game: Game,
    player: GamePlayer,
    card: MinionCard,
): { gameEnded: boolean } => {
    const opponent = getOpponent(game, player);

    if ((card.deathrattleActions ?? []).length > 0) {
        recordDeathrattle(game, player, card);
        const owner = resolveSpotOwner(game, player);

        withNarrativeRecorder((recorder) => {
            beginLoggedBeat(game, "TRIGGER");
            recorder.recordEffect({
                type: "TRIGGER",
                cardUuid: card.uuid,
                owner,
                trigger: "DEATHRATTLE",
            });
        });
    }

    for (const action of card.deathrattleActions ?? []) {
        const result = executeDeathrattleAction(game, player, opponent, action);
        if (result.gameEnded || isGameOver(game)) {
            if ((card.deathrattleActions ?? []).length > 0) {
                endCurrentBeat(game);
            }
            return { gameEnded: true };
        }
    }

    if ((card.deathrattleActions ?? []).length > 0) {
        endCurrentBeat(game);
    }

    return { gameEnded: false };
};
