import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { BaseCommand, flags } from "@adonisjs/core/ace";
import type { AiDeckProfile } from "#api_types/game.types";
import { ADVANCED_AI_DECKS } from "#database/seed_data/ai_decks";
import { TRAINING_BOT_DECK_RECIPE } from "#database/seed_data/training_bot_deck";
import type { DeckRecipeEntry } from "#database/seed_data/balanced_decks";
import {
    AI_VARIANT_NAMES,
    AI_VARIANTS,
    parseConfigOverrides,
    resolveAiVariant,
    type ResolvedAiVariant,
} from "#galaguerre/ai/advanced/ai_variants";
import {
    createExpertTraceTotals,
    mergeExpertTraceTotals,
    playBenchGame,
    LEFT_USER_ID,
    RIGHT_USER_ID,
    type Contender,
    type ExpertTraceTotals,
} from "#galaguerre/ai/bench/play_bench_game";
import {
    DEFAULT_SPRT,
    summarizeMatch,
    type GameResult,
    type MatchSummary,
} from "#galaguerre/ai/bench/match_statistics";

/**
 * Banc d'essai : fait s'affronter deux VARIANTES d'IA entièrement en simulation (aucune écriture
 * en base) et dit, avec un test statistique, si l'une est vraiment plus forte que l'autre.
 *
 *   node ace dev:bench-ai --left=expert --right=expert-deep-reply-lethal --games=400 --workers=8
 *   node ace dev:bench-ai --left=expert --right=expert --left-set=replyCandidates=8 --games=600
 *   node ace dev:bench-ai --left=expert --right=advanced --games=100
 *
 * Trois choix de protocole font toute la valeur de la mesure, et les défaire vide le banc de son
 * sens :
 *
 * 1. APPARIEMENT (`--paired`). Chaque graine est jouée DEUX fois, camps échangés : les deux
 *    variantes reçoivent tour à tour le même ordre de pioche. La chance de tirage s'annule dans la
 *    paire au lieu de s'ajouter à la variance, ce qui vaut deux à trois fois plus de parties pour
 *    le même temps de calcul.
 *
 * 2. BUDGET EN NŒUDS (`--deterministic`). La recherche s'arrête sur son plafond de nœuds et non
 *    sur l'horloge. Deux exécutions d'une même graine jouent alors exactement la même partie, quelle
 *    que soit la charge de la machine — et l'écart mesuré est un écart de POLITIQUE, pas de vitesse
 *    d'exécution. Utiliser `--no-deterministic --think-ms=...` pour poser l'autre question, celle
 *    de la rentabilité à budget-temps de production.
 *
 *    Cette reproductibilité a coûté une correction et mérite d'être re-vérifiée : les UUID
 *    d'entités de jeu passent par `gameEntityUuid`, adossé au PRNG seedé en simulation, PARCE QUE
 *    `deriveSeed` les hache pour fabriquer la graine de chaque branche. Avec `randomUUID`, deux
 *    exécutions d'une même graine jouaient des parties DIFFÉRENTES — le banc comparait alors le
 *    hasard des UUID autant que les variantes. Toute nouvelle source d'aléatoire non seedée dans
 *    l'état de jeu ramènerait le problème. Pour re-vérifier :
 *
 *      for i in a b; do node ace dev:bench-ai --games=8 --workers=4 --no-sprt > run$i.log 2>&1; done
 *      diff <(grep -v latence runa.log) <(grep -v latence runb.log)
 *
 *    Comparer les COMPTEURS (tours moyens, décisions, ripostes), pas seulement le score : deux
 *    séries de parties différentes peuvent rendre le même nombre de victoires par coïncidence.
 *
 * 3. TEST SÉQUENTIEL (`--sprt`). À force égale, 100 parties ont un écart-type de ~5 points de
 *    winrate : sans test, on valide du bruit. Le SPRT s'arrête dès que les données tranchent, dans
 *    un sens comme dans l'autre.
 *
 * `--mirror` (par défaut) donne le MÊME deck aux deux camps : sans lui, un écart de winrate peut
 * n'être qu'un écart de liste.
 */

