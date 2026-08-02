import {
    DEFAULT_HERO_HEALTH,
    type AiDeckProfile,
    type GameData,
    type GamePlayer,
    type MinionState,
} from "#api_types/game.types";
import {
    getMinionHasCharge,
    getMinionHasRush,
    getMinionHasTaunt,
    getMinionHasWindfury,
    getMinionIsPoisonous,
} from "#controllers/games/game_utils";
import { getMinionHasStealth } from "#api_types/target_matching";

/**
 * Score d'un état de partie du point de vue de l'IA. Plus c'est haut, mieux c'est pour elle.
 *
 * RÈGLE D'ÉQUITÉ : cette fonction ne lit JAMAIS le contenu de la main ni du deck adverse — l'IA
 * n'a pas le droit de tricher alors que `GameData` contient l'information complète. Seules les
 * TAILLES (`hand.length`, `deckCards.length`) sont utilisées, exactement comme un joueur humain
 * qui voit le nombre de cartes en main de son adversaire.
 */

/** Score attribué à une victoire : domine toute autre considération. */
export const WIN_SCORE = 1_000_000;

export interface EvaluationWeights {
    /** Valeur d'un PV du héros de l'IA. */
    ownHeroHealth: number;
    /** Valeur d'un PV retiré au héros adverse. */
    enemyHeroDamage: number;
    /** Pénalité supplémentaire par PV manquant sous le seuil de danger. */
    ownLowHealthPenalty: number;
    /** Valeur d'une carte en main. */
    handCard: number;
    /** Valeur d'une carte restante dans le deck (anti-fatigue). */
    deckCard: number;
    /** Multiplicateur global de la valeur du plateau. */
    board: number;
    /** Pénalité par cristal de mana non dépensé. */
    unspentMana: number;
}

/** Aggro Pets : la course aux PV adverses prime, ses propres PV comptent peu. */
export const AGGRO_WEIGHTS: EvaluationWeights = {
    ownHeroHealth: 0.15,
    enemyHeroDamage: 0.85,
    ownLowHealthPenalty: 0.5,
    handCard: 1.2,
    deckCard: 0.1,
    board: 1,
    unspentMana: 0.45,
};

/** Mid-range : contrôle du plateau et avantage de cartes priment sur la course. */
export const MIDRANGE_WEIGHTS: EvaluationWeights = {
    ownHeroHealth: 0.35,
    enemyHeroDamage: 0.4,
    ownLowHealthPenalty: 0.9,
    handCard: 1.8,
    deckCard: 0.2,
    board: 1.15,
    unspentMana: 0.3,
};

/** En dessous de ce seuil, chaque PV manquant coûte nettement plus cher. */
const DANGER_HEALTH_THRESHOLD = 12;

export const getWeightsForProfile = (profile: AiDeckProfile | undefined): EvaluationWeights =>
    profile === "AGGRO" ? AGGRO_WEIGHTS : MIDRANGE_WEIGHTS;

const countMinionPassives = (minion: MinionState): number => {
    const card = minion.originalCard;
    if (card.type !== "MINION") return 0;

    return (card.passives?.length ?? 0) + (card.deathrattleActions?.length ?? 0);
};

/**
 * Valeur d'un monstre sur le plateau : sa « surface de jeu », pas juste ses stats brutes.
 * Le terme `min(attack, health)` récompense les statlines équilibrées, qui échangent mieux
 * qu'un 6/1 ou un 0/6.
 */
export const evaluateMinion = (minion: MinionState): number => {
    if (minion.health <= 0) return 0;

    const attack = Math.max(0, minion.attack);
    const health = minion.health;

    let value = attack + health + 0.5 * Math.min(attack, health);

    if (getMinionHasTaunt(minion)) value += 0.4 * health + 0.5;
    if (
        minion.originalCard.type === "MINION" &&
        minion.originalCard.minionPowers?.hasDivineShield
    ) {
        value += 1.5 + 0.3 * attack;
    }
    if (getMinionIsPoisonous(minion)) value += 2;
    if (getMinionHasWindfury(minion)) value += 0.6 * attack;
    if (getMinionHasStealth(minion)) value += 0.6;
    if (getMinionHasCharge(minion) || getMinionHasRush(minion)) value += 0.4;

    value += 0.8 * countMinionPassives(minion);

    return value;
};

const evaluateBoard = (board: GamePlayer["board"]): number =>
    board.reduce((total, minion) => total + evaluateMinion(minion), 0);

const evaluateWeapon = (player: GamePlayer): number => {
    const weapon = player.weaponState;
    if (!weapon || weapon.durability <= 0) return 0;

    return 0.6 * weapon.damage * weapon.durability;
};

const evaluateHeroHealth = (health: number, weights: EvaluationWeights): number => {
    const safeHealth = Math.max(0, health);
    const missingUnderThreshold = Math.max(0, DANGER_HEALTH_THRESHOLD - safeHealth);

    return weights.ownHeroHealth * safeHealth - weights.ownLowHealthPenalty * missingUnderThreshold;
};

export interface EvaluateOptions {
    /**
     * `true` quand l'état évalué correspond à une fin de tour : le mana encore disponible est
     * alors du tempo définitivement perdu.
     */
    isEndOfTurn?: boolean;
}

export const evaluateGameState = (
    data: GameData,
    aiUserId: number,
    weights: EvaluationWeights,
    { isEndOfTurn = false }: EvaluateOptions = {},
): number => {
    const ai = data.playerOne.userId === aiUserId ? data.playerOne : data.playerTwo;
    const enemy = data.playerOne.userId === aiUserId ? data.playerTwo : data.playerOne;

    if (enemy.health <= 0 && ai.health > 0) return WIN_SCORE;
    if (ai.health <= 0) return -WIN_SCORE;

    let score = 0;

    score += weights.board * (evaluateBoard(ai.board) - evaluateBoard(enemy.board));
    score += weights.board * (evaluateWeapon(ai) - evaluateWeapon(enemy));

    score += evaluateHeroHealth(ai.health, weights);
    score += weights.enemyHeroDamage * (DEFAULT_HERO_HEALTH - Math.max(0, enemy.health));

    // Uniquement des TAILLES côté adverse : voir la règle d'équité en tête de fichier.
    score += weights.handCard * (ai.hand.length - enemy.hand.length);
    score += weights.deckCard * (ai.deckCards.length - enemy.deckCards.length);

    score += 0.7 * (ai.spellPower - enemy.spellPower);
    score += 0.4 * (ai.nextSpellCostReduction ?? 0);

    if (isEndOfTurn) {
        score -= weights.unspentMana * ai.mana;
    }

    return score;
};
