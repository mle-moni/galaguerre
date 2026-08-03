import type { GameData } from "#api_types/game.types";
import { createSeededRng, runInSimulation } from "../../../utils/simulation_context.js";
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
 *
 * Pas de table de transposition ici, et ce n'est pas un oubli. L'idée est tentante — jouer A puis
 * B et B puis A donnent souvent la même position, et le faisceau développe les deux — mais elle a
 * été implémentée et mesurée : seuls 4,5 % des coups simulés aboutissaient à un état déjà vu,
 * pour une empreinte d'état qui coûtait environ 17 % du débit. Le pré-filtrage `topK` et
 * l'élagage du faisceau écartent en effet la plupart des permutations bien avant qu'elles ne se
 * rejoignent. Le solde est négatif : reproduire la mesure avec `dev:bench-search` avant de
 * réessayer.
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
     * Graine de base du PRNG. Chaque branche en dérive la sienne (voir `branchSeed`), pour que
     * deux lignes soient notées sur le même aléatoire plutôt que sur leur rang d'exploration.
     */
    seed: number;
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
     * `true` quand la recherche s'est arrêtée sur son budget (échéance ou plafond de nœuds).
     * Une séquence vide accompagnée de ce drapeau ne veut PAS dire « passer est le meilleur
     * coup » : elle veut dire qu'on n'a pas fini de regarder.
     */
    budgetExhausted: boolean;
    /**
     * Les `topResults` meilleures lignes, meilleure d'abord, avec l'état de fin de tour associé.
     * Contient toujours au moins la ligne rendue dans `moves`.
     */
    candidates: SearchNode[];
}

/**
 * Graine du PRNG pour une ligne donnée, dérivée de la SÉQUENCE de coups qui y mène (FNV-1a).
 *
 * Sans elle, toutes les branches puisent dans un seul flux aléatoire mutable ouvert pour la durée
 * de la décision : une invocation ou une cible aléatoire est alors résolue différemment selon
 * l'ORDRE d'exploration, et les scores des branches ne sont plus comparables — c'est la branche
 * chanceuse qui gagne le faisceau, pas la meilleure.
 *
 * Avec elle, une même ligne voit toujours le même aléatoire, quelle que soit sa position dans
 * l'exploration : c'est la technique des « nombres aléatoires communs ».
 */
export const deriveSeed = (baseSeed: number, moves: AiMove[]): number => {
    let hash = baseSeed >>> 0;

    for (const move of moves) {
        const key = moveKey(move);

        for (let index = 0; index < key.length; index++) {
            hash = (hash ^ key.charCodeAt(index)) >>> 0;
            hash = Math.imul(hash, 0x01000193) >>> 0;
        }
    }

    return hash;
};

/**
 * Filet de sécurité contre une recherche qui n'a jamais tourné.
 *
 * `searchBestTurn` rend une séquence vide dans deux cas très différents : le faisceau a comparé
 * des lignes et conclu que passer immédiatement était le mieux (résultat légitime), ou son budget
 * a sauté avant qu'elle n'ait de quoi conclure — un seul `applyAiMove` lent y suffit. Les
 * appelants traitent une séquence vide comme « passe ton tour », de sorte que le second cas
 * faisait sauter un tour entier de l'IA.
 *
 * `budgetExhausted` sépare les deux. On rend alors le meilleur coup du pré-filtrage statique, qui
 * ne coûte aucune simulation : l'IA joue glouton, un coup à la fois, ce qui est exactement la
 * dégradation attendue sous charge.
 */
export const fallbackWhenSearchNeverRan = (
    result: SearchResult,
    legalMoves: AiMove[],
    data: GameData,
    aiUserId: number,
): AiMove[] => {
    if (result.moves.length > 0 || !result.budgetExhausted) return result.moves;

    return prefilterMoves(legalMoves, data, aiUserId, 1);
};

const scoreEndOfTurn = (
    data: GameData,
    aiUserId: number,
    weights: EvaluationWeights,
    omniscient: boolean,
): number => evaluateGameState(data, aiUserId, weights, { isEndOfTurn: true, omniscient });

/**
 * Identifie un coup, pour regrouper les lignes qui commencent pareil et pour dériver la graine
 * d'une branche (voir `branchSeed`).
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
        seed,
        topResults = 1,
        omniscient = false,
    }: SearchOptions,
): Promise<SearchResult> => {
    let nodesExplored = 0;
    let budgetExhausted = false;

    const outOfBudget = (): boolean => {
        if (Date.now() > deadline || nodesExplored >= maxNodes) budgetExhausted = true;

        return budgetExhausted;
    };

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
        if (outOfBudget()) break;

        const candidates: SearchNode[] = [];

        for (const node of beam) {
            if (node.finished) continue;
            if (outOfBudget()) break;

            const game = createSimulationGame(node.data);
            const legalMoves = enumerateAiMoves(game, aiUserId);
            const moves = prefilterMoves(legalMoves, node.data, aiUserId, topK);

            for (const move of moves) {
                if (outOfBudget()) break;
                nodesExplored++;

                // Chaque branche rejoue le moteur sur SON propre flux aléatoire : deux lignes
                // sœurs voient le même hasard, leurs scores redeviennent comparables.
                const result = await runInSimulation(
                    { rng: createSeededRng(deriveSeed(seed, [...node.moves, move])) },
                    () => applyAiMove(node.data, aiUserId, move, pickDiscoverOption),
                );

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

        // Les nœuds terminaux sont ignorés à l'itération suivante : les garder dans le faisceau
        // ne ferait que gaspiller des places d'exploration.
        beam = candidates
            .filter((node) => !node.finished)
            .sort((a, b) => b.endScore - a.endScore)
            .slice(0, beamWidth);
    }

    const best = bestNodes[0]!;

    return {
        moves: best.moves,
        score: best.endScore,
        nodesExplored,
        budgetExhausted,
        candidates: bestNodes,
    };
};
