import type Game from "#models/game";
import { scheduleAiTurnIfNeeded } from "../../galaguerre/ai/schedule_ai_turn.js";
import { drawOneCard } from "../../galaguerre/draw_cards.js";
import { triggerPassives } from "../../galaguerre/passive_engine/trigger_passives.js";
import { clearTurnTimer, startTurnTimer } from "../../galaguerre/timers/game_timers.js";
import {
    beginLoggedBeat,
    endCurrentBeat,
} from "../../galaguerre/game_narrative/narrative_beats.js";
import {
    recordGainMana,
    resolveSpotOwner,
} from "../../galaguerre/game_narrative/narrative_effects.js";
import { withNarrativeRecorder } from "../../galaguerre/game_narrative/narrative_context.js";
import { runGameActionWithNarrative } from "../../galaguerre/game_narrative/run_game_action_with_narrative.js";
import { terminateGame } from "./terminate_game.js";

const MAX_MANA = 10;

export const setupNextGameTurn = async (game: Game) => {
    await runGameActionWithNarrative(game, async () => {
        const nextState = getWhoIsNext(game);

        game.data.state = nextState;

        const p1 = game.data.playerOne;
        const p2 = game.data.playerTwo;

        const player = nextState === "PLAYER_ONE_TURN" ? p1 : p2;
        const previousMana = player.mana;

        if (nextState === "PLAYER_ONE_TURN") {
            game.data.currentRound++;
        }

        player.mana = game.data.currentRound;
        if (player.mana > MAX_MANA) player.mana = MAX_MANA;

        const owner = resolveSpotOwner(game, player);
        const manaGained = player.mana - previousMana;

        beginLoggedBeat(game, "TURN_BEGIN");
        if (manaGained > 0) {
            recordGainMana(owner, manaGained);
        }
        withNarrativeRecorder((recorder) => {
            recorder.recordEffect({
                type: "TURN_BANNER",
                owner,
                label: owner === "PLAYER" ? "Votre tour" : "Tour adverse",
            });
        });

        const { gameEnded: turnBeginGameEnded } = triggerPassives(game, "TURN_BEGIN", player);
        drawOneCard(player, null, game);
        endCurrentBeat(game);

        if (turnBeginGameEnded || p1.health <= 0 || p2.health <= 0) {
            await terminateGame(game, { skipSendUpdate: true });
            return;
        }

        clearTurnTimer(game.id);
        startTurnTimer(game);
    });

    if (game.isFinished) return;

    scheduleAiTurnIfNeeded(game);
};

const getWhoIsNext = (game: Game): "PLAYER_ONE_TURN" | "PLAYER_TWO_TURN" => {
    if (game.data.state === "INIT" || game.data.state === "MULLIGAN") {
        return "PLAYER_ONE_TURN";
    }
    if (game.data.state === "PLAYER_ONE_TURN") return "PLAYER_TWO_TURN";

    return "PLAYER_ONE_TURN";
};
