import {
    DEFAULT_HERO_HEALTH,
    type AiDeckProfile,
    type GameData,
    type GamePlayer,
    type MinionState,
    type PlayerCard,
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
 * RÈGLE D'ÉQUITÉ (défaut, `omniscient: false`) : cette fonction ne lit JAMAIS le contenu de la
 * main ni du deck adverse. Seules les TAILLES (`hand.length`, `deckCards.length`) sont utilisées,
 * exactement comme un joueur humain qui voit le nombre de cartes en main de son adversaire.
 * C'est le régime des IA Débutant et Avancé.
 *
 * L'IA EXPERT assume l'inverse : appelée avec `omniscient: true`, elle lit le contenu réel des
 * deux mains. C'est un choix de conception revendiqué (« robot omniscient »), pas un oubli.
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

/**
 * Valeur d'une carte en main RELATIVE à une carte moyenne : positive pour une bombe, négative
 * pour une carte faible ou injouable avant longtemps. Centrée pour que le terme de qualité de
 * main s'annule entre deux mains banales et ne vienne pas concurrencer le plateau.
 *
 * N'a de sens que sous `omniscient` : sans ça, l'IA n'a pas le droit de regarder ces cartes.
 */
const AVERAGE_CARD_RAW_VALUE = 3.4;

const rawCardValue = (card: PlayerCard): number => {
    let raw = 0.55 * card.cost;

    if (card.type === "MINION") {
        raw += 0.2 * (card.attack + card.health);
        raw +=
            0.45 *
            (card.battlecryActions.length + card.passives.length + card.deathrattleActions.length);
    } else if (card.type === "SPELL") {
        raw += 0.7 * card.spellActions.length;
    } else {
        raw += 0.2 * card.damage * card.durability;
    }

    return raw;
};

const evaluateHandQuality = (hand: readonly PlayerCard[]): number =>
    hand.reduce((total, card) => total + (rawCardValue(card) - AVERAGE_CARD_RAW_VALUE), 0);

/** Poids délibérément faible : la vraie lecture de la main adverse se fait par simulation. */
const HAND_QUALITY_WEIGHT = 0.25;

export interface EvaluateOptions {
    /**
     * `true` quand l'état évalué correspond à une fin de tour : le mana encore disponible est
     * alors du tempo définitivement perdu.
     */
    isEndOfTurn?: boolean;
    /**
     * `true` pour l'IA Expert uniquement : autorise la lecture du contenu de la main adverse.
     * Voir la règle d'équité en tête de fichier.
     */
    omniscient?: boolean;
}

export const evaluateGameState = (
    data: GameData,
    aiUserId: number,
    weights: EvaluationWeights,
    { isEndOfTurn = false, omniscient = false }: EvaluateOptions = {},
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

    if (omniscient) {
        // Deux mains de même taille ne se valent pas : l'Expert le sait, il les a vues.
        score +=
            HAND_QUALITY_WEIGHT * (evaluateHandQuality(ai.hand) - evaluateHandQuality(enemy.hand));
    }

    score += 0.7 * (ai.spellPower - enemy.spellPower);
    score += 0.4 * (ai.nextSpellCostReduction ?? 0);

    if (isEndOfTurn) {
        score -= weights.unspentMana * ai.mana;
    }

    return score;
};
