import { BaseCommand, flags } from "@adonisjs/core/ace";
import type { AiDeckProfile, GameData } from "#api_types/game.types";
import { getDefaultGameData } from "#controllers/games/create_game";
import { performPassTurn } from "#controllers/games/pass_game_turn";
import { finalizeMulligan } from "#controllers/games/mulligan/finalize_mulligan";
import { ADVANCED_AI_DECKS } from "#database/seed_data/ai_decks";
import { TRAINING_BOT_DECK_RECIPE } from "#database/seed_data/training_bot_deck";
import type { DeckRecipeEntry } from "#database/seed_data/balanced_decks";
import {
    ADVANCED_AI_DEFAULTS,
    type AdvancedAiConfig,
} from "#galaguerre/ai/advanced/advanced_ai_config";
import { selectMulliganCardUuids } from "#galaguerre/ai/advanced/advanced_mulligan";
import { decideNextMoves } from "#galaguerre/ai/advanced/decide_next_move";
import { enumerateAiMoves } from "#galaguerre/ai/enumerate_ai_moves";
import { applyAiMove } from "#galaguerre/simulation/apply_ai_move";
import { createSimulationGame } from "#galaguerre/simulation/simulation_game";
import { performMulliganOnPlayer } from "#controllers/games/mulligan/perform_mulligan";
import { loadTrainingBotCards } from "#services/training/load_training_bot_cards";
import { createSeededRng, runInSimulation } from "../app/utils/simulation_context.js";

/**
 * Banc d'essai : fait s'affronter l'IA « Avancé » et l'IA « Débutant » entièrement en simulation
 * (aucune écriture en base) et rapporte le taux de victoire.
 *
 * C'est la mesure qui dit si l'IA avancée est réellement plus forte — les tests unitaires ne
 * valident que des comportements isolés.
 */

const ADVANCED_USER_ID = -42;
const BEGINNER_USER_ID = -43;
const MAX_ROUNDS = 60;
const MAX_ACTIONS_PER_TURN = 40;

type Side = "ADVANCED" | "BEGINNER";

interface GameOutcome {
    winner: Side | null;
    rounds: number;
    advancedThinkMs: number;
    advancedDecisions: number;
}

export default class BenchAi extends BaseCommand {
    static commandName = "dev:bench-ai";
    static description = "Play the advanced AI against the beginner AI and report the win rate";
    static options = { startApp: true };

    @flags.number({ description: "Number of games to play", default: 20 })
    declare games: number;

    @flags.number({ description: "Max thinking time per action, in ms", default: 0 })
    declare thinkMs: number;

    @flags.string({ description: "Force the advanced deck profile: AGGRO or MIDRANGE" })
    declare profile?: string;

    @flags.boolean({
        description: "Give the advanced AI the beginner deck, to isolate AI strength from decks",
        default: false,
    })
    declare mirror: boolean;

    async run() {
        const config = {
            ...ADVANCED_AI_DEFAULTS,
            maxThinkMs: this.thinkMs > 0 ? this.thinkMs : ADVANCED_AI_DEFAULTS.maxThinkMs,
        };

        const beginnerCards = await loadTrainingBotCards(TRAINING_BOT_DECK_RECIPE);
        const advancedDecks = this.profile
            ? ADVANCED_AI_DECKS.filter(({ profile }) => profile === this.profile)
            : ADVANCED_AI_DECKS;

        if (advancedDecks.length === 0) {
            this.logger.error(`Unknown profile "${this.profile}" (expected AGGRO or MIDRANGE)`);
            this.exitCode = 1;
            return;
        }

        const outcomes: GameOutcome[] = [];

        for (let index = 0; index < this.games; index++) {
            const deck = advancedDecks[index % advancedDecks.length]!;
            const advancedCards = this.mirror
                ? await loadTrainingBotCards(TRAINING_BOT_DECK_RECIPE)
                : await loadTrainingBotCards(deck.recipe as DeckRecipeEntry[]);

            const outcome = await this.playGame({
                advancedCards,
                beginnerCards,
                profile: deck.profile,
                // On alterne qui commence : le premier joueur a un avantage structurel.
                advancedGoesFirst: index % 2 === 0,
                config,
                seed: index + 1,
            });

            outcomes.push(outcome);
            this.logger.info(
                `game ${index + 1}/${this.games} (${deck.profile}) → ${outcome.winner ?? "DRAW"} in ${outcome.rounds} rounds`,
            );
        }

        this.report(outcomes);
    }

    private report(outcomes: GameOutcome[]) {
        const wins = outcomes.filter(({ winner }) => winner === "ADVANCED").length;
        const losses = outcomes.filter(({ winner }) => winner === "BEGINNER").length;
        const draws = outcomes.length - wins - losses;

        const totalThinkMs = outcomes.reduce((sum, o) => sum + o.advancedThinkMs, 0);
        const totalDecisions = outcomes.reduce((sum, o) => sum + o.advancedDecisions, 0);
        const avgRounds = outcomes.reduce((sum, o) => sum + o.rounds, 0) / outcomes.length;

        this.logger.info("");
        this.logger.info(`ADVANCED wins : ${wins}/${outcomes.length}`);
        this.logger.info(`BEGINNER wins : ${losses}/${outcomes.length}`);
        this.logger.info(`draws / timeouts: ${draws}`);
        this.logger.info(`win rate      : ${((wins / outcomes.length) * 100).toFixed(1)}%`);
        this.logger.info(`avg rounds    : ${avgRounds.toFixed(1)}`);
        this.logger.info(
            `avg think time: ${totalDecisions > 0 ? (totalThinkMs / totalDecisions).toFixed(0) : 0} ms/decision`,
        );
    }