const execFileAsync = promisify(execFile);

/** Préfixe de la ligne de résultat d'un processus ouvrier, pour la retrouver parmi les logs. */
const SHARD_RESULT_MARKER = "__BENCH_SHARD__";

/** Paires confiées à chaque ouvrier par lot. Assez pour amortir le démarrage d'un processus. */
const PAIRS_PER_WORKER_BATCH = 3;

/** Résultat sérialisé d'un ouvrier. Les parties restent ORDONNÉES : l'appariement en dépend. */
interface ShardPayload {
    results: GameResult[];
    rounds: number[];
    leftDecisionMs: number[];
    rightDecisionMs: number[];
    leftTrace: ExpertTraceTotals;
    rightTrace: ExpertTraceTotals;
}

const emptyPayload = (): ShardPayload => ({
    results: [],
    rounds: [],
    leftDecisionMs: [],
    rightDecisionMs: [],
    leftTrace: createExpertTraceTotals(),
    rightTrace: createExpertTraceTotals(),
});

const mergePayloads = (into: ShardPayload, from: ShardPayload): ShardPayload => ({
    results: [...into.results, ...from.results],
    rounds: [...into.rounds, ...from.rounds],
    leftDecisionMs: [...into.leftDecisionMs, ...from.leftDecisionMs],
    rightDecisionMs: [...into.rightDecisionMs, ...from.rightDecisionMs],
    leftTrace: mergeExpertTraceTotals(into.leftTrace, from.leftTrace),
    rightTrace: mergeExpertTraceTotals(into.rightTrace, from.rightTrace),
});

const percentile = (values: number[], ratio: number): number => {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);

    return sorted[Math.min(sorted.length - 1, Math.floor(ratio * sorted.length))]!;
};

const percent = (value: number): string => `${(value * 100).toFixed(1)} %`;

export default class BenchAi extends BaseCommand {
    static commandName = "dev:bench-ai";
    static description = "Oppose deux variantes d'IA et dit si l'écart de force est significatif";
    static options = { startApp: true };

    @flags.number({ description: "Nombre de parties à jouer", default: 200 })
    declare games: number;

    @flags.string({
        description: `Variante du camp gauche (${AI_VARIANT_NAMES.join(" | ")} ou une difficulté)`,
        default: "expert",
    })
    declare left: string;

    @flags.string({
        description: "Variante du camp droit",
        default: "advanced",
    })
    declare right: string;

    @flags.string({
        description: "Surcharges du camp gauche, ex. replyCandidates=8,replyBeamWidth=5",
    })
    declare leftSet?: string;

    @flags.string({ description: "Surcharges du camp droit" })
    declare rightSet?: string;

    @flags.boolean({
        description: "Jouer chaque graine deux fois, camps échangés (réduit fortement la variance)",
        default: true,
        showNegatedVariantInHelp: true,
    })
    declare paired: boolean;

    @flags.boolean({
        description: "Borner la recherche en nœuds et non à l'horloge (parties reproductibles)",
        default: true,
        showNegatedVariantInHelp: true,
    })
    declare deterministic: boolean;

    @flags.boolean({
        description: "Donner le même deck aux deux camps",
        default: true,
        showNegatedVariantInHelp: true,
    })
    declare mirror: boolean;

    @flags.boolean({
        description: "Arrêter dès que le test séquentiel tranche",
        default: true,
        showNegatedVariantInHelp: true,
    })
    declare sprt: boolean;

    @flags.number({
        description: "Gain minimal jugé digne d'être retenu, en points de winrate",
        default: 2,
    })
    declare sprtDelta: number;

    @flags.number({
        description: "Budget de réflexion par action en ms (ignoré en mode déterministe)",
        default: 0,
    })
    declare thinkMs: number;

