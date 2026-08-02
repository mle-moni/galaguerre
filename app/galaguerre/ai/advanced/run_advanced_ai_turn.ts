import { DEFAULT_AI_DIFFICULTY, type AiDifficulty, type GameData } from "#api_types/game.types";
import Game from "#models/game";
import { getAiActionDelayMs } from "../ai_action_delay.js";
import { isAiTurn } from "../get_ai_player_seat.js";
import { waitForAiDiscovers } from "../schedule_ai_discover.js";
import { tryAiAction, withAiSocket } from "../try_ai_action.js";
import { loadAdvancedAiConfig } from "./advanced_ai_config.js";
import { decideExpertMoves } from "./decide_expert_move.js";
import { decideNextMoves, type AiDecision } from "./decide_next_move.js";
import { loadExpertAiConfig } from "./expert_ai_config.js";

/**
 * Tour des IA à recherche (« Avancé » et « Expert »).
 *
 * Même ossature que `runAiTurn` (socket factice, actions passées par les vrais contrôleurs,
 * délai entre les actions pour rester lisible), mais le choix du coup vient d'une recherche
 * (`decideNextMoves` / `decideExpertMoves`) au lieu de l'ordre d'énumération.
 *
 * On re-décide avant CHAQUE action : l'aléatoire du jeu fait diverger l'état réel de l'état
 * simulé, un plan déroulé aveuglément deviendrait vite faux.
 */

const MAX_ACTIONS_PER_TURN = 40;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getOpponentUserId = (data: GameData, aiUserId: number): number =>
    data.playerOne.userId === aiUserId ? data.playerTwo.userId : data.playerOne.userId;

/** Un décideur par difficulté, pour que la boucle de tour reste unique. */
type MoveDecider = (data: GameData, seed: number) => Promise<AiDecision>;

const createMoveDecider = async (
    difficulty: AiDifficulty,
    aiUserId: number,
): Promise<MoveDecider> => {
    if (difficulty === "EXPERT") {
        const config = await loadExpertAiConfig();

        return (data, seed) =>
            decideExpertMoves(data, {
                aiUserId,
                opponentUserId: getOpponentUserId(data, aiUserId),
                profile: data.aiDeckProfile,
                config,
                seed,
            });
    }

    const config = await loadAdvancedAiConfig();

    return (data, seed) =>
        decideNextMoves(data, { aiUserId, profile: data.aiDeckProfile, config, seed });
};

export const runAdvancedAiTurn = async (
    gameId: number,
    aiUserId: number,
    difficulty: AiDifficulty = DEFAULT_AI_DIFFICULTY,
): Promise<void> => {
    const decideMoves = await createMoveDecider(difficulty, aiUserId);

    await withAiSocket(gameId, aiUserId, async (socketId) => {
        let actionsThisTurn = 0;

        while (actionsThisTurn < MAX_ACTIONS_PER_TURN) {
            const game = await Game.findOrFail(gameId);
            await game.refresh();

            if (game.isFinished || !isAiTurn(game)) return;

            // Une découverte en attente bloque toute action : on attend que l'IA ait choisi
            // (Zoothérapie en enchaîne deux) avant de reprendre le tour. Rendre la main ici
            // laisserait la partie figée jusqu'au minuteur, personne ne relançant le tour.
            if (game.data.pendingDiscover) {
                await waitForAiDiscovers(game);
                if (game.data.pendingDiscover) return;
                continue;
            }

            const decision = await decideMoves(game.data, gameId * 1000 + actionsThisTurn);

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
        }

        const game = await Game.findOrFail(gameId);
        await game.refresh();

        if (game.data.pendingDiscover) await waitForAiDiscovers(game);

        if (!game.isFinished && isAiTurn(game) && !game.data.pendingDiscover) {
            await tryAiAction(game, socketId, { type: "pass_turn" });
        }
    });
};
