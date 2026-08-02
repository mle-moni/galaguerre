import { test } from "@japa/runner";
import type { GameData, MinionCard } from "#api_types/game.types";
import { findLethalSequence } from "#galaguerre/ai/advanced/find_lethal";
import type { AiMove } from "#galaguerre/ai/enumerate_ai_moves";
import { applyAiMove } from "#galaguerre/simulation/apply_ai_move";
import { createSeededRng, runInSimulation } from "../../../app/utils/simulation_context.js";
import {
    createGameData,
    createMinionCard,
    createMinionPowersSnapshot,
    createMinionState,
} from "#tests/helpers/game/fixtures";

/**
 * L'IA cherche son létal à part du faisceau, parce que le rater est l'erreur la plus chère
 * qu'elle puisse commettre. Ces tests verrouillent la borne de dégâts qui élague cette recherche :
 * tant qu'elle SUR-estime, on ne perd que du temps de calcul ; dès qu'elle sous-estime, la branche
 * est coupée et le létal disparaît.
 */

const AI_USER_ID = 2;
const OPPONENT_USER_ID = 1;

const readyMinion = (
    uuid: string,
    attack: number,
    health: number,
    powers: Partial<MinionCard["minionPowers"]> = {},
) =>
    createMinionState(
        createMinionCard({
            uuid,
            attack,
            health,
            minionPowers: createMinionPowersSnapshot(powers),
        }),
        { placedAtRound: 0 },
    );

const bindSeats = (data: GameData): GameData => ({
    ...data,
    playerOne: { ...data.playerOne, userId: OPPONENT_USER_ID },
    playerTwo: { ...data.playerTwo, userId: AI_USER_ID },
});

const findLethal = (data: GameData, maxNodes = 5_000, deadline = Date.now() + 10_000) =>
    runInSimulation({ rng: createSeededRng(1) }, () =>
        findLethalSequence(data, {
            aiUserId: AI_USER_ID,
            maxNodes,
            deadline,
            pickDiscoverOption: (options) => options[0]!,
        }),
    );

/** Rejoue la séquence pour vérifier qu'elle tue réellement, plutôt que de croire l'IA sur parole. */
const replayKills = async (data: GameData, moves: AiMove[]) => {
    let state = data;
    for (const move of moves) {
        state = (await applyAiMove(state, AI_USER_ID, move)).data;
    }

    return state.playerOne.health <= 0;
};

test.group("ai:find lethal", () => {
    test("finds the lethal that goes THROUGH a taunt", async ({ assert }) => {
        // 15 points d'attaque contre 8 PV, mais une Provocation 1/1 tient le plateau : il faut la
        // retirer d'abord. C'est exactement la ligne que cette recherche existe pour trouver, et
        // c'est celle que la borne de dégâts coupait, faute de compter les monstres bloqués.
        const data = bindSeats(
            createGameData({
                state: "PLAYER_TWO_TURN",
                currentRound: 5,
                playerOne: { health: 8, board: [readyMinion("taunt", 1, 1, { hasTaunt: true })] },
                playerTwo: {
                    mana: 0,
                    hand: [],
                    board: [readyMinion("a", 5, 5), readyMinion("b", 5, 5), readyMinion("c", 5, 5)],
                },
            }),
        );

        const { moves } = await findLethal(data);

        assert.isNotNull(moves, "expected a lethal line through the taunt");
        assert.isTrue(await replayKills(data, moves!), "the line must actually kill");
    });

    test("counts both swings of a windfury minion", async ({ assert }) => {
        // Un seul 5/5 Furie des vents contre 10 PV : le létal n'existe qu'en comptant DEUX
        // attaques. Une borne qui n'en compte qu'une coupe la branche avant de chercher.
        const data = bindSeats(
            createGameData({
                state: "PLAYER_TWO_TURN",
                currentRound: 5,
                playerOne: { health: 10 },
                playerTwo: {
                    mana: 0,
                    hand: [],
                    board: [readyMinion("wf", 5, 5, { hasWindfury: true })],
                },
            }),
        );

        const { moves } = await findLethal(data);

        assert.isNotNull(moves, "expected the windfury lethal");
        assert.isTrue(await replayKills(data, moves!));
    });

    test("a position with no lethal is reported as proven, not exhausted", async ({ assert }) => {
        const data = bindSeats(
            createGameData({
                state: "PLAYER_TWO_TURN",
                currentRound: 5,
                playerOne: { health: 30 },
                playerTwo: { mana: 0, hand: [], board: [readyMinion("a", 1, 1)] },
            }),
        );

        const result = await findLethal(data);

        assert.isNull(result.moves);
        assert.isFalse(result.exhausted, "the search finished: absence of lethal is proven here");
    });

    test("running out of nodes is reported as exhausted, not as an absence of lethal", async ({
        assert,
    }) => {
        // Même position létale que le premier test, mais avec un seul nœud de budget : la
        // recherche ne peut RIEN conclure. Confondre ce cas avec « pas de létal » est ce qui
        // faisait choisir à l'IA Expert une ligne qui offre la partie.
        const data = bindSeats(
            createGameData({
                state: "PLAYER_TWO_TURN",
                currentRound: 5,
                playerOne: { health: 8, board: [readyMinion("taunt", 1, 1, { hasTaunt: true })] },
                playerTwo: {
                    mana: 0,
                    hand: [],
                    board: [readyMinion("a", 5, 5), readyMinion("b", 5, 5), readyMinion("c", 5, 5)],
                },
            }),
        );

        const result = await findLethal(data, 1);

        assert.isNull(result.moves);
        assert.isTrue(result.exhausted);
    });
});
