import type { AiDeckProfile, GameData } from "#api_types/game.types";
import { getDefaultGameData } from "#controllers/games/create_game";
import { finalizeMulligan } from "#controllers/games/mulligan/finalize_mulligan";
import { performMulliganOnPlayer } from "#controllers/games/mulligan/perform_mulligan";
import { performPassTurn } from "#controllers/games/pass_game_turn";
import type { DeckRecipeEntry } from "#database/seed_data/balanced_decks";
import { loadTrainingBotCards } from "#services/training/load_training_bot_cards";
import { createSeededRng, runInSimulation } from "../../../utils/simulation_context.js";
import { applyAiMove } from "../../simulation/apply_ai_move.js";
import { createSimulationGame } from "../../simulation/simulation_game.js";
import { selectMulliganCardUuids } from "../advanced/advanced_mulligan.js";
import type { ResolvedAiVariant } from "../advanced/ai_variants.js";
import { decideExpertMoves } from "../advanced/decide_expert_move.js";
import { decideNextMoves, type AiDecision } from "../advanced/decide_next_move.js";
import type { ExpertFallbackReason } from "../advanced/expert_decision_trace.js";
import { enumerateAiMoves } from "../enumerate_ai_moves.js";
import type { GameResult } from "./match_statistics.js";

/**
 * Déroulé d'une partie du banc d'essai, entièrement en simulation (aucune écriture en base).
 *
 * Extrait de la commande pour deux raisons : les processus ouvriers (`--workers`) le rejouent tel
 * quel, et il se teste sans passer par ace.
 */

export const LEFT_USER_ID = -42;
export const RIGHT_USER_ID = -43;

const MAX_ROUNDS = 60;
const MAX_ACTIONS_PER_TURN = 40;

export type Side = "LEFT" | "RIGHT";

/** Un camp du banc : sa variante d'IA et le deck qu'il joue. */
export interface Contender {
    variant: ResolvedAiVariant;
    userId: number;
    profile: AiDeckProfile;
    recipe: DeckRecipeEntry[];
}

/** Agrégat des traces de décision d'un camp sur une partie. */
export interface ExpertTraceTotals {
    decisions: number;
    lethalDecisions: number;
    /** Décisions où le pli de riposte a réellement choisi la ligne jouée. */
    decidedByReply: number;
    repliesScored: number;
    repliesIncomplete: number;
    repliesSkipped: number;
    sawOpponentLethal: number;
    sawOwnLethal: number;
    ownLethalChangedChoice: number;
    /** Décisions où le classement de repli entre ripostes incomplètes a changé la ligne jouée. */
    incompleteRankingChangedChoice: number;
    fallbacks: Record<ExpertFallbackReason, number>;
}

export const createExpertTraceTotals = (): ExpertTraceTotals => ({
    decisions: 0,
    lethalDecisions: 0,
    decidedByReply: 0,
    repliesScored: 0,
    repliesIncomplete: 0,
    repliesSkipped: 0,
    sawOpponentLethal: 0,
    sawOwnLethal: 0,
    ownLethalChangedChoice: 0,
    incompleteRankingChangedChoice: 0,
    fallbacks: { NOTHING_TO_PLAY: 0, SINGLE_CANDIDATE: 0, NO_COMPLETE_REPLY: 0 },
});

export const mergeExpertTraceTotals = (
    into: ExpertTraceTotals,
    from: ExpertTraceTotals,
): ExpertTraceTotals => ({
    decisions: into.decisions + from.decisions,
    lethalDecisions: into.lethalDecisions + from.lethalDecisions,
    decidedByReply: into.decidedByReply + from.decidedByReply,
    repliesScored: into.repliesScored + from.repliesScored,
    repliesIncomplete: into.repliesIncomplete + from.repliesIncomplete,
    repliesSkipped: into.repliesSkipped + from.repliesSkipped,
    sawOpponentLethal: into.sawOpponentLethal + from.sawOpponentLethal,
    sawOwnLethal: into.sawOwnLethal + from.sawOwnLethal,
    ownLethalChangedChoice: into.ownLethalChangedChoice + from.ownLethalChangedChoice,
    incompleteRankingChangedChoice:
        into.incompleteRankingChangedChoice + from.incompleteRankingChangedChoice,
    fallbacks: {
        NOTHING_TO_PLAY: into.fallbacks.NOTHING_TO_PLAY + from.fallbacks.NOTHING_TO_PLAY,
        SINGLE_CANDIDATE: into.fallbacks.SINGLE_CANDIDATE + from.fallbacks.SINGLE_CANDIDATE,
        NO_COMPLETE_REPLY: into.fallbacks.NO_COMPLETE_REPLY + from.fallbacks.NO_COMPLETE_REPLY,
    },
});

