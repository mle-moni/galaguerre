import { DEFAULT_HERO_HEALTH } from "#api_types/game.types";
import { test } from "@japa/runner";
import {
    assertBoardIndex,
    assertGameState,
    assertPlayerHealth,
} from "#tests/helpers/game/assertions";
import {
    CARD_IDS,
    createGameData,
    createMinionCard,
    createMinionState,
    MINION_IDS,
    placeMinion,
} from "#tests/helpers/game/fixtures";
import {
    runMinionActionInMemory,
    runMinionActionOnGameInMemory,
} from "#tests/helpers/game/run_minion_action_in_memory";
import { runPlayMinion, runPlayMinionOnGame } from "#tests/helpers/game/run_play_minion";
import { runPassTurnFromGame } from "#tests/helpers/game/run_setup_next_turn";
import { assertError } from "#tests/helpers/game/socket_event_collector";

test.group("game scenarios", () => {
    test("full turn: play minion, attack, pass turn, opponent plays", async ({ assert }) => {
        const handCard = createMinionCard({
            uuid: CARD_IDS.handMinion,
            cost: 2,
            attack: 2,
            health: 2,
            minionPowers: { hasCharge: true },
            effects: ["Charge"],
        });
        const opponentHandCard = createMinionCard({
            uuid: "p2-hand",
            cost: 1,
        });

        const { game: playGame } = await runPlayMinion(
            createGameData({
                currentRound: 3,
                playerOne: {
                    mana: 10,
                    hand: [handCard],
                },
                playerTwo: {
                    mana: 10,
                    hand: [opponentHandCard],
                },
            }),
            handCard,
        );

        assertBoardIndex(assert, playGame, "playerOne", 0, { health: 2 });

        const { game: attackGame, errors: attackErrors } = await runMinionActionOnGameInMemory(
            playGame,
            "playerOne",
            {
                minionId: CARD_IDS.handMinion,
                minionUuid: null,
                owner: "OPPONENT",
            },
        );

        assert.equal(attackErrors.length, 0);
        assertPlayerHealth(assert, attackGame, "playerTwo", DEFAULT_HERO_HEALTH - 2);

        const { game: passGame } = await runPassTurnFromGame(attackGame);

        assertGameState(assert, passGame, "PLAYER_TWO_TURN");

        const { game: opponentPlayGame } = await runPlayMinionOnGame(passGame, opponentHandCard, {
            boardIndex: 0,
            actor: "playerTwo",
        });

        assertBoardIndex(assert, opponentPlayGame, "playerTwo", 0, { health: 1 });
    });

    test("taunt blocks hero attack until taunt minion is dealt with", async ({ assert }) => {
        const attackerCard = createMinionCard({
            uuid: MINION_IDS.attacker,
            attack: 5,
            health: 5,
        });
        const finisherCard = createMinionCard({
            uuid: "minion-finisher",
            attack: 3,
            health: 3,
            minionPowers: { hasCharge: true },
            effects: ["Charge"],
        });
        const tauntCard = createMinionCard({
            uuid: MINION_IDS.taunt,
            attack: 1,
            health: 2,
            minionPowers: { hasTaunt: true },
            effects: ["Provocation"],
        });

        const blocked = await runMinionActionInMemory(
            createGameData({
                currentRound: 4,
                playerOne: {
                    board: placeMinion(
                        placeMinion(
                            createGameData().playerOne.board,
                            0,
                            createMinionState(attackerCard),
                        ),
                        1,
                        createMinionState(finisherCard, { placedAtRound: 4 }),
                    ),
                    hand: [],
                },
                playerTwo: {
                    board: placeMinion(
                        createGameData().playerTwo.board,
                        0,
                        createMinionState(tauntCard),
                    ),
                },
            }),
            "playerOne",
            {
                minionId: MINION_IDS.attacker,
                minionUuid: null,
                owner: "OPPONENT",
            },
        );

        assertError(assert, "Vous devez d'abord attaquer un monstre avec Provocation");
        assertPlayerHealth(assert, blocked.game, "playerTwo", DEFAULT_HERO_HEALTH);

        const killTaunt = await runMinionActionOnGameInMemory(blocked.game, "playerOne", {
            minionId: MINION_IDS.attacker,
            minionUuid: MINION_IDS.taunt,
            owner: "OPPONENT",
        });

        assert.equal(killTaunt.errors.length, 0);
        assertBoardIndex(assert, killTaunt.game, "playerTwo", 0, null);

        const heroAttack = await runMinionActionOnGameInMemory(killTaunt.game, "playerOne", {
            minionId: "minion-finisher",
            minionUuid: null,
            owner: "OPPONENT",
        });

        assert.equal(heroAttack.errors.length, 0);
        assertPlayerHealth(assert, heroAttack.game, "playerTwo", DEFAULT_HERO_HEALTH - 3);

        const { game: passGame } = await runPassTurnFromGame(heroAttack.game);
        assertGameState(assert, passGame, "PLAYER_TWO_TURN");
    });
});
