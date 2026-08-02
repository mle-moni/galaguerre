import type { AiDeckProfile, GamePlayer, PlayerCard } from "#api_types/game.types";

/**
 * Mulligan de l'IA avancée : elle rejette ce qu'elle ne pourra pas jouer tôt.
 *
 * L'IA débutante garde systématiquement toute sa main de départ, ce qui lui coûte des parties
 * dès qu'elle pioche deux cartes chères.
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

const isExpensive = (card: PlayerCard, maxCost: number): boolean => card.cost > maxCost - 1;

export const selectMulliganCardUuids = (
    player: GamePlayer,
    profile: AiDeckProfile | undefined,
): string[] => {
    const maxCost = MAX_KEPT_COST[profile ?? "MIDRANGE"];

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