const recordDecision = (totals: ExpertTraceTotals, decision: AiDecision): void => {
    totals.decisions++;

    if (decision.isLethal) {
        totals.lethalDecisions++;
        return;
    }

    const trace = decision.expertTrace;
    if (!trace) return;

    totals.repliesScored += trace.repliesScored;
    totals.repliesIncomplete += trace.repliesIncomplete;
    totals.repliesSkipped += trace.repliesSkipped;
    if (trace.sawOpponentLethal) totals.sawOpponentLethal++;
    if (trace.sawOwnLethal) totals.sawOwnLethal++;
    if (trace.ownLethalChangedChoice) totals.ownLethalChangedChoice++;
    if (trace.incompleteRankingChangedChoice) totals.incompleteRankingChangedChoice++;

    if (trace.fallback) totals.fallbacks[trace.fallback]++;
    else totals.decidedByReply++;
};

export interface BenchGameOutcome {
    result: GameResult;
    rounds: number;
    leftDecisionMs: number[];
    rightDecisionMs: number[];
    leftTrace: ExpertTraceTotals;
    rightTrace: ExpertTraceTotals;
}

export interface PlayBenchGameOptions {
    left: Contender;
    right: Contender;
    /** Qui occupe le siège du premier joueur : le protocole apparié alterne à graine constante. */
    leftGoesFirst: boolean;
    /**
     * Graine du mélange des decks et de tout l'aléatoire de la partie. Deux appels de même graine
     * et de `leftGoesFirst` opposé forment une PAIRE : les deux camps y jouent tour à tour le même
     * ordre de pioche, et la chance de tirage s'annule au lieu de gonfler la variance.
     */
    seed: number;
    /**
     * Recherche bornée par les seuls plafonds de nœuds. Rend la partie strictement reproductible
     * et neutralise l'écart de VITESSE entre deux variantes, pour ne mesurer que leur politique.
     */
    deterministic: boolean;
    /** Budget horloge imposé aux deux camps, quand `deterministic` est faux. */
    thinkMs: number;
}

export const playBenchGame = async ({
    left,
    right,
    leftGoesFirst,
    seed,
    deterministic,
    thinkMs,
}: PlayBenchGameOptions): Promise<BenchGameOutcome> => {
    const leftPlayer = {
        userId: left.userId,
        pseudo: `${left.variant.name} (left)`,
        avatarCardId: 1,
        cards: await loadTrainingBotCards(left.recipe),
    };
    const rightPlayer = {
        userId: right.userId,
        pseudo: `${right.variant.name} (right)`,
        avatarCardId: 1,
        cards: await loadTrainingBotCards(right.recipe),
    };

    const leftDecisionMs: number[] = [];
    const rightDecisionMs: number[] = [];
    const leftTrace = createExpertTraceTotals();
    const rightTrace = createExpertTraceTotals();

    return runInSimulation({ rng: createSeededRng(seed) }, async () => {
        const data: GameData = getDefaultGameData({
            playerOne: leftGoesFirst ? leftPlayer : rightPlayer,
            playerTwo: leftGoesFirst ? rightPlayer : leftPlayer,
            isTraining: true,
        });

        const game = createSimulationGame(data);

        for (const contender of [left, right]) {
            if (contender.variant.difficulty === "BEGINNER") continue;

            const isPlayerOne = (contender === left) === leftGoesFirst;
            const player = isPlayerOne ? game.data.playerOne : game.data.playerTwo;
            const opponent = isPlayerOne ? game.data.playerTwo : game.data.playerOne;

            performMulliganOnPlayer(
                player,
                selectMulliganCardUuids(player, contender.profile, {
                    opponent: contender.variant.difficulty === "EXPERT" ? opponent : undefined,
                }),
            );
        }

        await finalizeMulligan(game);

        while (!game.isFinished && game.data.currentRound <= MAX_ROUNDS) {
            if (game.data.state !== "PLAYER_ONE_TURN" && game.data.state !== "PLAYER_TWO_TURN") {
                break;
            }

            const activeIsPlayerOne = game.data.state === "PLAYER_ONE_TURN";
            const isLeftTurn = activeIsPlayerOne === leftGoesFirst;

            await playTurn(game, {
                active: isLeftTurn ? left : right,
                passive: isLeftTurn ? right : left,
                decisionMs: isLeftTurn ? leftDecisionMs : rightDecisionMs,
                totals: isLeftTurn ? leftTrace : rightTrace,
                seed,
                deterministic,
                thinkMs,
            });

            if (game.isFinished) break;

            const activePlayer = activeIsPlayerOne ? game.data.playerOne : game.data.playerTwo;
            await performPassTurn(game, activePlayer);
        }

        return {
            result: resolveResult(game.data, left.userId),
            rounds: game.data.currentRound,
            leftDecisionMs,
            rightDecisionMs,
            leftTrace,
            rightTrace,
        };
    });
};

