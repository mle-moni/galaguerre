/**
 * Rend la main à la boucle d'événements de temps en temps pendant une recherche.
 *
 * Une décision d'IA est du calcul pur : `runInSimulation` neutralise base, sockets et timers, donc
 * plus aucun `await` de la chaîne ne touche vraiment à de l'entrée/sortie. Les `await` internes ne
 * produisent que des micro-tâches, et le drainage des micro-tâches ne redonne PAS la main aux
 * entrées/sorties — une recherche de 3 secondes gèle donc le serveur pendant 3 secondes, pour
 * toutes les parties en cours et toutes les requêtes HTTP, pas seulement pour celle qui réfléchit.
 *
 * `setImmediate` bascule sur une macro-tâche, ce qui laisse passer les sockets et les requêtes en
 * attente. Le compromis est assumé : sous charge, la recherche explore moins de coups dans son
 * budget puisque son échéance court pendant que d'autres travaillent. C'est exactement la
 * dégradation souhaitée — une IA légèrement moins fouillée plutôt qu'un serveur qui ne répond
 * plus.
 *
 * Ce n'est pas un substitut à un `worker_thread` : la recherche occupe toujours le même cœur que
 * le serveur. Elle cesse simplement de le monopoliser.
 */

/**
 * Nombre de coups simulés entre deux respirations. À ~4 000 coups/s, cela fait une bascule tous
 * les ~50 ms : assez rare pour ne rien coûter au calcul, assez fréquent pour qu'aucune requête
 * n'attende plus d'une frame.
 */
const MOVES_BETWEEN_YIELDS = 200;

let movesSinceYield = 0;

export const yieldToEventLoopPeriodically = async (): Promise<void> => {
    movesSinceYield++;

    if (movesSinceYield < MOVES_BETWEEN_YIELDS) return;

    movesSinceYield = 0;
    await new Promise<void>((resolve) => {
        setImmediate(resolve);
    });
};
