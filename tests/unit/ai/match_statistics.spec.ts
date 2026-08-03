import { test } from "@japa/runner";
import {
    computeSprt,
    DEFAULT_SPRT,
    gameScore,
    groupIntoObservations,
    scoreConfidenceInterval,
    summarizeMatch,
    type GameResult,
} from "#galaguerre/ai/bench/match_statistics";

/**
 * Ce module est celui qui DÉCIDE si une évolution de l'IA se garde ou se jette. Une erreur y
 * coûte plus cher qu'une erreur dans l'IA elle-même : elle ne rend pas l'IA plus faible, elle
 * rend impossible de savoir qu'elle l'est devenue.
 *
 * Les tests verrouillent donc les trois propriétés dont dépendent les conclusions du banc : un
 * résultat serré ne doit jamais être déclaré significatif, un écart franc doit finir par l'être,
 * et l'appariement doit réellement réduire la variance mesurée.
 */

const repeat = (result: GameResult, times: number): GameResult[] =>
    Array.from({ length: times }, () => result);

/** Alternance stricte : score de 50 %, aucune force à départager. */
const evenMatch = (games: number): GameResult[] =>
    Array.from({ length: games }, (_, index) => (index % 2 === 0 ? "LEFT" : "RIGHT"));

/** Le camp gauche gagne `ratio` des parties, réparties régulièrement. */
const skewedMatch = (games: number, ratio: number): GameResult[] =>
    Array.from({ length: games }, (_, index) => ((index % 100) / 100 < ratio ? "LEFT" : "RIGHT"));

test.group("match statistics | score", () => {
    test("counts a draw as half a point", ({ assert }) => {
        assert.equal(gameScore("LEFT"), 1);
        assert.equal(gameScore("RIGHT"), 0);
        assert.equal(gameScore("DRAW"), 0.5);
    });

    test("a pair counts as one observation worth the mean of its two games", ({ assert }) => {
        const observations = groupIntoObservations(["LEFT", "RIGHT", "LEFT", "LEFT"], true);

        assert.deepEqual(observations, [0.5, 1]);
    });

    test("without pairing every game is its own observation", ({ assert }) => {
        const observations = groupIntoObservations(["LEFT", "RIGHT", "DRAW"], false);

        assert.deepEqual(observations, [1, 0, 0.5]);
    });

    test("an odd trailing game forms its own observation rather than being dropped", ({
        assert,
    }) => {
        const observations = groupIntoObservations(["LEFT", "RIGHT", "LEFT"], true);

        assert.deepEqual(observations, [0.5, 1]);
    });
});

test.group("match statistics | confidence interval", () => {
    test("a dead-even match yields an interval centred on 50%", ({ assert }) => {
        const { low, high } = scoreConfidenceInterval(groupIntoObservations(evenMatch(200), false));

        assert.isBelow(low, 0.5);
        assert.isAbove(high, 0.5);
    });

    test("the interval narrows as games accumulate", ({ assert }) => {
        const short = scoreConfidenceInterval(groupIntoObservations(evenMatch(100), false));
        const long = scoreConfidenceInterval(groupIntoObservations(evenMatch(1000), false));

        assert.isBelow(long.high - long.low, short.high - short.low);
    });

    /**
     * La raison d'être de l'appariement : à parties égales, regrouper deux parties de même graine
     * doit resserrer l'intervalle. Si ce test tombe, le protocole apparié ne rapporte rien.
     */
    test("pairing narrows the interval compared to counting games separately", ({ assert }) => {
        // Chaque paire est un partage : le camp gauche en gagne une et en perd une. Le score reste
        // 50 %, mais la variance PAR OBSERVATION s'effondre — c'est exactement ce que l'appariement
        // capte lorsque les deux parties d'une paire partagent leur mélange de deck.
        const results = evenMatch(400);

        const unpaired = scoreConfidenceInterval(groupIntoObservations(results, false));
        const paired = scoreConfidenceInterval(groupIntoObservations(results, true));

        assert.isBelow(paired.high - paired.low, unpaired.high - unpaired.low);
    });

    test("fewer than two observations proves nothing", ({ assert }) => {
        assert.deepEqual(scoreConfidenceInterval([1]), { low: 0, high: 1 });
    });
});

test.group("match statistics | SPRT", () => {
    test("stays undecided on a dead-even match, however long", ({ assert }) => {
        const sprt = computeSprt(groupIntoObservations(evenMatch(2000), false));

        assert.equal(sprt.verdict, "UNDECIDED");
    });

    test("accepts H1 when one side is clearly stronger", ({ assert }) => {
        const sprt = computeSprt(groupIntoObservations(skewedMatch(1000, 0.6), false));

        assert.equal(sprt.verdict, "H1_ACCEPTED");
        assert.isAbove(sprt.llr, sprt.upperBound);
    });

    test("accepts H0 when the tested side is clearly worse", ({ assert }) => {
        const sprt = computeSprt(groupIntoObservations(skewedMatch(600, 0.4), false));

        assert.equal(sprt.verdict, "H0_ACCEPTED");
        assert.isBelow(sprt.llr, sprt.lowerBound);
    });

    /**
     * Le piège que tout ce module existe pour éviter : 100 parties à 53 % ressemblent à un progrès
     * et n'en sont pas. Le test doit refuser de conclure.
     */
    test("refuses to call a 53% winrate over 100 games a win", ({ assert }) => {
        const results = [...repeat("LEFT", 53), ...repeat("RIGHT", 47)];

        const sprt = computeSprt(groupIntoObservations(results, false));

        assert.equal(sprt.verdict, "UNDECIDED");
    });

    test("a stricter H1 demands more evidence for the same results", ({ assert }) => {
        const observations = groupIntoObservations(skewedMatch(400, 0.55), false);

        const lenient = computeSprt(observations, { ...DEFAULT_SPRT, score1: 0.51 });
        const strict = computeSprt(observations, { ...DEFAULT_SPRT, score1: 0.6 });

        assert.isAbove(lenient.llr, strict.llr);
    });

    test("identical observations cannot decide anything", ({ assert }) => {
        const sprt = computeSprt(groupIntoObservations(repeat("LEFT", 50), false));

        assert.equal(sprt.verdict, "UNDECIDED");
        assert.equal(sprt.llr, 0);
    });
});

test.group("match statistics | summary", () => {
    test("reports wins, losses and draws alongside the verdict", ({ assert }) => {
        const results: GameResult[] = [
            ...repeat("LEFT", 12),
            ...repeat("RIGHT", 6),
            ...repeat("DRAW", 2),
        ];

        const summary = summarizeMatch(results, { paired: false });

        assert.equal(summary.games, 20);
        assert.equal(summary.wins, 12);
        assert.equal(summary.losses, 6);
        assert.equal(summary.draws, 2);
        assert.equal(summary.score, 13 / 20);
        assert.equal(summary.observations, 20);
    });

    test("pairing halves the observation count", ({ assert }) => {
        const summary = summarizeMatch(evenMatch(100), { paired: true });

        assert.equal(summary.games, 100);
        assert.equal(summary.observations, 50);
    });
});