    @flags.string({ description: "Forcer le profil de deck : AGGRO ou MIDRANGE" })
    declare profile?: string;

    @flags.number({ description: "Nombre de processus jouant en parallèle", default: 1 })
    declare workers: number;

    @flags.number({ description: "Interne : index de la première paire de ce lot", default: -1 })
    declare shardOffset: number;

    @flags.number({ description: "Interne : nombre de paires à jouer dans ce lot", default: 0 })
    declare shardPairs: number;

    async run() {
        let left: ResolvedAiVariant;
        let right: ResolvedAiVariant;

        try {
            left = resolveAiVariant(this.left, parseConfigOverrides(this.leftSet));
            right = resolveAiVariant(this.right, parseConfigOverrides(this.rightSet));
        } catch (error) {
            this.logger.error(error instanceof Error ? error.message : String(error));
            this.exitCode = 1;
            return;
        }

        const decks = this.profile
            ? ADVANCED_AI_DECKS.filter(({ profile }) => profile === this.profile)
            : ADVANCED_AI_DECKS;

        if (decks.length === 0) {
            this.logger.error(`Profil inconnu « ${this.profile} » (attendu : AGGRO ou MIDRANGE)`);
            this.exitCode = 1;
            return;
        }

        if (this.isShard) {
            await this.runShard(left, right, decks);
            return;
        }

        await this.runMatch(left, right, decks);
    }

    private get isShard(): boolean {
        return this.shardOffset >= 0 && this.shardPairs > 0;
    }

    /** Parties d'une paire : deux quand l'appariement est actif (camps échangés), sinon une. */
    private get gamesPerPair(): number {
        return this.paired ? 2 : 1;
    }

    private get sprtOptions() {
        return { ...DEFAULT_SPRT, score1: 0.5 + this.sprtDelta / 100 };
    }

    // ---------------------------------------------------------------- match

    private async runMatch(
        left: ResolvedAiVariant,
        right: ResolvedAiVariant,
        decks: typeof ADVANCED_AI_DECKS,
    ): Promise<void> {
        const totalPairs = Math.ceil(this.games / this.gamesPerPair);

        this.announce(left, right, totalPairs);

        let played = emptyPayload();
        let pairsDone = 0;

        while (pairsDone < totalPairs) {
            const batchPairs = Math.min(
                totalPairs - pairsDone,
                Math.max(1, this.workers) * PAIRS_PER_WORKER_BATCH,
            );

            const batch =
                this.workers > 1
                    ? await this.runBatchInWorkers(pairsDone, batchPairs)
                    : await this.playPairs(left, right, decks, pairsDone, batchPairs);

            played = mergePayloads(played, batch);
            pairsDone += batchPairs;

            const summary = summarizeMatch(played.results, {
                paired: this.paired,
                sprt: this.sprtOptions,
            });

            this.logger.info(
                `${played.results.length}/${this.games} parties — score gauche ${percent(summary.score)} ` +
                    `— LLR ${summary.sprt.llr.toFixed(2)}`,
            );

            if (this.sprt && summary.sprt.verdict !== "UNDECIDED") {
                this.logger.info("Le test séquentiel a tranché : arrêt anticipé.");
                break;
            }
        }

        this.report(left, right, played);
    }

    private announce(left: ResolvedAiVariant, right: ResolvedAiVariant, totalPairs: number): void {
        const protocol = [
            this.paired
                ? `${totalPairs} paires (${totalPairs * 2} parties)`
                : `${this.games} parties`,
            this.deterministic ? "budget en nœuds" : `budget ${this.thinkMs || "par défaut"} ms`,
            this.mirror ? "decks miroir" : "decks distincts",
        ].join(", ");

        this.logger.info(`Match : ${left.name} (gauche) contre ${right.name} (droite)`);
        this.logger.info(`Protocole : ${protocol}`);

        for (const variant of [left, right]) {
            const known = AI_VARIANTS[variant.name as keyof typeof AI_VARIANTS];
            if (known) this.logger.info(`  ${variant.name} — ${known.description}`);
        }

        if (!this.mirror && left.difficulty !== "BEGINNER" && right.difficulty !== "BEGINNER") {
            this.logger.warning(
                "Sans --mirror, les deux camps jouent des decks différents : l'écart mesuré " +
                    "mélange la force de l'IA et celle de sa liste.",
            );
        }

        this.logger.info("");
    }

