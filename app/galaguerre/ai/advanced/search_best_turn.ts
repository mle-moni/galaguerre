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
    /**
     * Nombre de lignes candidates rendues en plus de la meilleure (défaut : 1, la meilleure).
     * L'IA Expert en demande plusieurs pour les départager en simulant le tour adverse.
     */
    topResults?: number;
    /** Évaluation en information parfaite : réservée à l'IA Expert. */
    omniscient?: boolean;
}

export interface SearchNode {
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
    /**
     * Les `topResults` meilleures lignes, meilleure d'abord, avec l'état de fin de tour associé.
     * Contient toujours au moins la ligne rendue dans `moves`.
     */
    candidates: SearchNode[];
}

const scoreEndOfTurn = (
    data: GameData,
    aiUserId: number,
    weights: EvaluationWeights,
    omniscient: boolean,
): number => evaluateGameState(data, aiUserId, weights, { isEndOfTurn: true, omniscient });

/**
 * Identifie un coup, pour regrouper les lignes qui commencent pareil.
 */
const moveKey = (move: AiMove): string => {
    switch (move.type) {
        case "pass_turn":
            return "pass";
        case "play_card":
            return `play:${move.action.cardId}:${move.action.boardIndex}:${move.action.actionTarget?.owner ?? ""}:${move.action.actionTarget?.minionUuid ?? ""}`;
        case "minion_action":
            return `minion:${move.action.minionId}:${move.action.owner}:${move.action.minionUuid ?? "face"}`;
        case "weapon_action":
            return `weapon:${move.action.owner}:${move.action.minionUuid ?? "face"}`;
    }
};

/**
 * Ne garde que la MEILLEURE ligne par premier coup distinct.
 *
 * Sans ce regroupement, les `topResults` meilleures lignes sont presque toujours les préfixes
 * successifs d'une même ligne (« joue A », « joue A puis B », « joue A puis B puis C »...) :
 * chaque coup ajouté améliorant le score, la recherche remplit son palmarès avec une seule idée.
 * L'appelant, lui, ne joue que le PREMIER coup — un palmarès de préfixes ne lui laisse donc rien
 * à départager. On lui rend des alternatives réellement différentes.
 */
const bestLinePerFirstMove = (nodes: SearchNode[], limit: number): SearchNode[] => {
    const bestByFirstMove = new Map<string, SearchNode>();

    for (const node of nodes) {
        const key = node.moves.length === 0 ? "pass" : moveKey(node.moves[0]!);
        const current = bestByFirstMove.get(key);

        if (!current || node.endScore > current.endScore) {
            bestByFirstMove.set(key, node);
        }
    }

    return [...bestByFirstMove.values()].sort((a, b) => b.endScore - a.endScore).slice(0, limit);
};

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
        topResults = 1,
        omniscient = false,
    }: SearchOptions,
): Promise<SearchResult> => {
    let nodesExplored = 0;

    const root: SearchNode = {
        data,
        moves: [],
        endScore: scoreEndOfTurn(data, aiUserId, weights, omniscient),
        finished: false,
    };

    let beam: SearchNode[] = [root];
    // Meilleures lignes toutes profondeurs confondues, la meilleure en tête.
    let bestNodes: SearchNode[] = [root];

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
                    ? evaluateGameState(result.data, aiUserId, weights, { omniscient })
                    : scoreEndOfTurn(result.data, aiUserId, weights, omniscient);

                candidates.push({
                    data: result.data,
                    moves: [...node.moves, move],
                    endScore,
                    finished: result.finished,
                });
            }
        }

        if (candidates.length === 0) break;

        bestNodes = bestLinePerFirstMove([...bestNodes, ...candidates], topResults);

        // Une victoire trouvée : inutile de chercher plus loin.
        if (bestNodes[0]!.endScore >= WIN_SCORE) break;

        beam = candidates.sort((a, b) => b.endScore - a.endScore).slice(0, beamWidth);
    }

    const best = bestNodes[0]!;

    return {
        moves: best.moves,
        score: best.endScore,
        nodesExplored,
        candidates: bestNodes,
    };
};
