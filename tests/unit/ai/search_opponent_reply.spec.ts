import { test } from "@japa/runner";
import type { GameData } from "#api_types/game.types";
import {
    OPPONENT_LETHAL_PENALTY,
    OWN_LETHAL_BONUS,
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

const replyTo = (data: GameData, deadline = Date.now() + 5_000, ownLethalMaxNodes = 0) =>
    runInSimulation({ rng: createSeededRng(7) }, () =>
        scoreAfterOpponentReply(data, {
            aiUserId: AI_USER_ID,
            opponentUserId: OPPONENT_USER_ID,
            weights: MIDRANGE_WEIGHTS,
            beamWidth: 3,
            topK: 8,
            maxNodes: 400,
            deadline,
            ownLethalMaxNodes,
            pickDiscoverOption: (options) => options[0]!,
            seed: 7,
        }),
    );

const scoreState = async (data: GameData) => (await replyTo(data)).score;

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

    test("a reply that ran out of budget is reported as incomplete", async ({ assert }) => {
        // Sans budget, la riposte n'est pas simulée : le score rendu est celui d'un adversaire
        // PASSIF, mécaniquement le plus haut possible. Un appelant qui le comparerait aux autres
        // choisirait systématiquement la ligne qu'il a le moins regardée — y compris une ligne
        // qui offre le létal. `complete: false` est ce qui l'en empêche.
        const board = [readyMinion("a", 5, 5), readyMinion("b", 5, 5)];

        const doomed = () =>
            createGameData({
                currentRound: CURRENT_ROUND,
                playerOne: { health: 6 },
                playerTwo: { board },
            });

        const evaluated = await replyTo(doomed());
        const starved = await replyTo(doomed(), Date.now() - 1);

        assert.isTrue(evaluated.complete);
        assert.equal(evaluated.score, OPPONENT_LETHAL_PENALTY);

        assert.isFalse(starved.complete, "a truncated reply must not pass for an evaluated one");
        assert.isAbove(
            starved.score,
            evaluated.score,
            "the starved score is the one that would win the ranking if it were trusted",
        );
    });
});

/**
 * Troisième pli : après avoir simulé la riposte adverse, l'IA regarde si ELLE tue au tour suivant.
 * C'est ce qui sépare « la position a l'air bonne » de « la position gagne ».
 */
test.group("ai:expert:own lethal after reply", () => {
    /** L'adversaire à 8 PV, sans plateau ni main : sa riposte ne peut rien contre 10 de dégâts. */
    const aboutToDie = () =>
        createGameData({
            currentRound: CURRENT_ROUND,
            playerOne: { board: [readyMinion("a", 5, 5), readyMinion("b", 5, 5)] },
            playerTwo: { health: 8 },
        });

    test("a line that sets up the AI's own lethal is rewarded by exactly the bonus", async ({
        assert,
    }) => {
        // Le même état, noté deux fois : seule l'activation du pli change. L'écart de score est
        // donc imputable au pli et à rien d'autre — c'est tout l'intérêt de le mesurer ainsi
        // plutôt que de comparer deux positions différentes.
        const without = await replyTo(aboutToDie());
        const with3rdPly = await replyTo(aboutToDie(), Date.now() + 5_000, 600);

        assert.isFalse(without.ownHasLethal);
        assert.isTrue(with3rdPly.ownHasLethal);
        assert.equal(with3rdPly.score - without.score, OWN_LETHAL_BONUS);
    });

    test("no bonus when the AI cannot finish the opponent next turn", async ({ assert }) => {
        const healthy = createGameData({
            currentRound: CURRENT_ROUND,
            playerOne: { board: [readyMinion("a", 5, 5), readyMinion("b", 5, 5)] },
            playerTwo: { health: 30 },
        });

        const scored = await replyTo(healthy, Date.now() + 5_000, 600);

        assert.isFalse(scored.ownHasLethal);
    });

    test("the lethal is searched on the AI's NEXT turn, not on the opponent's turn state", async ({
        assert,
    }) => {
        // Ces monstres ont déjà attaqué CE tour-ci. Sur l'état rendu par le faisceau de riposte —
        // un état de MILIEU de tour adverse — ils sont inattaquables et aucun létal n'existe. Ils
        // ne redeviennent frais qu'une fois le tour repassé à l'IA.
        //
        // Si ce test tombe, c'est que le pli a cessé de passer le tour avant de chercher : il
        // rendrait alors « pas de létal » presque partout, et ne coûterait rien parce qu'il ne
        // trouverait plus rien.
        const exhausted = (uuid: string) =>
            createMinionState(createMinionCard({ uuid, attack: 5, health: 5 }), {
                placedAtRound: 0,
                lastActionAtRound: CURRENT_ROUND,
                attacksThisRound: 1,
            });

        const data = createGameData({
            currentRound: CURRENT_ROUND,
            playerOne: { board: [exhausted("a"), exhausted("b")] },
            playerTwo: { health: 8 },
        });

        const scored = await replyTo(data, Date.now() + 5_000, 600);

        assert.isTrue(scored.ownHasLethal);
    });

    test("an opponent lethal outranks the AI's own: the opponent plays first", async ({
        assert,
    }) => {
        // Les deux camps tuent au tour suivant. L'adversaire jouant AVANT, la ligne vaut la
        // pénalité, jamais la prime : créditer l'IA d'un létal qu'elle n'atteindra pas la ferait
        // marcher droit dans la mort en croyant gagner la course.
        const race = createGameData({
            currentRound: CURRENT_ROUND,
            playerOne: {
                health: 6,
                board: [readyMinion("a", 5, 5), readyMinion("b", 5, 5)],
            },
            playerTwo: {
                health: 8,
                board: [readyMinion("x", 5, 5), readyMinion("y", 5, 5)],
            },
        });

        const scored = await replyTo(race, Date.now() + 5_000, 600);

        assert.isTrue(scored.opponentHasLethal);
        assert.isFalse(scored.ownHasLethal);
        assert.equal(scored.score, OPPONENT_LETHAL_PENALTY);
    });

    test("the ply stays off when its node budget is zero", async ({ assert }) => {
        // Le levier d'arrêt : `replyOwnLethalMaxNodes = 0` doit rendre EXACTEMENT le comportement
        // à deux plis, sans quoi il ne servirait à rien de le couper en production.
        const scored = await replyTo(aboutToDie(), Date.now() + 5_000, 0);

        assert.isFalse(scored.ownHasLethal);
    });
});