    private async playGame({
        advancedCards,
        beginnerCards,
        profile,
        advancedGoesFirst,
        config,
        seed,
    }: {
        advancedCards: Awaited<ReturnType<typeof loadTrainingBotCards>>;
        beginnerCards: Awaited<ReturnType<typeof loadTrainingBotCards>>;
        profile: AiDeckProfile;
        advancedGoesFirst: boolean;
        config: AdvancedAiConfig;
        seed: number;
    }): Promise<GameOutcome> {
        const advancedPlayer = {
            userId: ADVANCED_USER_ID,
            pseudo: "Avancé",
            avatarCardId: 1,
            cards: advancedCards,
        };
        const beginnerPlayer = {
            userId: BEGINNER_USER_ID,
            pseudo: "Débutant",
            avatarCardId: 1,
            cards: beginnerCards,
        };

        let advancedThinkMs = 0;
        let advancedDecisions = 0;

        return runInSimulation({ rng: createSeededRng(seed) }, async () => {
            const data: GameData = getDefaultGameData({
                playerOne: advancedGoesFirst ? advancedPlayer : beginnerPlayer,
                playerTwo: advancedGoesFirst ? beginnerPlayer : advancedPlayer,
                isTraining: true,
            });

            const game = createSimulationGame(data);
            const advancedIsPlayerOne = advancedGoesFirst;

            const advanced = advancedIsPlayerOne ? game.data.playerOne : game.data.playerTwo;
            performMulliganOnPlayer(advanced, selectMulliganCardUuids(advanced, profile));
            await finalizeMulligan(game);

            while (!game.isFinished && game.data.currentRound <= MAX_ROUNDS) {
                const activeIsPlayerOne = game.data.state === "PLAYER_ONE_TURN";
                if (
                    game.data.state !== "PLAYER_ONE_TURN" &&
                    game.data.state !== "PLAYER_TWO_TURN"
                ) {
                    break;
                }

                const isAdvancedTurn = activeIsPlayerOne === advancedIsPlayerOne;
                const activeUserId = isAdvancedTurn ? ADVANCED_USER_ID : BEGINNER_USER_ID;

                if (isAdvancedTurn) {
                    const stats = await this.playAdvancedTurn(game, profile, config, seed);
                    advancedThinkMs += stats.thinkMs;
                    advancedDecisions += stats.decisions;
                } else {
                    await this.playBeginnerTurn(game, activeUserId);
                }

                if (game.isFinished) break;

                const activePlayer = activeIsPlayerOne ? game.data.playerOne : game.data.playerTwo;
                await performPassTurn(game, activePlayer);
            }

            return {
                winner: this.resolveWinner(game.data, advancedIsPlayerOne),
                rounds: game.data.currentRound,
                advancedThinkMs,
                advancedDecisions,
            };
        });
    }

    private resolveWinner(data: GameData, advancedIsPlayerOne: boolean): Side | null {
        const advanced = advancedIsPlayerOne ? data.playerOne : data.playerTwo;
        const beginner = advancedIsPlayerOne ? data.playerTwo : data.playerOne;

        if (beginner.health <= 0 && advanced.health > 0) return "ADVANCED";
        if (advanced.health <= 0 && beginner.health > 0) return "BEGINNER";
        return null;
    }

    private async playAdvancedTurn(
        game: ReturnType<typeof createSimulationGame>,
        profile: AiDeckProfile,
        config: AdvancedAiConfig,
        seed: number,
    ): Promise<{ thinkMs: number; decisions: number }> {
        let thinkMs = 0;
        let decisions = 0;

        for (let action = 0; action < MAX_ACTIONS_PER_TURN; action++) {
            if (game.isFinished || game.data.pendingDiscover) break;

            const decision = await decideNextMoves(game.data, {
                aiUserId: ADVANCED_USER_ID,
                profile,
                config,
                seed: seed * 1000 + game.data.currentRound * 100 + action,
            });

            thinkMs += decision.elapsedMs;
            decisions++;

            if (decision.moves.length === 0) break;

            const result = await applyAiMove(game.data, ADVANCED_USER_ID, decision.moves[0]!);
            if (!result.applied) break;

            game.data = result.data;
            if (result.finished) {
                game.isFinished = true;
                break;
            }
        }

        return { thinkMs, decisions };
    }

    private async playBeginnerTurn(
        game: ReturnType<typeof createSimulationGame>,
        aiUserId: number,
    ): Promise<void> {
        // Reproduit la politique de `runAiTurn` : le premier coup légal qui change l'état.
        for (let action = 0; action < MAX_ACTIONS_PER_TURN; action++) {
            if (game.isFinished || game.data.pendingDiscover) break;

            const moves = enumerateAiMoves(game, aiUserId).filter(
                (move) => move.type !== "pass_turn",
            );
            if (moves.length === 0) break;

            let applied = false;
            for (const move of moves) {
                const result = await applyAiMove(game.data, aiUserId, move);
                if (!result.applied) continue;

                game.data = result.data;
                applied = true;

                if (result.finished) {
                    game.isFinished = true;
                }
                break;
            }

            if (!applied || game.isFinished) break;
        }
    }
}
