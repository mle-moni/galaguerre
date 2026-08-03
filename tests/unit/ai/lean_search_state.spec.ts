import { test } from "@japa/runner";
import { stripStateForSearch } from "#galaguerre/simulation/strip_state_for_search";
import { createSimulationGame } from "#galaguerre/simulation/simulation_game";
import { recordPassTurn } from "#galaguerre/game_log/record_game_log";
import { createSeededRng, runInSimulation } from "../../../app/utils/simulation_context.js";
import { createGameData } from "#tests/helpers/game/fixtures";

/**
 * L'état que la recherche recopie à chaque nœud a été allégé de son journal d'actions. Ces tests
 * verrouillent les deux propriétés dont dépend la correction de cet allègement : la recherche ne
 * doit rien abîmer de l'état qu'on lui confie, et le journal doit continuer de s'écrire dès qu'on
 * n'est PAS en simulation — sans quoi on perdrait l'historique des vraies parties, dont vivent le
 * replay, les statistiques et les quêtes.
 */

const AI_USER_ID = 1;
const OPPONENT_USER_ID = 2;

const gameDataWithLog = () => {
    const data = createGameData();

    data.actionLog = [
        { id: "log-1", roundNumber: 1, playerId: AI_USER_ID, type: "PASS_TURN" },
        { id: "log-2", roundNumber: 2, playerId: OPPONENT_USER_ID, type: "PASS_TURN" },
    ];

    return data;
};

test.group("lean search state", () => {
    test("strips the action log the search never reads", ({ assert }) => {
        const data = gameDataWithLog();

        assert.lengthOf(stripStateForSearch(data).actionLog, 0);
    });

    test("leaves the caller's state untouched", ({ assert }) => {
        const data = gameDataWithLog();

        stripStateForSearch(data);

        // La recherche reçoit une COPIE de surface : l'appelant garde son journal intact, sans
        // quoi une décision d'IA effacerait l'historique de la partie en cours.
        assert.lengthOf(data.actionLog, 2);
    });

    test("keeps players and board shared, so the copy stays cheap", ({ assert }) => {
        const data = gameDataWithLog();

        const stripped = stripStateForSearch(data);

        // Tout l'intérêt est de ne PAS recopier le reste : `applyAiMove` clone de son côté avant
        // de muter quoi que ce soit.
        assert.strictEqual(stripped.playerOne, data.playerOne);
        assert.strictEqual(stripped.playerTwo, data.playerTwo);
    });

    test("does not record log entries while simulating", async ({ assert }) => {
        const data = gameDataWithLog();
        const game = createSimulationGame(data);

        await runInSimulation({ rng: createSeededRng(1) }, async () => {
            recordPassTurn(game, data.playerOne);
        });

        // Pendant une recherche, chaque entrée ajoutée serait recopiée par tous les nœuds
        // suivants : le journal doit rester tel quel.
        assert.lengthOf(data.actionLog, 2);
    });

    test("still records log entries outside a simulation", ({ assert }) => {
        const data = gameDataWithLog();
        const game = createSimulationGame(data);

        recordPassTurn(game, data.playerOne);

        // Le cas des vraies parties : replay, statistiques et quêtes en dépendent.
        assert.lengthOf(data.actionLog, 3);
        assert.equal(data.actionLog[2]!.type, "PASS_TURN");
    });
});
