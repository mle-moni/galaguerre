import { DEFAULT_HERO_HEALTH } from "#api_types/game.types";
import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import { assertBoardSpot } from "#tests/helpers/game/assertions";
import {
    CARD_IDS,
    createCardActionSnapshot,
    createGameData,
    createMinionCard,
    createMinionState,
    createMinionTargetSnapshot,
    createSpellCard,
    placeMinion,
} from "#tests/helpers/game/fixtures";
import { assertPlayCardScenario, runPlayCard } from "#tests/helpers/game/run_play_card";
import { runInvalidPlayCardPayload } from "#tests/helpers/game/run_socket_event";

test.group("game:play_card", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("plays a valid minion card from hand", async ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 3,
            attack: 2,
            health: 3,
        });

        const result = await runPlayCard({
            data: createGameData({
                currentRound: 4,
                playerOne: {
                    mana: 5,
                    hand: [handCard],
                },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                spotId: "SPOT_1",
                owner: "PLAYER",
            },
            expect: { error: null },
        });

        assertPlayCardScenario(assert, result, { error: null });
        assert.equal(result.game.data.playerOne.mana, 2);
        assert.equal(result.game.data.playerOne.hand.length, 0);
        assertBoardSpot(assert, result.game, "playerOne", "SPOT_1", {
            health: 3,
            attack: 2,
        });
        const placed = result.game.data.playerOne.board.SPOT_1;
        assert.isNotNull(placed);
        assert.equal(placed!.placedAtRound, 4);
    });


    test("rejects play when mana is insufficient", async ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 5,
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: {
                    mana: 2,
                    hand: [handCard],
                },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                spotId: "SPOT_1",
                owner: "PLAYER",
            },
            expect: {
                error: "Vous n'avez pas assez de mana pour jouer cette carte",
            },
        });

        assertPlayCardScenario(assert, result, {
            error: "Vous n'avez pas assez de mana pour jouer cette carte",
        });
        assert.equal(result.game.data.playerOne.hand.length, 1);
    });


    test("rejects play when card is not in hand", async ({ assert }) => {
        const result = await runPlayCard({
            data: createGameData(),
            actor: "playerOne",
            action: {
                cardId: "missing-card",
                spotId: "SPOT_1",
                owner: "PLAYER",
            },
            expect: {
                error: "Cette carte n'est pas dans votre main (gros con)",
            },
        });

        assertPlayCardScenario(assert, result, {
            error: "Cette carte n'est pas dans votre main (gros con)",
        });
    });


    test("rejects play on an occupied spot", async ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 1,
        });
        const existing = createMinionCard({ uuid: "existing-minion" });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: {
                    mana: 10,
                    hand: [handCard],
                    board: placeMinion(
                        createGameData().playerOne.board,
                        "SPOT_1",
                        createMinionState(existing),
                    ),
                },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                spotId: "SPOT_1",
                owner: "PLAYER",
            },
            expect: {
                error: "Vous ne pouvez pas jouer cette carte ici",
            },
        });

        assertPlayCardScenario(assert, result, {
            error: "Vous ne pouvez pas jouer cette carte ici",
        });
    });


    test("rejects play with owner OPPONENT", async ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 1,
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: {
                    mana: 10,
                    hand: [handCard],
                },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                spotId: "SPOT_1",
                owner: "OPPONENT",
            },
            expect: {
                error: "Vous ne pouvez pas jouer cette carte ici",
            },
        });

        assertPlayCardScenario(assert, result, {
            error: "Vous ne pouvez pas jouer cette carte ici",
        });
    });


    test("plays a valid spell card from hand", async ({ assert }) => {
        const spell = createSpellCard({ cost: 2 });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: {
                    mana: 10,
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
        assert.equal(result.game.data.playerOne.mana, 8);
        assert.equal(result.game.data.playerOne.hand.length, 0);
        assert.equal(result.game.data.playerTwo.health, DEFAULT_HERO_HEALTH - 3);
    });


    test("rejects spell play when mana is insufficient", async ({ assert }) => {
        const spell = createSpellCard({ cost: 5 });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: {
                    mana: 2,
                    hand: [spell],
                },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.spell,
                spotId: null,
                owner: "PLAYER",
            },
            expect: {
                error: "Vous n'avez pas assez de mana pour jouer cette carte",
            },
        });

        assertPlayCardScenario(assert, result, {
            error: "Vous n'avez pas assez de mana pour jouer cette carte",
        });
        assert.equal(result.game.data.playerOne.hand.length, 1);
    });


    test("rejects targeted spell without action target", async ({ assert }) => {
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
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.spell,
                spotId: null,
                owner: "PLAYER",
            },
            expect: {
                error: "Vous devez choisir une cible pour cette carte",
            },
        });

        assertPlayCardScenario(assert, result, {
            error: "Vous devez choisir une cible pour cette carte",
        });
    });


    test("rejects play when it is not the player turn", async ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 1,
        });

        const result = await runPlayCard({
            data: createGameData({
                state: "PLAYER_ONE_TURN",
                playerOne: {
                    mana: 10,
                    hand: [handCard],
                },
            }),
            actor: "playerTwo",
            action: {
                cardId: CARD_IDS.handMinion,
                spotId: "SPOT_1",
                owner: "PLAYER",
            },
            expect: {
                error: "Ce n'est pas votre tour (gros con)",
            },
        });

        assertPlayCardScenario(assert, result, {
            error: "Ce n'est pas votre tour (gros con)",
        });
    });


    test("rejects play when user has no active game", async ({ assert }) => {
        const result = await runPlayCard({
            data: createGameData(),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                spotId: "SPOT_1",
                owner: "PLAYER",
            },
            expect: { error: "Vous n'êtes pas en jeu" },
            options: { outsider: true },
        });

        assertPlayCardScenario(assert, result, { error: "Vous n'êtes pas en jeu" });
    });


    test("rejects play when socket is not authenticated", async ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 1,
        });

        const result = await runPlayCard({
            data: createGameData({
                playerOne: {
                    mana: 10,
                    hand: [handCard],
                },
            }),
            actor: "playerOne",
            action: {
                cardId: CARD_IDS.handMinion,
                spotId: "SPOT_1",
                owner: "PLAYER",
            },
            expect: {
                error: "Une erreur est survenue, essayez de rafraichir la page",
            },
            options: { authenticated: false },
        });

        assertPlayCardScenario(assert, result, {
            error: "Une erreur est survenue, essayez de rafraichir la page",
        });
    });


    test("rejects invalid play card payload", async ({ assert }) => {
        const errors = await runInvalidPlayCardPayload({
            cardId: "card-1",
            spotId: "BAD_SPOT",
            owner: "PLAYER",
        });

        assert.equal(errors.length, 1);
        assert.equal(errors[0], "Invalid data sent for event 'game:play_card' :/");
    });

});
