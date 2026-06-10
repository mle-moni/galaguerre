import type { GameData, MinionSpotId } from "#api_types/game.types";
import type Game from "#models/game";
import { minionToHeroAction } from "#controllers/games/minion_action/minion_to_hero_action";
import { minionToMinionAction } from "#controllers/games/minion_action/minion_to_minion_action";
import { createInMemoryGame } from "./in_memory_game.js";

const TEST_SOCKET_ID = "test-socket";

const withTrainingGame = (data: GameData): Game => createInMemoryGame({ ...data, isTraining: true });

export interface MinionCombatOptions {
    attackerSpot?: MinionSpotId;
    targetSpot?: MinionSpotId;
    heroAttack?: boolean;
}

export const runMinionCombat = async (
    data: GameData,
    options: MinionCombatOptions = {},
): Promise<{ game: Game }> => {
    const attackerSpot = options.attackerSpot ?? "SPOT_1";
    const targetSpot = options.targetSpot ?? "SPOT_1";
    const game = withTrainingGame(data);
    const player = game.data.playerOne;
    const opponent = game.data.playerTwo;
    const minion = player.board[attackerSpot];

    if (!minion) {
        throw new Error(`No attacker minion at ${attackerSpot}`);
    }

    const minionInfos = {
        minion,
        position: { spotId: attackerSpot, owner: "PLAYER" as const },
    };

    if (options.heroAttack) {
        await minionToHeroAction({
            minionInfos,
            game,
            player,
            opponent,
            owner: "OPPONENT",
            socketId: TEST_SOCKET_ID,
        });
    } else {
        await minionToMinionAction({
            minionInfos,
            game,
            player,
            opponent,
            owner: "OPPONENT",
            spotId: targetSpot,
            socketId: TEST_SOCKET_ID,
        });
    }

    return { game };
};

export const runMinionCombatOnGame = async (
    game: Game,
    options: MinionCombatOptions = {},
): Promise<{ game: Game }> => {
    return runMinionCombat(game.data, options);
};