    // ---------------------------------------------------------- exécution

    /** Joue `count` paires à partir de `offset`, dans ce processus. */
    private async playPairs(
        left: ResolvedAiVariant,
        right: ResolvedAiVariant,
        decks: typeof ADVANCED_AI_DECKS,
        offset: number,
        count: number,
    ): Promise<ShardPayload> {
        const payload = emptyPayload();

        for (let index = offset; index < offset + count; index++) {
            const deck = decks[index % decks.length]!;
            const leftContender = this.buildContender(left, LEFT_USER_ID, deck);
            const rightContender = this.buildContender(
                right,
                RIGHT_USER_ID,
                // En miroir, le camp droit reprend exactement le deck du camp gauche.
                this.mirror
                    ? { profile: leftContender.profile, recipe: leftContender.recipe }
                    : deck,
            );

            // Les deux parties de la paire partagent leur graine : seul le siège change, donc les
            // deux variantes jouent tour à tour le même ordre de pioche.
            for (let game = 0; game < this.gamesPerPair; game++) {
                const outcome = await playBenchGame({
                    left: leftContender,
                    right: rightContender,
                    leftGoesFirst: game === 0,
                    seed: index + 1,
                    deterministic: this.deterministic,
                    thinkMs: this.thinkMs,
                });

                payload.results.push(outcome.result);
                payload.rounds.push(outcome.rounds);
                payload.leftDecisionMs.push(...outcome.leftDecisionMs);
                payload.rightDecisionMs.push(...outcome.rightDecisionMs);
                payload.leftTrace = mergeExpertTraceTotals(payload.leftTrace, outcome.leftTrace);
                payload.rightTrace = mergeExpertTraceTotals(payload.rightTrace, outcome.rightTrace);
            }
        }

        return payload;
    }

    /**
     * Distribue un lot de paires sur `workers` processus.
     *
     * Des processus et non des fils d'exécution : la recherche est purement synchrone et gourmande
     * en CPU, et chaque ouvrier a besoin de son propre conteneur AdonisJS. Les lots restent
     * concaténés dans l'ORDRE des paires — l'appariement statistique en dépend.
     */
    private async runBatchInWorkers(offset: number, count: number): Promise<ShardPayload> {
        const workers = Math.max(1, this.workers);
        const perWorker = Math.ceil(count / workers);

        const shards: { offset: number; pairs: number }[] = [];

        for (let start = offset; start < offset + count; start += perWorker) {
            shards.push({
                offset: start,
                pairs: Math.min(perWorker, offset + count - start),
            });
        }

        const payloads = await Promise.all(shards.map((shard) => this.runWorker(shard)));

        return payloads.reduce(mergePayloads, emptyPayload());
    }

