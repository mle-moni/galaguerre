/**
 * Statistiques d'un match entre deux variantes d'IA.
 *
 * Le piège que ce fichier existe pour éviter : à force égale, 100 parties donnent un écart-type
 * d'environ 5 POINTS de winrate. Un « +3 % » lu sur 100 parties est donc du bruit pur, et une
 * série d'améliorations validées de cette façon fabrique une IA qui n'a jamais progressé. Toute
 * conclusion doit venir d'un intervalle de confiance ou d'un SPRT, jamais du winrate seul.
 *
 * UNITÉ D'OBSERVATION. Quand le banc apparie les parties (même graine, camps échangés), l'unité
 * n'est plus la partie mais la PAIRE, et le score d'une paire vaut la moyenne de ses deux parties.
 * C'est ce qui fait payer l'appariement : les deux parties d'une paire partagent leur mélange de
 * deck, donc une paire annule la chance de pioche au lieu de l'ajouter à la variance. Le modèle
 * est le « pentanomial » utilisé par Fishtest, où une paire vaut 0, 0,25, 0,5, 0,75 ou 1.
 */

/** Issue d'une partie, du point de vue du camp gauche. */
export type GameResult = "LEFT" | "RIGHT" | "DRAW";

/** Score du camp gauche : victoire 1, nulle 0,5, défaite 0. */
export const gameScore = (result: GameResult): number => {
    switch (result) {
        case "LEFT":
            return 1;
        case "RIGHT":
            return 0;
        case "DRAW":
            return 0.5;
    }
};

export interface ConfidenceInterval {
    low: number;
    high: number;
}

/** Quantile normal à 97,5 % : intervalle bilatéral à 95 %. */
const Z_95 = 1.959_963_985;

/**
 * Variance d'échantillon (estimateur de population) des observations. On divise par `n` et non
 * `n - 1` : le SPRT et l'intervalle utilisent tous deux la variance de la LOI, dont c'est
 * l'estimateur du maximum de vraisemblance, et l'écart est négligeable aux tailles visées.
 */
const variance = (observations: number[], mean: number): number => {
    if (observations.length === 0) return 0;

    const total = observations.reduce((sum, value) => sum + (value - mean) ** 2, 0);

    return total / observations.length;
};

const mean = (observations: number[]): number =>
    observations.length === 0
        ? 0
        : observations.reduce((sum, value) => sum + value, 0) / observations.length;

/**
 * Intervalle de confiance à 95 % sur le score moyen.
 *
 * Approximation normale sur la variance OBSERVÉE, et non intervalle binomial : les observations
 * ne sont pas des 0/1 (une nulle vaut 0,5, une paire vaut un quart de point), et c'est justement
 * cette variance réduite que l'appariement fait gagner. Un intervalle binomial l'ignorerait et
 * effacerait tout le bénéfice du protocole.
 */
export const scoreConfidenceInterval = (
    observations: number[],
    z: number = Z_95,
): ConfidenceInterval => {
    const average = mean(observations);

    if (observations.length < 2) return { low: 0, high: 1 };

    const standardError = Math.sqrt(variance(observations, average) / observations.length);
    const margin = z * standardError;

    return {
        low: Math.max(0, average - margin),
        high: Math.min(1, average + margin),
    };
};

export type SprtVerdict =
    /** La variante testée est acceptée comme meilleure : le gain visé est prouvé. */
    | "H1_ACCEPTED"
    /** Le gain visé est écarté : inutile de jouer plus, l'idée ne le vaut pas. */
    | "H0_ACCEPTED"
    /** Les données ne tranchent pas encore : continuer à jouer. */
    | "UNDECIDED";

export interface SprtOptions {
    /** Score sous H0, l'hypothèse « aucun progrès ». Typiquement 0,5. */
    score0: number;
    /** Score sous H1, le gain minimal qu'on juge digne d'être retenu. */
    score1: number;
    /** Risque de première espèce : accepter un faux progrès. */
    alpha: number;
    /** Risque de seconde espèce : rejeter un vrai progrès. */
    beta: number;
}

export interface SprtResult {
    /** Rapport de vraisemblance logarithmique cumulé. */
    llr: number;
    lowerBound: number;
    upperBound: number;
    verdict: SprtVerdict;
}

