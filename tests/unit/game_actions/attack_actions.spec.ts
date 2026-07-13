import { test } from "@japa/runner";
import type { CardFilterSnapshot } from "#api_types/game.types";
import { deckCardMatchesFilter } from "#api_types/card_filter_matching";
import { getCollectibleMinionCardTemplates } from "#api_types/card_preview";
import { executeAttackActions } from "#galaguerre/action_engine/execute_attack_actions";
import { isV1Action } from "#galaguerre/action_engine/is_v1_action";
import {
    createCardActionSnapshot,
    createGameData,
    createMinionCard,
    createMinionState,
} from "#tests/helpers/game/fixtures";
import { createInMemoryGame } from "#tests/helpers/game/in_memory_game";
import { runMinionActionInMemory } from "#tests/helpers/game/run_minion_action_in_memory";

const DEVELOPPEUR_FILTER = {
    type: "MINION" as const,
    comparison: null,
    tags: ["DEVELOPPEUR" as const],
    labelTags: [] as CardFilterSnapshot["labelTags"],
    rarity: null,
};

const SALES_FILTER = {
    type: "MINION" as const,
    comparison: null,
    tags: ["SALES" as const],
    labelTags: [] as CardFilterSnapshot["labelTags"],
    rarity: null,
};

const generateHandAttackAction = createCardActionSnapshot({
    type: "GENERATE_HAND",
    generateCount: 1,
    generateCardFilter: null,
    generateCardFilterAlternatives: [DEVELOPPEUR_FILTER, SALES_FILTER],
    handTargetTeam: "PLAYER",
});

const expectedDeveloperOrSalesCardIds = new Set(
    getCollectibleMinionCardTemplates()
        .filter(
            (card) =>
                deckCardMatchesFilter(card, DEVELOPPEUR_FILTER) ||
                deckCardMatchesFilter(card, SALES_FILTER),
        )
        .map((card) => card.cardId),
);

const createAttackerCard = (overrides: Parameters<typeof createMinionCard>[0] = {}) =>
    createMinionCard({
        uuid: "attacker",
        attack: 3,
        minionPowers: {
            hasTaunt: false,
            hasCharge: true,
            hasRush: false,
            hasWindfury: false,
            isPoisonous: false,
            hasStealth: false,
            hasDivineShield: false,
        },
        attackActions: [generateHandAttackAction],
        ...overrides,
    });

test.group("attack_actions", () => {
    test("executeAttackActions generates a filtered card in hand", ({ assert }) => {
        assert.isTrue(isV1Action(generateHandAttackAction));

        const attackerCard = createAttackerCard();
        const attacker = createMinionState(attackerCard);
        const game = createInMemoryGame(
            createGameData({
                playerOne: {
                    board: [attacker],
                    hand: [],
                },
            }),
        );

        const result = executeAttackActions(
            game,
            game.data.playerOne,
            attacker.originalCard as typeof attackerCard,
        );

        assert.isFalse(result.gameEnded);
        assert.equal(game.data.playerOne.hand.length, 1);
    });

    test("attacking the enemy hero generates a DEVELOPPEUR or SALES card in hand", async ({
        assert,
    }) => {
        const attackerCard = createAttackerCard();
        const attacker = createMinionState(attackerCard, {
            placedAtRound: 0,
            attacksThisRound: 0,
        });

        const { game, errors } = await runMinionActionInMemory(
            createGameData({
                currentRound: 1,
                state: "PLAYER_ONE_TURN",
                playerOne: {
                    board: [attacker],
                    hand: [],
                    deckCards: [],
                },
                playerTwo: {
                    board: [],
                    health: 30,
                },
            }),
            "playerOne",
            { minionId: "attacker", minionUuid: null, owner: "OPPONENT" },
        );

        assert.deepEqual(errors, []);
        assert.equal(game.data.playerOne.board[0]!.attacksThisRound, 1);
        assert.equal(game.data.playerOne.hand.length, 1);
        assert.isTrue(expectedDeveloperOrSalesCardIds.has(game.data.playerOne.hand[0]!.cardId));
        assert.equal(game.data.playerOne.board[0]!.attacksThisRound, 1);
    });

    test("attacking an enemy minion generates a DEVELOPPEUR or SALES card in hand", async ({
        assert,
    }) => {
        const attackerCard = createAttackerCard();
        const attacker = createMinionState(attackerCard, {
            placedAtRound: 0,
            attacksThisRound: 0,
        });
        const defender = createMinionState(
            createMinionCard({ uuid: "defender", attack: 1, health: 5 }),
            { placedAtRound: 0 },
        );

        const { game } = await runMinionActionInMemory(
            createGameData({
                currentRound: 1,
                state: "PLAYER_ONE_TURN",
                playerOne: {
                    board: [attacker],
                    hand: [],
                    deckCards: [],
                },
                playerTwo: {
                    board: [defender],
                    hand: [],
                    deckCards: [],
                },
            }),
            "playerOne",
            { minionId: "attacker", minionUuid: "defender", owner: "OPPONENT" },
        );

        assert.equal(game.data.playerOne.hand.length, 1);
        assert.isTrue(expectedDeveloperOrSalesCardIds.has(game.data.playerOne.hand[0]!.cardId));
    });

    test("windfury triggers attack actions on each attack", async ({ assert }) => {
        const attackerCard = createAttackerCard({
            minionPowers: {
                hasTaunt: false,
                hasCharge: true,
                hasRush: false,
                hasWindfury: true,
                isPoisonous: false,
                hasStealth: false,
                hasDivineShield: false,
            },
        });
        const attacker = createMinionState(attackerCard, {
            placedAtRound: 0,
            attacksThisRound: 0,
        });

        const gameData = createGameData({
            currentRound: 1,
            state: "PLAYER_ONE_TURN",
            playerOne: {
                board: [attacker],
                hand: [],
                deckCards: [],
            },
            playerTwo: {
                board: [],
                health: 30,
            },
        });

        const firstAttack = await runMinionActionInMemory(gameData, "playerOne", {
            minionId: "attacker",
            minionUuid: null,
            owner: "OPPONENT",
        });

        assert.equal(firstAttack.game.data.playerOne.hand.length, 1);

        const secondAttack = await runMinionActionInMemory(firstAttack.game.data, "playerOne", {
            minionId: "attacker",
            minionUuid: null,
            owner: "OPPONENT",
        });

        assert.equal(secondAttack.game.data.playerOne.hand.length, 2);
        assert.isTrue(
            secondAttack.game.data.playerOne.hand.every((card) =>
                expectedDeveloperOrSalesCardIds.has(card.cardId),
            ),
        );
    });
});
