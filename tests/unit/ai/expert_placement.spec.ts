import { test } from "@japa/runner";
import { enumerateAiMoves } from "#galaguerre/ai/enumerate_ai_moves";
import { createInMemoryGame } from "#tests/helpers/game/in_memory_game";
import {
    createCardActionSnapshot,
    createGameData,
    createMinionCard,
    createMinionState,
    createMinionTargetSnapshot,
} from "#tests/helpers/game/fixtures";

/**
 * La position d'un monstre sur le plateau n'a d'incidence QUE pour les effets d'adjacence.
 * Énumérer plusieurs emplacements pour toutes les cartes multiplierait le facteur de branchement
 * de la recherche pour des états identiques : on vérifie ici que le surcoût est bien ciblé.
 */

const AI_USER_ID = 1;

const playCardIndexes = (cardUuid: string, data: ReturnType<typeof createGameData>): number[] => {
    const game = createInMemoryGame(data);

    return enumerateAiMoves(game, AI_USER_ID)
        .filter((move) => move.type === "play_card" && move.action.cardId === cardUuid)
        .map((move) => (move.type === "play_card" ? move.action.boardIndex : null))
        .filter((index): index is number => index !== null);
};

const occupiedBoard = () => [
    createMinionState(createMinionCard({ uuid: "on-board-1" })),
    createMinionState(createMinionCard({ uuid: "on-board-2" })),
];

test.group("ai:expert:minion placement", () => {
    test("an ordinary minion is only ever played at the rightmost slot", ({ assert }) => {
        const card = createMinionCard({ uuid: "plain", cost: 1 });
        const data = createGameData({
            playerOne: { hand: [card], board: occupiedBoard() },
        });

        assert.deepEqual(playCardIndexes("plain", data), [2]);
    });

    test("a minion with an adjacency effect is played at every slot", ({ assert }) => {
        const card = createMinionCard({
            uuid: "adjacent",
            cost: 1,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    isTargeted: false,
                    damage: 1,
                    target: createMinionTargetSnapshot("PLAYER", {
                        adjacency: "SOURCE",
                        excludeSelf: true,
                    }),
                }),
            ],
        });

        const data = createGameData({
            playerOne: { hand: [card], board: occupiedBoard() },
        });

        // Trois emplacements possibles sur un plateau de deux monstres : à gauche, entre, à droite.
        assert.deepEqual(playCardIndexes("adjacent", data), [0, 1, 2]);
    });

    test("an empty board leaves a single slot, adjacency or not", ({ assert }) => {
        const card = createMinionCard({
            uuid: "adjacent",
            cost: 1,
            battlecryActions: [
                createCardActionSnapshot({
                    type: "DAMAGE",
                    isTargeted: false,
                    damage: 1,
                    target: createMinionTargetSnapshot("PLAYER", { adjacency: "SOURCE" }),
                }),
            ],
        });

        const data = createGameData({ playerOne: { hand: [card], board: [] } });

        assert.deepEqual(playCardIndexes("adjacent", data), [0]);
    });
});