    private async runWorker({
        offset,
        pairs,
    }: {
        offset: number;
        pairs: number;
    }): Promise<ShardPayload> {
        const args = [
            process.argv[1] ?? "ace.js",
            "dev:bench-ai",
            `--left=${this.left}`,
            `--right=${this.right}`,
            `--games=${this.games}`,
            `--think-ms=${this.thinkMs}`,
            `--shard-offset=${offset}`,
            `--shard-pairs=${pairs}`,
            this.paired ? "--paired" : "--no-paired",
            this.deterministic ? "--deterministic" : "--no-deterministic",
            this.mirror ? "--mirror" : "--no-mirror",
        ];

        if (this.leftSet) args.push(`--left-set=${this.leftSet}`);
        if (this.rightSet) args.push(`--right-set=${this.rightSet}`);
        if (this.profile) args.push(`--profile=${this.profile}`);

        // Pas de délai : une recherche peut légitimement tenir plusieurs minutes sur un lot.
        const { stdout } = await execFileAsync(process.execPath, args, {
            cwd: process.cwd(),
            maxBuffer: 64 * 1024 * 1024,
            timeout: 0,
        });

        const line = stdout
            .split("\n")
            .find((candidate) => candidate.startsWith(SHARD_RESULT_MARKER));

        if (!line) {
            throw new Error(
                `L'ouvrier (paires ${offset}..${offset + pairs - 1}) n'a rien rendu. Sortie :\n${stdout}`,
            );
        }

        return JSON.parse(line.slice(SHARD_RESULT_MARKER.length)) as ShardPayload;
    }

    /** Mode ouvrier : joue son lot et rend son résultat sur une ligne balisée. */
    private async runShard(
        left: ResolvedAiVariant,
        right: ResolvedAiVariant,
        decks: typeof ADVANCED_AI_DECKS,
    ): Promise<void> {
        const payload = await this.playPairs(left, right, decks, this.shardOffset, this.shardPairs);

        process.stdout.write(`${SHARD_RESULT_MARKER}${JSON.stringify(payload)}\n`);
    }

    /** Le Débutant garde son deck historique ; les IA à recherche prennent un deck d'IA. */
    private buildContender(
        variant: ResolvedAiVariant,
        userId: number,
        deck: { profile: AiDeckProfile; recipe: DeckRecipeEntry[] },
    ): Contender {
        if (variant.difficulty === "BEGINNER") {
            return { variant, userId, profile: "MIDRANGE", recipe: TRAINING_BOT_DECK_RECIPE };
        }

        return { variant, userId, profile: deck.profile, recipe: deck.recipe };
    }

    // --------------------------------------------------------------- rapport

    private report(left: ResolvedAiVariant, right: ResolvedAiVariant, played: ShardPayload): void {
        const summary = summarizeMatch(played.results, {
            paired: this.paired,
            sprt: this.sprtOptions,
        });

        const avgRounds =
            played.rounds.reduce((sum, value) => sum + value, 0) / (played.rounds.length || 1);

        this.logger.info("");
        this.logger.info(`${left.name} (gauche) : ${summary.wins} victoires`);
        this.logger.info(`${right.name} (droite) : ${summary.losses} victoires`);
        this.logger.info(`nulles / plafond de tours : ${summary.draws}`);
        this.logger.info(`tours moyens : ${avgRounds.toFixed(1)}`);
        this.logger.info("");

        this.reportVerdict(summary);

        this.logger.info("");
        this.logger.info(this.formatLatency(`${left.name} (gauche)`, played.leftDecisionMs));
        this.logger.info(this.formatLatency(`${right.name} (droite)`, played.rightDecisionMs));

        this.reportExpertTrace(left, "gauche", played.leftTrace);
        this.reportExpertTrace(right, "droite", played.rightTrace);
    }

