import Game from "#models/game";
import { getAiActionDelayMs } from "../ai_action_delay.js";
import { isAiTurn } from "../get_ai_player_seat.js";
import { tryAiAction, withAiSocket } from "../try_ai_action.js";
import { loadAdvancedAiConfig } from "./advanced_ai_config.js";
import { decideNextMoves } from "./decide_next_move.js";

/**
 * Tour de l'IA « Avancé ».
 *
 * Même ossature que `runAiTurn` (socket factice, actions passées par les vrais contrôleurs,
 * délai entre les actions pour rester lisible), mais le choix du coup vient d'une recherche
 * (`decideNextMoves`) au lieu de l'ordre d'énumération.
 *
 * On re-décide avant CHAQUE action : l'aléatoire du jeu fait diverger l'état réel de l'état
 * simulé, un plan déroulé aveuglément deviendrait vite faux.
 */

const MAX_ACTIONS_PER_TURN = 40;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const runAdvancedAiTurn = async (gameId: number, aiUserId: number): Promise<void> => {
    const config = await loadAdvancedAiConfig();

    await withAiSocket(gameId, aiUserId, async (socketId) => {
        let actionsThisTurn = 0;

        while (actionsThisTurn < MAX_ACTIONS_PER_TURN) {
            const game = await Game.findOrFail(gameId);
            await game.refresh();

            if (game.isFinished || !isAiTurn(game)) return;

            // Une découverte en attente bloque toute action : `scheduleAiDiscoverIfNeeded` la
            // résout de son côté et relancera le tour.
            if (game.data.pendingDiscover) return;

            const decision = await decideNextMoves(game.data, {
                aiUserId,
                profile: game.data.aiDeckProfile,
                config,
                seed: gameId * 1000 + actionsThisTurn,
            });

            if (decision.moves.length === 0) break;

            // La séquence entière sert de repli : si le premier coup échoue (état divergent), on
            // tente le suivant plutôt que de passer le tour immédiatement.
            let actionSucceeded = false;

            for (const move of decision.moves) {
                const success = await tryAiAction(game, socketId, move);
                await game.refresh();

                if (!success) continue;

                actionSucceeded = true;
                actionsThisTurn++;

                if (game.isFinished) return;

                await sleep(getAiActionDelayMs());
                break;
            }

            if (!actionSucceeded) break;
            if (game.data.pendingDiscover) return;
        }

        const game = await Game.findOrFail(gameId);
        await game.refresh();

        if (!game.isFinished && isAiTurn(game) && !game.data.pendingDiscover) {
            await tryAiAction(game, socketId, { type: "pass_turn" });
        }
    });
};
