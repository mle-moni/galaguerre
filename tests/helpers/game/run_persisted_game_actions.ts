import type { ActionTarget, GameData, MinionCard } from "#api_types/game.types";
import type Game from "#models/game";
import { performPassTurn } from "#controllers/games/pass_game_turn";
import { minionToHeroAction } from "#controllers/games/minion_action/minion_to_hero_action";
import { minionToMinionAction } from "#controllers/games/minion_action/minion_to_minion_action";
import { playMinion } from "#controllers/games/play_card/play_minion";
import { createTestGame, type PlayerKey } from "./game_factory.js";

const TEST_SOCKET_ID = "test-socket";

export interface MinionCombatOptions {
    attackerIndex?: number;
    targetIndex?: number;
    heroAttack?: boolean;
}

export interface PlayMinionOptions {
    boardIndex?: number;
    actionTarget?: ActionTarget;
    actor?: PlayerKey;
}

const executeMinionCombat = async (
    game: Game,
    options: MinionCombatOptions = {},
): Promise<Game> => {
    const attackerIndex = options.attackerIndex ?? 0;
    const targetIndex = options.targetIndex ?? 0;
    const player = game.data.playerOne;
    const opponent = game.data.playerTwo;
    const minion = player.board[attackerIndex];

    if (!minion) {
        throw new Error(`No attacker minion at index ${attackerIndex}`);
    }

    const minionInfos = {
        minion,
        position: { boardIndex: attackerIndex, owner: "PLAYER" as const },
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
        const targetMinion = opponent.board[targetIndex];
        if (!targetMinion) {
            throw new Error(`No target minion at index ${targetIndex}`);
        }

        await minionToMinionAction({
            minionInfos,
            game,
            player,
            opponent,
            owner: "OPPONENT",
            targetMinion,
            socketId: TEST_SOCKET_ID,
        });
    }

    await game.refresh();
    return game;
};

export const runMinionCombatOnPersistedGame = async (
    data: GameData,
    options: MinionCombatOptions = {},
): Promise<{ game: Game }> => {
    const { game } = await createTestGame(data);
    return { game: await executeMinionCombat(game, options) };
};

export const runMinionCombatOnGame = async (
    game: Game,
    options: MinionCombatOptions = {},
): Promise<{ game: Game }> => {
    return { game: await executeMinionCombat(game, options) };
};

export const runPlayMinionOnPersistedGame = async (
    data: GameData,
    card: MinionCard,
    options: PlayMinionOptions = {},
): Promise<{ game: Game }> => {
    const boardIndex = options.boardIndex ?? 0;
    const actor = options.actor ?? "playerOne";
    const { game } = await createTestGame(data);
    const player = game.data[actor];

    await playMinion({
        card,
        boardIndex,
        owner: "PLAYER",
        player,
        game,
        socketId: TEST_SOCKET_ID,
        actionTarget: options.actionTarget,
    });

    await game.refresh();
    return { game };
};

export const runPassTurnOnPersistedGame = async (data: GameData): Promise<{ game: Game }> => {
    const { game } = await createTestGame(data);
    const activePlayer =
        game.data.state === "PLAYER_ONE_TURN" ? game.data.playerOne : game.data.playerTwo;

    await performPassTurn(game, activePlayer);
    await game.refresh();

    return { game };
};

export const runPassTurnOnGame = async (game: Game): Promise<{ game: Game }> => {
    const activePlayer =
        game.data.state === "PLAYER_ONE_TURN" ? game.data.playerOne : game.data.playerTwo;

    await performPassTurn(game, activePlayer);
    await game.refresh();

    return { game };
};
