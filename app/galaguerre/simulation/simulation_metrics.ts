/**
 * Compteur global des coups simulés.
 *
 * Les recherches rapportent chacune leur propre `nodesExplored`, mais aucune ne voit le total :
 * `decideExpertMoves` additionne un faisceau principal, une recherche de létal et une riposte par
 * ligne candidate, et ne remonte que le premier. Un débit calculé sur ce chiffre divise donc des
 * nœuds partiels par un temps complet — il mesure surtout la part de budget passée AILLEURS.
 *
 * `applyAiMove` étant le seul point de passage de toute simulation, l'incrémenter ici donne le
 * seul compteur qui vaille pour juger d'une optimisation. Un entier par nœud est négligeable
 * devant le clone d'état qu'il accompagne.
 */

let simulatedMoves = 0;

export const countSimulatedMove = (): void => {
    simulatedMoves++;
};

/** Rend le compteur et le remet à zéro : à encadrer autour d'une décision à mesurer. */
export const takeSimulatedMoveCount = (): number => {
    const count = simulatedMoves;
    simulatedMoves = 0;

    return count;
};
