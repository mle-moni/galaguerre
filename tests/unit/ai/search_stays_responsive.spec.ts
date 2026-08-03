import { test } from "@japa/runner";
import { applyAiMove } from "#galaguerre/simulation/apply_ai_move";
import { createSeededRng, runInSimulation } from "../../../app/utils/simulation_context.js";
import { createGameData } from "#tests/helpers/game/fixtures";

/**
 * Une décision d'IA est du calcul pur sur le thread principal : tant qu'elle tourne, le serveur ne
 * répond à personne d'autre. Les `await` de la chaîne de simulation n'y changent rien — ils ne
 * produisent que des micro-tâches, et le drainage des micro-tâches ne rend jamais la main aux
 * minuteurs ni aux sockets. `applyAiMove` bascule donc sur une macro-tâche toutes les quelques
 * centaines de coups simulés.
 *
 * Le test mesure ce qu'un autre joueur ressentirait : un `setInterval` qui bat pendant que la
 * simulation tourne. Il vise `applyAiMove` directement plutôt qu'une vraie décision, parce qu'une
 * recherche s'arrête quand elle n'a plus de coups à explorer — sur une position de test elle
 * pourrait rendre la main avant même d'avoir simulé de quoi déclencher une respiration, et le test
 * passerait alors sans rien prouver.
 */

const AI_USER_ID = 1;

/** Confortablement au-dessus de `MOVES_BETWEEN_YIELDS`, pour couvrir plusieurs respirations. */
const SIMULATED_MOVES = 700;

test.group("search stays responsive", () => {
    test("lets timers run while the simulation grinds", async ({ assert }) => {
        const data = createGameData();

        let ticks = 0;
        const timer = setInterval(() => {
            ticks++;
        }, 1);

        try {
            await runInSimulation({ rng: createSeededRng(1) }, async () => {
                for (let index = 0; index < SIMULATED_MOVES; index++) {
                    await applyAiMove(data, AI_USER_ID, { type: "pass_turn" });
                }
            });
        } finally {
            clearInterval(timer);
        }

        // Sans respiration, ce compteur reste bloqué à zéro quelle que soit la durée du calcul.
        assert.isAbove(ticks, 0, "the event loop was starved while simulating moves");
    });
});
