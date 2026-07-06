import { test } from "@japa/runner";
import {
    createCardActionSnapshot,
    createEmptyBoard,
    createGameData,
    createMinionCard,
    createMinionState,
    createMinionTargetSnapshot,
    createSpellCard,
    placeMinion,
} from "#tests/helpers/game/fixtures";
import { runSpellEffect } from "#tests/helpers/game/run_spell_effect";

test.group("adjacent spell splash", () => {
    test("deals primary damage to target and splash to adjacent enemies only", ({ assert }) => {
        const leftEnemy = createMinionCard({ uuid: "left-enemy", health: 4 });
        const targetEnemy = createMinionCard({ uuid: "target-enemy", health: 6 });
        const rightEnemy = createMinionCard({ uuid: "right-enemy", health: 4 });
        const allyNeighbor = createMinionCard({ uuid: "ally-neighbor", health: 5 });

        const explosiveShotLike = createSpellCard({
            cost: 5,
            spellActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    isTargeted: true,
                    damage: 5,
                    target: createMinionTargetSnapshot("OPPONENT"),
                }),
                createCardActionSnapshot({
                    type: "DAMAGE",
                    isTargeted: false,
                    damage: 2,
                    target: createMinionTargetSnapshot("OPPONENT", {
                        adjacency: "SELECTED_TARGET",
                    }),
                }),
            ],
        });

        const { game } = runSpellEffect(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [explosiveShotLike],
                    board: placeMinion(createEmptyBoard(), 0, createMinionState(allyNeighbor)),
                },
                playerTwo: {
                    board: placeMinion(
                        placeMinion(
                            placeMinion(createEmptyBoard(), 0, createMinionState(leftEnemy)),
                            1,
                            createMinionState(targetEnemy),
                        ),
                        2,
                        createMinionState(rightEnemy),
                    ),
                },
            }),
            explosiveShotLike,
            {
                actionTarget: { minionUuid: "target-enemy", owner: "OPPONENT" },
            },
        );

        assert.equal(game.data.playerTwo.board[0]!.health, 2);
        assert.equal(game.data.playerTwo.board[1]!.health, 1);
        assert.equal(game.data.playerTwo.board[2]!.health, 2);
        assert.equal(game.data.playerOne.board[0]!.health, 5);
    });

    test("splash respects divine shield on adjacent enemy", ({ assert }) => {
        const leftEnemy = createMinionCard({
            uuid: "left-enemy",
            health: 4,
            minionPowers: { hasDivineShield: true },
            effects: ["Immunité"],
        });
        const targetEnemy = createMinionCard({ uuid: "target-enemy", health: 6 });
        const rightEnemy = createMinionCard({ uuid: "right-enemy", health: 4 });

        const explosiveShotLike = createSpellCard({
            cost: 5,
            spellActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    isTargeted: true,
                    damage: 5,
                    target: createMinionTargetSnapshot("OPPONENT"),
                }),
                createCardActionSnapshot({
                    type: "DAMAGE",
                    isTargeted: false,
                    damage: 2,
                    target: createMinionTargetSnapshot("OPPONENT", {
                        adjacency: "SELECTED_TARGET",
                    }),
                }),
            ],
        });

        const { game } = runSpellEffect(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [explosiveShotLike],
                },
                playerTwo: {
                    board: placeMinion(
                        placeMinion(
                            placeMinion(createEmptyBoard(), 0, createMinionState(leftEnemy)),
                            1,
                            createMinionState(targetEnemy),
                        ),
                        2,
                        createMinionState(rightEnemy),
                    ),
                },
            }),
            explosiveShotLike,
            {
                actionTarget: { minionUuid: "target-enemy", owner: "OPPONENT" },
            },
        );

        assert.equal(game.data.playerTwo.board[0]!.health, 4);
        assert.isFalse(
            game.data.playerTwo.board[0]!.originalCard.type === "MINION" &&
                game.data.playerTwo.board[0]!.originalCard.minionPowers.hasDivineShield,
        );
        assert.equal(game.data.playerTwo.board[2]!.health, 2);
    });
});