const resolveResult = (data: GameData, leftUserId: number): GameResult => {
    const left = data.playerOne.userId === leftUserId ? data.playerOne : data.playerTwo;
    const right = data.playerOne.userId === leftUserId ? data.playerTwo : data.playerOne;

    if (right.health <= 0 && left.health > 0) return "LEFT";
    if (left.health <= 0 && right.health > 0) return "RIGHT";

    return "DRAW";
};

interface PlayTurnOptions {
    active: Contender;
    passive: Contender;
    decisionMs: number[];
    totals: ExpertTraceTotals;
    seed: number;
    deterministic: boolean;
    thinkMs: number;
}

const playTurn = async (
    game: ReturnType<typeof createSimulationGame>,
    { active, passive, decisionMs, totals, seed, deterministic, thinkMs }: PlayTurnOptions,
): Promise<void> => {
    if (active.variant.difficulty === "BEGINNER") {
        await playBeginnerTurn(game, active.userId);
        return;
    }

    for (let action = 0; action < MAX_ACTIONS_PER_TURN; action++) {
        if (game.isFinished || game.data.pendingDiscover) break;

        const decisionSeed = seed * 1000 + game.data.currentRound * 100 + action;
        const decision = await decide(game.data, {
            active,
            passive,
            seed: decisionSeed,
            deterministic,
            thinkMs,
        });

        decisionMs.push(decision.elapsedMs);
        recordDecision(totals, decision);

        if (decision.moves.length === 0) break;

        const result = await applyAiMove(game.data, active.userId, decision.moves[0]!);
        if (!result.applied) break;

        game.data = result.data;

        if (result.finished) {
            game.isFinished = true;
            break;
        }
    }
};

const decide = (
    data: GameData,
    {
        active,
        passive,
        seed,
        deterministic,
        thinkMs,
    }: {
        active: Contender;
        passive: Contender;
        seed: number;
        deterministic: boolean;
        thinkMs: number;
    },
): Promise<AiDecision> => {
    const config = {
        ...active.variant.config,
        maxThinkMs: thinkMs || active.variant.config.maxThinkMs,
    };

    if (active.variant.difficulty === "EXPERT") {
        return decideExpertMoves(data, {
            aiUserId: active.userId,
            opponentUserId: passive.userId,
            profile: active.profile,
            config,
            seed,
            deterministic,
        });
    }

    return decideNextMoves(data, {
        aiUserId: active.userId,
        profile: active.profile,
        config,
        seed,
        deterministic,
    });
};

/** Reproduit la politique de `runAiTurn` : le premier coup légal qui change l'état. */
const playBeginnerTurn = async (
    game: ReturnType<typeof createSimulationGame>,
    aiUserId: number,
): Promise<void> => {
    for (let action = 0; action < MAX_ACTIONS_PER_TURN; action++) {
        if (game.isFinished || game.data.pendingDiscover) break;

        const moves = enumerateAiMoves(game, aiUserId).filter((move) => move.type !== "pass_turn");
        if (moves.length === 0) break;

        let applied = false;

        for (const move of moves) {
            const result = await applyAiMove(game.data, aiUserId, move);
            if (!result.applied) continue;

            game.data = result.data;
            applied = true;

            if (result.finished) game.isFinished = true;

            break;
        }

        if (!applied || game.isFinished) break;
    }
};