export const DEFAULT_SPRT: SprtOptions = {
    score0: 0.5,
    // +2 points de winrate : en dessous, un gain ne justifie pas le temps de calcul qu'il demande
    // à prouver, et se perdra de toute façon dans la prochaine retouche d'équilibrage.
    score1: 0.52,
    alpha: 0.05,
    beta: 0.05,
};

/**
 * Test séquentiel du rapport de probabilité (SPRT), variante généralisée à variance estimée.
 *
 * Intérêt sur un nombre de parties fixé d'avance : le test s'arrête DÈS que les données tranchent.
 * Une idée franchement mauvaise est rejetée en une poignée de paires au lieu du millier qu'il
 * faudrait pour prouver un gain de 2 points — et c'est ce qui rend le cycle « une idée, une
 * mesure » praticable sur une seule machine.
 *
 * Le modèle normal donne, pour des observations de moyenne `m` et variance `v` :
 *   LLR = n · (s1 − s0) · (2m − s0 − s1) / (2v)
 * et les bornes de Wald `log(β / (1 − α))` et `log((1 − β) / α)`.
 */
export const computeSprt = (
    observations: number[],
    { score0, score1, alpha, beta }: SprtOptions = DEFAULT_SPRT,
): SprtResult => {
    const lowerBound = Math.log(beta / (1 - alpha));
    const upperBound = Math.log((1 - beta) / alpha);

    const average = mean(observations);
    const observedVariance = variance(observations, average);

    // Aucune variance observée : toutes les paires ont rendu le même score. Le rapport de
    // vraisemblance n'est pas défini, et deux paires identiques ne prouvent de toute façon rien.
    if (observations.length < 2 || observedVariance <= 0) {
        return { llr: 0, lowerBound, upperBound, verdict: "UNDECIDED" };
    }

    const llr =
        (observations.length * (score1 - score0) * (2 * average - score0 - score1)) /
        (2 * observedVariance);

    return {
        llr,
        lowerBound,
        upperBound,
        verdict:
            llr >= upperBound ? "H1_ACCEPTED" : llr <= lowerBound ? "H0_ACCEPTED" : "UNDECIDED",
    };
};

export interface MatchSummary {
    games: number;
    wins: number;
    losses: number;
    draws: number;
    /** Score moyen du camp gauche par PARTIE, nulles comptées pour moitié. */
    score: number;
    /** Nombre d'observations indépendantes : des paires si l'appariement est actif. */
    observations: number;
    /** Intervalle de confiance à 95 % sur `score`, calculé sur les observations. */
    interval: ConfidenceInterval;
    sprt: SprtResult;
}

/**
 * Découpe les parties en observations indépendantes.
 *
 * Sans appariement, chaque partie en est une. Avec, les parties arrivent par deux (même graine,
 * camps échangés) et la paire compte pour une seule observation valant la moyenne des deux —
 * c'est le regroupement qui rend l'appariement statistiquement valide. Une partie orpheline en fin
 * de série (série interrompue) forme sa propre observation plutôt que d'être jetée.
 */
export const groupIntoObservations = (results: GameResult[], paired: boolean): number[] => {
    const scores = results.map(gameScore);

    if (!paired) return scores;

    const observations: number[] = [];

    for (let index = 0; index < scores.length; index += 2) {
        const pair = scores.slice(index, index + 2);
        observations.push(pair.reduce((sum, value) => sum + value, 0) / pair.length);
    }

    return observations;
};

export const summarizeMatch = (
    results: GameResult[],
    { paired, sprt = DEFAULT_SPRT }: { paired: boolean; sprt?: SprtOptions },
): MatchSummary => {
    const observations = groupIntoObservations(results, paired);
    const scores = results.map(gameScore);

    return {
        games: results.length,
        wins: results.filter((result) => result === "LEFT").length,
        losses: results.filter((result) => result === "RIGHT").length,
        draws: results.filter((result) => result === "DRAW").length,
        score: mean(scores),
        observations: observations.length,
        interval: scoreConfidenceInterval(observations),
        sprt: computeSprt(observations, sprt),
    };
};
