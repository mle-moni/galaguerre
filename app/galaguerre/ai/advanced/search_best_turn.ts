import type { GameData } from "#api_types/game.types";
import { applyAiMove, type DiscoverOptionPicker } from "../../simulation/apply_ai_move.js";
import { createSimulationGame } from "../../simulation/simulation_game.js";
import { enumerateAiMoves, type AiMove } from "../enumerate_ai_moves.js";
import { evaluateGameState, WIN_SCORE, type EvaluationWeights } from "./evaluate_game_state.js";
import { prefilterMoves } from "./prefilter_moves.js";

/**
 * Recherche en faisceau sur le tour complet de l'IA.
 *
 * On explore des SÉQUENCES de coups (et pas un coup isolé) parce que la valeur d'un coup dépend
 * de ce qui suit : buffer un monstre avant de l'envoyer attaquer, tomber une Provocation avant
 * de frapper au visage, dépenser tout son mana... Une politique gloutonne rate ces enchaînements.
 *
 * À chaque profondeur on ne garde que les `beamWidth` meilleures séquences, et à chaque nœud on
 * ne simule que les `topK` coups les plus prometteurs (pré-filtrage statique) : la simulation
 * étant l'opération coûteuse, c'est elle qu'il faut rationner.
 */

export interface SearchOptions {
    aiUserId: number;
    weights: EvaluationWeights;
    beamWidth: number;
    topK: number;
    maxNodes: number;
    maxDepth: number;
    /** Timestamp (ms) au-delà duquel la recherche s'arrête et rend son meilleur résultat. */
    deadline: number;
    pickDiscoverOption: DiscoverOptionPicker;
}

interface SearchNode {
    data: GameData;
    moves: AiMove[];
    /** Score de l'état si l'IA s'arrêtait ici (fin de tour). */
    endScore: number;
    finished: boolean;
}

export interface SearchResult {
    /** Meilleure séquence trouvée ; vide si passer immédiatement est le mieux. */
    moves: AiMove[];
    score: number;
    /** Nombre de coups réellement simulés : utile pour le suivi de charge. */
    nodesExplored: number;
}

const scoreEndOfTurn = (data: GameData, aiUserId: number, weights: EvaluationWeights): number =>
    evaluateGameState(data, aiUserId, weights, { isEndOfTurn: true });

export const searchBestTurn = async (
    data: GameData,
    {
        aiUserId,
        weights,
        beamWidth,
        topK,
        maxNodes,
        maxDepth,
        deadline,
        pickDiscoverOption,
    }: SearchOptions,
): Promise<SearchResult> => {
    let nodesExplored = 0;

    const root: SearchNode = {
        data,
        moves: [],
        endScore: scoreEndOfTurn(data, aiUserId, weights),
        finished: false,
    };

    let beam: SearchNode[] = [root];
    let best: SearchNode = root;

    for (let depth = 0; depth < maxDepth; depth++) {
        if (Date.now() > deadline || nodesExplored >= maxNodes) break;

        const candidates: SearchNode[] = [];

        for (const node of beam) {
            if (node.finished) continue;
            if (Date.now() > deadline || nodesExplored >= maxNodes) break;

            const game = createSimulationGame(node.data);
            const legalMoves = enumerateAiMoves(game, aiUserId);
            const moves = prefilterMoves(legalMoves, node.data, aiUserId, topK);

            for (const move of moves) {
                if (Date.now() > deadline || nodesExplored >= maxNodes) break;
                nodesExplored++;

                const result = await applyAiMove(node.data, aiUserId, move, pickDiscoverOption);
                if (!result.applied) continue;

                const endScore = result.finished
                    ? evaluateGameState(result.data, aiUserId, weights)
                    : scoreEndOfTurn(result.data, aiUserId, weights);

                candidates.push({
                    data: result.data,
                    moves: [...node.moves, move],
                    endScore,
                    finished: result.finished,
                });
            }
        }

        if (candidates.length === 0) break;

        for (const candidate of candidates) {
            if (candidate.endScore > best.endScore) best = candidate;
        }

        // Une victoire trouvée : inutile de chercher plus loin.
        if (best.endScore >= WIN_SCORE) break;

        beam = candidates.sort((a, b) => b.endScore - a.endScore).slice(0, beamWidth);
    }

    return { moves: best.moves, score: best.endScore, nodesExplored };
};
