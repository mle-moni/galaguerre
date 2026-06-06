import { DEFAULT_HERO_HEALTH } from "#api_types/game.types";
import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import {
    CARD_IDS,
    createCardActionSnapshot,
    createGameData,
    createHeroTargetSnapshot,
    createMinionCard,
    createMinionState,
    createMinionTargetSnapshot,
    createSpellCard,
    placeMinion,
} from "#tests/helpers/game/fixtures";
import { assertPlayCardScenario, runPlayCard } from "#tests/helpers/game/run_play_card";

test.group("game:play_spell", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("applies spellPower bonus to spell damage", async ({ assert }) => {
        const spell = createSpellCard({ cost: 2 });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: {
                    mana: 10,
                    spellPower: 2,
                    hand: [spell],
                },
                playerTwo: {
                    health: DEFAULT_HERO_HEALTH,
                },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.spell,
                spotId: null,
                owner: "PLAYER",
            },
            expect: { error: null },
        });

        assertPlayCardScenario(assert, result, { error: null });
        assert.equal(result.game.data.playerTwo.health, DEFAULT_HERO_HEALTH - 5);
    });

    test("plays targeted spell on enemy minion", async ({ assert }) => {
        const enemyMinion = createMinionCard({ uuid: "enemy-minion", health: 4 });
        const spell = createSpellCard({
            cost: 3,
            action: createCardActionSnapshot({
                type: "DAMAGE",
                isTargeted: true,
                damage: 4,
                target: createMinionTargetSnapshot("OPPONENT"),
            }),
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: {
                    mana: 10,
                    hand: [spell],
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        "SPOT_1",
                        createMinionState(enemyMinion),
                    ),
                },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.spell,
                spotId: null,
                owner: "PLAYER",
                actionTarget: { spotId: "SPOT_1", owner: "OPPONENT" },
            },
            expect: { error: null },
        });

        assertPlayCardScenario(assert, result, { error: null });
        assert.isNull(result.game.data.playerTwo.board.SPOT_1);
        assert.equal(result.game.data.playerOne.hand.length, 0);
    });

    test("draw spell adds card to hand", async ({ assert }) => {
        const deckCard = createMinionCard({ uuid: "deck-card" });
        const spell = createSpellCard({
            cost: 1,
            action: createCardActionSnapshot({
                type: "DRAW",
                isTargeted: false,
                drawCount: 1,
            }),
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: {
                    mana: 10,
                    hand: [spell],
                    deckCards: [deckCard],
                },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.spell,
                spotId: null,
                owner: "PLAYER",
            },
            expect: { error: null },
        });

        assertPlayCardScenario(assert, result, { error: null });
        assert.equal(result.game.data.playerOne.hand.length, 1);
        assert.equal(result.game.data.playerOne.hand[0]!.uuid, "deck-card");
        assert.equal(result.game.data.playerOne.deckCards.length, 0);
    });

    test("spell lethal damage ends the game", async ({ assert }) => {
        const spell = createSpellCard({
            cost: 2,
            action: createCardActionSnapshot({
                type: "DAMAGE",
                isTargeted: false,
                damage: 15,
                target: createHeroTargetSnapshot("OPPONENT"),
            }),
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: {
                    mana: 10,
                    hand: [spell],
                },
                playerTwo: {
                    health: 5,
                },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.spell,
                spotId: null,
                owner: "PLAYER",
            },
            expect: { error: null },
        });

        assertPlayCardScenario(assert, result, { error: null });
        assert.equal(result.game.data.playerTwo.health, -10);
        assert.isTrue(result.game.isFinished);
    });
});