    private reportVerdict(summary: MatchSummary): void {
        const { interval, sprt } = summary;

        this.logger.info(
            `score gauche : ${percent(summary.score)} ` +
                `(IC 95 % : ${percent(interval.low)} – ${percent(interval.high)}, ` +
                `sur ${summary.observations} observations)`,
        );

        // Un intervalle qui contient 50 % est le cas le plus fréquent et le plus mal lu : on le
        // dit en toutes lettres plutôt que de laisser interpréter un winrate flatteur.
        if (interval.low <= 0.5 && interval.high >= 0.5) {
            this.logger.info(
                "  → l'intervalle contient 50 % : aucun écart de force n'est démontré.",
            );
        }

        this.logger.info(
            `SPRT (H0 50 % / H1 ${percent(this.sprtOptions.score1)}) : ` +
                `LLR ${sprt.llr.toFixed(2)} dans [${sprt.lowerBound.toFixed(2)} ; ${sprt.upperBound.toFixed(2)}]`,
        );

        const verdicts: Record<typeof sprt.verdict, string> = {
            H1_ACCEPTED: `  → le camp gauche est plus fort d'au moins ${this.sprtDelta} points. Le changement se garde.`,
            H0_ACCEPTED: `  → le gain de ${this.sprtDelta} points est écarté. Le changement ne se garde pas.`,
            UNDECIDED: "  → indécis : il faut plus de parties pour trancher.",
        };

        this.logger.info(verdicts[sprt.verdict]);
    }

    private formatLatency(label: string, samples: number[]): string {
        if (samples.length === 0) return `${label} latence : n/a`;

        const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;

        return (
            `${label} latence : moyenne ${mean.toFixed(0)} ms, ` +
            `p50 ${percentile(samples, 0.5).toFixed(0)} ms, ` +
            `p95 ${percentile(samples, 0.95).toFixed(0)} ms ` +
            `(${samples.length} décisions)`
        );
    }

    /**
     * Le chiffre qui commande tous les autres : la part des décisions où le pli de riposte a
     * réellement tranché. Basse, elle veut dire que l'« Expert » joue en Avancé la plupart du
     * temps — et alors aucun réglage `reply*` ne peut se mesurer tant qu'elle n'est pas remontée.
     */
    private reportExpertTrace(
        variant: ResolvedAiVariant,
        side: string,
        totals: ExpertTraceTotals,
    ): void {
        // Seule l'IA Expert a un pli de riposte : pour les autres, le bloc n'afficherait que des
        // zéros et laisserait croire à un repli permanent.
        if (variant.difficulty !== "EXPERT") return;

        // `NOTHING_TO_PLAY` sort du dénominateur : c'est la décision de fin de tour, une par tour
        // joué, où il n'y a par construction rien à départager. La compter diluait toutes les
        // parts d'environ un quart et faisait passer le pli de riposte pour bien plus souvent en
        // échec qu'il ne l'est.
        const searched =
            totals.decisions - totals.lethalDecisions - totals.fallbacks.NOTHING_TO_PLAY;
        if (searched === 0) return;

        const share = (value: number): string => percent(value / searched);

        this.logger.info("");
        this.logger.info(`Pli de riposte — ${variant.name} (${side}) :`);
        this.logger.info(
            `  décisions : ${totals.decisions} ` +
                `(${totals.lethalDecisions} létales, ${totals.fallbacks.NOTHING_TO_PLAY} fins de tour)`,
        );
        this.logger.info(`  décisions à départager : ${searched}`);
        this.logger.info(`  départagées par la riposte : ${share(totals.decidedByReply)}`);
        this.logger.info(
            `  repli, une seule ligne candidate : ${share(totals.fallbacks.SINGLE_CANDIDATE)}`,
        );
        this.logger.info(
            `  repli, aucune riposte complète : ${share(totals.fallbacks.NO_COMPLETE_REPLY)}`,
        );
        const ranked = share(totals.incompleteRankingChangedChoice);

        this.logger.info(`  dont départagées entre incomplètes : ${ranked}`);
        const replies = `${totals.repliesScored} / ${totals.repliesIncomplete} / ${totals.repliesSkipped}`;

        this.logger.info(`  ripostes notées / tronquées / sautées : ${replies}`);
        this.logger.info(
            `  létal adverse détecté sur ${share(totals.sawOpponentLethal)} des tours`,
        );
        this.logger.info(
            `  létal propre au tour suivant sur ${share(totals.sawOwnLethal)} des tours`,
        );
        this.logger.info(
            `  dont la prime a déplacé le choix : ${share(totals.ownLethalChangedChoice)}`,
        );
    }
}
