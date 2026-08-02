import type { AiDeckProfile, GamePlayer, PlayerCard } from "#api_types/game.types";

/**
 * Mulligan des IA à recherche : elles rejettent ce qu'elles ne pourront pas jouer tôt.
 *
 * L'IA débutante garde systématiquement toute sa main de départ, ce qui lui coûte des parties
 * dès qu'elle pioche deux cartes chères.
 *
 * L'IA Expert reçoit en plus l'adversaire complet (main + deck) : elle mesure la vitesse réelle
 * du deck d'en face et accorde sa propre courbe dessus. Face à une liste rapide, garder une carte
 * à 4 mana revient à mourir avec en main.
 */

/** Coût maximum conservé, par archétype. */
const MAX_KEPT_COST: Record<AiDeckProfile, number> = {
    AGGRO: 3,
    MIDRANGE: 4,
};

/**
 * L'aggro a besoin d'une courbe très basse : au-delà de ce nombre de cartes à coût élevé, on
 * rejette les plus chères même si elles passent le seuil.
 */
const MAX_EXPENSIVE_KEPT = 2;

/** En dessous de ce coût moyen, le deck d'en face est une liste rapide qu'il faut devancer. */
const FAST_DECK_AVERAGE_COST = 2.8;

/** Au-dessus, c'est une liste lente : on peut se permettre de garder une carte de plus. */
const SLOW_DECK_AVERAGE_COST = 3.8;

const isExpensive = (card: PlayerCard, maxCost: number): boolean => card.cost > maxCost - 1;

const averageCardCost = (cards: readonly PlayerCard[]): number | null => {
    if (cards.length === 0) return null;

    return cards.reduce((total, card) => total + card.cost, 0) / cards.length;
};

/**
 * Ajustement du seuil de conservation en fonction de la vitesse du deck adverse.
 * `null` quand l'IA n'a pas le droit de regarder (Avancé) : le seuil reste celui de l'archétype.
 */
const adjustMaxKeptCost = (maxCost: number, opponent: GamePlayer | undefined): number => {
    if (!opponent) return maxCost;

    const average = averageCardCost([...opponent.hand, ...opponent.deckCards]);
    if (average === null) return maxCost;

    if (average <= FAST_DECK_AVERAGE_COST) return maxCost - 1;
    if (average >= SLOW_DECK_AVERAGE_COST) return maxCost + 1;

    return maxCost;
};

export interface MulliganOptions {
    /**
     * Adversaire complet, main et deck compris. Réservé à l'IA Expert : voir la règle d'équité
     * en tête de `evaluate_game_state.ts`.
     */
    opponent?: GamePlayer;
}

export const selectMulliganCardUuids = (
    player: GamePlayer,
    profile: AiDeckProfile | undefined,
    { opponent }: MulliganOptions = {},
): string[] => {
    const maxCost = adjustMaxKeptCost(MAX_KEPT_COST[profile ?? "MIDRANGE"], opponent);

    const tossed: string[] = [];
    let expensiveKept = 0;

    // De la carte la moins chère à la plus chère : on remplit d'abord la courbe basse.
    const sorted = [...player.hand].sort((a, b) => a.cost - b.cost);

    for (const card of sorted) {
        if (card.cost > maxCost) {
            tossed.push(card.uuid);
            continue;
        }

        if (isExpensive(card, maxCost)) {
            expensiveKept++;
            if (expensiveKept > MAX_EXPENSIVE_KEPT) tossed.push(card.uuid);
        }
    }

    return tossed;
};
