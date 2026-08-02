import { test } from "@japa/runner";
import {
    AGGRO_WEIGHTS,
    evaluateGameState,
    evaluateMinion,
    getWeightsForProfile,
    MIDRANGE_WEIGHTS,
    WIN_SCORE,
} from "#galaguerre/ai/advanced/evaluate_game_state";
import {
    createGameData,
    createMinionCard,
    createMinionState,
    createSpellCard,
} from "#tests/helpers/game/fixtures";

const AI_USER_ID = 1;

test.group("ai:advanced:evaluate", () => {
    test("a lethal state dominates every other consideration", ({ assert }) => {
        const winning = createGameData({
            playerTwo: { health: 0 },
        });

        // Un état par ailleurs catastrophique : plateau adverse énorme, main vide.
        const bigMinion = createMinionState(
            createMinionCard({ uuid: "huge", attack: 12, health: 12 }),
        );
        const losing = createGameData({
            playerOne: { hand: [] },
            playerTwo: { board: [bigMinion, bigMinion] },
        });

        assert.equal(evaluateGameState(winning, AI_USER_ID, MIDRANGE_WEIGHTS), WIN_SCORE);
        assert.isBelow(evaluateGameState(losing, AI_USER_ID, MIDRANGE_WEIGHTS), WIN_SCORE);
    });

    test("dying scores -WIN_SCORE even with a winning board", ({ assert }) => {
        const minion = createMinionState(createMinionCard({ uuid: "m", attack: 9, health: 9 }));
        const data = createGameData({
            playerOne: { health: 0, board: [minion, minion] },
        });

        assert.equal(evaluateGameState(data, AI_USER_ID, MIDRANGE_WEIGHTS), -WIN_SCORE);
    });

    test("keeping a minion alive scores better than losing it", ({ assert }) => {
        const minion = createMinionState(createMinionCard({ uuid: "m", attack: 3, health: 4 }));

        const withMinion = createGameData({ playerOne: { board: [minion] } });
        const withoutMinion = createGameData({ playerOne: { board: [] } });

        assert.isAbove(
            evaluateGameState(withMinion, AI_USER_ID, MIDRANGE_WEIGHTS),
            evaluateGameState(withoutMinion, AI_USER_ID, MIDRANGE_WEIGHTS),
        );
    });

    test("a balanced statline is worth more than a lopsided one of equal total", ({ assert }) => {
        const balanced = createMinionState(
            createMinionCard({ uuid: "balanced", attack: 4, health: 4 }),
        );
        const lopsided = createMinionState(
            createMinionCard({ uuid: "lopsided", attack: 7, health: 1 }),
        );

        assert.isAbove(evaluateMinion(balanced), evaluateMinion(lopsided));
    });

    test("aggro weights value enemy hero damage more than midrange weights", ({ assert }) => {
        const damaged = createGameData({ playerTwo: { health: 15 } });
        const untouched = createGameData({ playerTwo: { health: 30 } });

        const aggroGain =
            evaluateGameState(damaged, AI_USER_ID, AGGRO_WEIGHTS) -
            evaluateGameState(untouched, AI_USER_ID, AGGRO_WEIGHTS);
        const midrangeGain =
            evaluateGameState(damaged, AI_USER_ID, MIDRANGE_WEIGHTS) -
            evaluateGameState(untouched, AI_USER_ID, MIDRANGE_WEIGHTS);

        assert.isAbove(aggroGain, midrangeGain);
    });

    test("unspent mana is only penalised at end of turn", ({ assert }) => {
        const data = createGameData({ playerOne: { mana: 7 } });

        const midTurn = evaluateGameState(data, AI_USER_ID, MIDRANGE_WEIGHTS);
        const endOfTurn = evaluateGameState(data, AI_USER_ID, MIDRANGE_WEIGHTS, {
            isEndOfTurn: true,
        });

        assert.isBelow(endOfTurn, midTurn);
    });

    test("getWeightsForProfile maps the deck archetype to its weights", ({ assert }) => {
        assert.deepEqual(getWeightsForProfile("AGGRO"), AGGRO_WEIGHTS);
        assert.deepEqual(getWeightsForProfile("MIDRANGE"), MIDRANGE_WEIGHTS);
        assert.deepEqual(getWeightsForProfile(undefined), MIDRANGE_WEIGHTS);
    });

    test("fair play: the score ignores the CONTENT of the opponent hand and deck", ({ assert }) => {
        // Règle d'équité : `GameData` contient l'information complète des deux joueurs, mais l'IA
        // n'a le droit d'en utiliser que ce qu'un humain voit — les tailles, pas les cartes.
        const weakHand = [
            createMinionCard({ uuid: "weak-1", attack: 1, health: 1, cost: 1 }),
            createSpellCard({ uuid: "weak-2", cost: 1 }),
        ];
        const monsterHand = [
            createMinionCard({ uuid: "strong-1", attack: 12, health: 12, cost: 10 }),
            createSpellCard({ uuid: "strong-2", cost: 10 }),
        ];

        const withWeakHand = createGameData({ playerTwo: { hand: weakHand } });
        const withMonsterHand = createGameData({ playerTwo: { hand: monsterHand } });

        assert.equal(
            evaluateGameState(withWeakHand, AI_USER_ID, MIDRANGE_WEIGHTS),
            evaluateGameState(withMonsterHand, AI_USER_ID, MIDRANGE_WEIGHTS),
        );

        const withWeakDeck = createGameData({ playerTwo: { deckCards: weakHand } });
        const withMonsterDeck = createGameData({ playerTwo: { deckCards: monsterHand } });

        assert.equal(
            evaluateGameState(withWeakDeck, AI_USER_ID, MIDRANGE_WEIGHTS),
            evaluateGameState(withMonsterDeck, AI_USER_ID, MIDRANGE_WEIGHTS),
        );
    });

    test("omniscient mode does read the content of the opponent hand", ({ assert }) => {
        const weakHand = [createMinionCard({ uuid: "weak", attack: 1, health: 1, cost: 1 })];
        const monsterHand = [
            createMinionCard({ uuid: "strong", attack: 12, health: 12, cost: 10 }),
        ];

        const facingWeak = createGameData({ playerTwo: { hand: weakHand } });
        const facingMonster = createGameData({ playerTwo: { hand: monsterHand } });

        // Mains de même TAILLE : seule la lecture du contenu peut les départager.
        assert.isAbove(
            evaluateGameState(facingWeak, AI_USER_ID, MIDRANGE_WEIGHTS, { omniscient: true }),
            evaluateGameState(facingMonster, AI_USER_ID, MIDRANGE_WEIGHTS, { omniscient: true }),
        );
    });
});
