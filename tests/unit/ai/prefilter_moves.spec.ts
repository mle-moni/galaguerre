import { test } from "@japa/runner";
import type { GameData } from "#api_types/game.types";
import { prefilterMoves } from "#galaguerre/ai/advanced/prefilter_moves";
import type { AiMove } from "#galaguerre/ai/enumerate_ai_moves";
import {
    createGameData,
    createMinionCard,
    createMinionState,
    createSpellCard,
} from "#tests/helpers/game/fixtures";

/**
 * Le pré-filtrage décide de ce que la recherche a le droit de SIMULER. Ce qu'il tronque n'existe
 * pas pour le faisceau : un coup écarté ici ne sera jamais évalué, quel que soit le budget.
 */

const AI_USER_ID = 2;
const OPPONENT_USER_ID = 1;
const TOP_K = 12;

const readyMinion = (uuid: string, attack: number, health: number) =>
    createMinionState(createMinionCard({ uuid, attack, health }), { placedAtRound: 0 });

/**
 * Un nœud saturé : l'IA tient deux gros sorts ciblés, l'adversaire a huit monstres. L'énumération
 * produit un coup par couple (sort, cible), soit seize coups notés à l'identique — la note d'un
 * coup de carte ne dépend quasiment pas de sa cible — contre trois attaques notées bien plus bas.
 */
const createSaturatedNode = (): { data: GameData; moves: AiMove[] } => {
    const spells = [
        createSpellCard({ uuid: "spell-a", cost: 8 }),
        createSpellCard({ uuid: "spell-b", cost: 8 }),
    ];

    const enemyBoard = Array.from({ length: 8 }, (_, index) => readyMinion(`enemy-${index}`, 2, 2));
    const aiBoard = Array.from({ length: 3 }, (_, index) => readyMinion(`ai-${index}`, 3, 3));

    const data: GameData = {
        ...createGameData({
            state: "PLAYER_TWO_TURN",
            currentRound: 8,
            playerOne: { health: 30, board: enemyBoard },
            playerTwo: { mana: 10, hand: spells, board: aiBoard },
        }),
    };

    const bound: GameData = {
        ...data,
        playerOne: { ...data.playerOne, userId: OPPONENT_USER_ID },
        playerTwo: { ...data.playerTwo, userId: AI_USER_ID },
    };

    const spellMoves: AiMove[] = spells.flatMap((spell) =>
        enemyBoard.map((target) => ({
            type: "play_card" as const,
            action: {
                cardId: spell.uuid,
                boardIndex: null,
                owner: "PLAYER" as const,
                actionTarget: { minionUuid: target.uuid, owner: "OPPONENT" as const },
            },
        })),
    );

    const attackMoves: AiMove[] = aiBoard.map((minion) => ({
        type: "minion_action" as const,
        action: { minionId: minion.uuid, minionUuid: null, owner: "OPPONENT" as const },
    }));

    return { data: bound, moves: [...attackMoves, ...spellMoves] };
};

test.group("ai:prefilter moves", () => {
    test("a node saturated with spell targets still surfaces attacks", async ({ assert }) => {
        const { data, moves } = createSaturatedNode();

        const kept = prefilterMoves(moves, data, AI_USER_ID, TOP_K);

        assert.lengthOf(kept, TOP_K);
        assert.isNotEmpty(
            kept.filter((move) => move.type === "minion_action"),
            "the search must get to simulate at least one attack at this node",
        );
    });

    test("the quota does not displace anything when attacks already score well", async ({
        assert,
    }) => {
        // Cinq attaques, aucune carte en main : le quota n'a rien à réserver qui ne soit déjà là.
        const board = Array.from({ length: 5 }, (_, index) => readyMinion(`ai-${index}`, 4, 4));

        const data = createGameData({
            state: "PLAYER_TWO_TURN",
            currentRound: 8,
            playerOne: { health: 30 },
            playerTwo: { mana: 0, hand: [], board },
        });

        const bound: GameData = {
            ...data,
            playerOne: { ...data.playerOne, userId: OPPONENT_USER_ID },
            playerTwo: { ...data.playerTwo, userId: AI_USER_ID },
        };

        const moves: AiMove[] = board.map((minion) => ({
            type: "minion_action" as const,
            action: { minionId: minion.uuid, minionUuid: null, owner: "OPPONENT" as const },
        }));

        assert.lengthOf(prefilterMoves(moves, bound, AI_USER_ID, TOP_K), moves.length);
    });
});
