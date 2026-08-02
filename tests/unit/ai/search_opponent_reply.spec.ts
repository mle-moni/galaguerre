import { test } from "@japa/runner";
import type { GameData } from "#api_types/game.types";
import {
    OPPONENT_LETHAL_PENALTY,
    scoreAfterOpponentReply,
} from "#galaguerre/ai/advanced/search_opponent_reply";
import { MIDRANGE_WEIGHTS } from "#galaguerre/ai/advanced/evaluate_game_state";
import { createSeededRng, runInSimulation } from "../../../app/utils/simulation_context.js";
import { createGameData, createMinionCard, createMinionState } from "#tests/helpers/game/fixtures";

/**
 * Ces tests valident le pli supplémentaire de l'IA Expert : elle ne note plus un état sur ses
 * apparences, elle SIMULE le tour que l'adversaire jouerait ensuite, à partir de sa vraie main.
 */

const AI_USER_ID = 1;
const OPPONENT_USER_ID = 2;

const CURRENT_ROUND = 5;

const scoreState = (data: GameData) =>
    runInSimulation({ rng: createSeededRng(7) }, () =>
        scoreAfterOpponentReply(data, {
            aiUserId: AI_USER_ID,
            opponentUserId: OPPONENT_USER_ID,
            weights: MIDRANGE_WEIGHTS,
            beamWidth: 3,
            topK: 8,
            maxNodes: 400,
            deadline: Date.now() + 5_000,
            pickDiscoverOption: (options) => options[0]!,
        }),
    );

/** Un monstre posé au round 0 : plus de mal des invocations, il peut attaquer. */
const readyMinion = (uuid: string, attack: number, health: number) =>
    createMinionState(createMinionCard({ uuid, attack, health }), { placedAtRound: 0 });

test.group("ai:expert:opponent reply", () => {
    test("a line that leaves the opponent lethal is scored at the lethal penalty", async ({
        assert,
    }) => {
        const board = [readyMinion("a", 5, 5), readyMinion("b", 5, 5)];

        // 6 PV face à 10 points d'attaque prêts à frapper : l'adversaire tue au tour suivant.
        const doomed = createGameData({
            currentRound: CURRENT_ROUND,
            playerOne: { health: 6 },
            playerTwo: { board },
        });

        assert.equal(await scoreState(doomed), OPPONENT_LETHAL_PENALTY);
    });

    test("the same board is not penalised when the AI is out of reach", async ({ assert }) => {
        const board = [readyMinion("a", 5, 5), readyMinion("b", 5, 5)];

        const safe = createGameData({
            currentRound: CURRENT_ROUND,
            playerOne: { health: 30 },
            playerTwo: { board },
        });

        assert.isAbove(await scoreState(safe), OPPONENT_LETHAL_PENALTY);
    });

    test("the reply reads the opponent's REAL hand, not just its size", async ({ assert }) => {
        // Deux états rigoureusement identiques pour une IA équitable : même plateau, même nombre
        // de cartes en main. Seul le CONTENU de la main adverse change.
        const bomb = createMinionCard({ uuid: "bomb", cost: 1, attack: 8, health: 8 });
        const dud = createMinionCard({ uuid: "dud", cost: 1, attack: 1, health: 1 });

        const facingBomb = createGameData({
            currentRound: CURRENT_ROUND,
            playerTwo: { hand: [bomb] },
        });
        const facingDud = createGameData({
            currentRound: CURRENT_ROUND,
            playerTwo: { hand: [dud] },
        });

        assert.isBelow(await scoreState(facingBomb), await scoreState(facingDud));
    });
});
