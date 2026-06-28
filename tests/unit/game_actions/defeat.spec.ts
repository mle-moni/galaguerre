import { DEFAULT_HERO_HEALTH } from "#api_types/game.types";
import { test } from "@japa/runner";
import { executeAction } from "#galaguerre/action_engine/execute_action";
import { assertPlayerHealth } from "#tests/helpers/game/assertions";
import {
    createCardActionSnapshot,
    createEmptyBoard,
    createGameData,
    createMinionCard,
    createMinionState,
    createMinionTargetSnapshot,
    placeMinion,
} from "#tests/helpers/game/fixtures";
import { createInMemoryGame } from "#tests/helpers/game/in_memory_game";

const createGame = (data: ReturnType<typeof createGameData>) => createInMemoryGame(data);

const defeatOpponent = createCardActionSnapshot({
    type: "DEFEAT",
    targetTeam: "OPPONENT",
});

const defeatSelf = createCardActionSnapshot({
    type: "DEFEAT",
    targetTeam: "PLAYER",
});

const defeatAll = createCardActionSnapshot({
    type: "DEFEAT",
    targetTeam: "ALL",
});

test.group("DEFEAT action", () => {
    test("defeats the opponent hero", ({ assert }) => {
        const game = createGame(createGameData());

        executeAction(defeatOpponent, game, game.data.playerOne, game.data.playerTwo);

        assertPlayerHealth(assert, game, "playerOne", DEFAULT_HERO_HEALTH);
        assertPlayerHealth(assert, game, "playerTwo", 0);
    });

    test("defeats the acting player hero", ({ assert }) => {
        const game = createGame(createGameData());

        executeAction(defeatSelf, game, game.data.playerOne, game.data.playerTwo);

        assertPlayerHealth(assert, game, "playerOne", 0);
        assertPlayerHealth(assert, game, "playerTwo", DEFAULT_HERO_HEALTH);
    });

    test("defeats both heroes", ({ assert }) => {
        const game = createGame(createGameData());

        executeAction(defeatAll, game, game.data.playerOne, game.data.playerTwo);

        assertPlayerHealth(assert, game, "playerOne", 0);
        assertPlayerHealth(assert, game, "playerTwo", 0);
    });

    test("triggers defeat as onTargetResult follow-up when target is killed", ({ assert }) => {
        const targetCard = createMinionCard({ uuid: "target", attack: 1, health: 1 });
        const game = createGame(
            createGameData({
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), 0, createMinionState(targetCard)),
                },
            }),
        );

        const damageWithDefeatFollowUp = createCardActionSnapshot({
            type: "DAMAGE",
            isTargeted: true,
            damage: 1,
            target: createMinionTargetSnapshot("OPPONENT"),
            onTargetResult: {
                when: "KILLED",
                healthComparison: null,
                action: {
                    type: "DEFEAT",
                    isTargeted: false,
                    targetTeam: "OPPONENT",
                    actionCondition: null,
                },
            },
        });

        executeAction(damageWithDefeatFollowUp, game, game.data.playerOne, game.data.playerTwo, {
            minionUuid: "target",
            owner: "OPPONENT",
        });

        assertPlayerHealth(assert, game, "playerOne", DEFAULT_HERO_HEALTH);
        assertPlayerHealth(assert, game, "playerTwo", 0);
    });
});
