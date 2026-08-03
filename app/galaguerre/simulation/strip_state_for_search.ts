import type { GameData } from "#api_types/game.types";

/**
 * Allège l'état AVANT de lancer une recherche, en retirant ce que le moteur n'a pas besoin de
 * relire pour jouer un coup.
 *
 * `applyAiMove` recopie l'état entier à chaque nœud exploré. Tout octet embarqué dans `GameData`
 * est donc payé des milliers de fois par décision, qu'il serve à la simulation ou non — et
 * `actionLog` ne lui sert pas : il s'accumule depuis le début de la partie, aucune règle ne le
 * consulte, et il finit par peser plus que le plateau, la main et les decks réunis. Mesuré à
 * 57 % des octets clonés au tour 7, une part qui ne fait que croître avec la durée de la partie.
 *
 * Le résultat est une copie de surface : seul `actionLog` est remplacé, tout le reste est partagé
 * avec l'appelant. C'est sans danger parce que la recherche ne mute jamais l'état qu'on lui donne
 * — `applyAiMove` clone avant d'appliquer quoi que ce soit — et que seuls des COUPS ressortent
 * d'une décision, jamais l'état allégé.
 */
export const stripStateForSearch = (data: GameData): GameData => ({ ...data, actionLog: [] });
