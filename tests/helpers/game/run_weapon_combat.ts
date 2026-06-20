import type { GameData } from "#api_types/game.types";
import type Game from "#models/game";
import { weaponToHeroAction } from "#controllers/games/weapon_action/weapon_to_hero_action";
import { weaponToMinionAction } from "#controllers/games/weapon_action/weapon_to_minion_action";
import { createInMemoryGame } from "./in_memory_game.js";

const TEST_SOCKET_ID = "test-socket";

const withTrainingGame = (data: GameData): Game =>
    createInMemoryGame({ ...data, isTraining: true });

export interface WeaponCombatOptions {
    targetIndex?: number;
    heroAttack?: boolean;
}

export const runWeaponCombat = async (
    data: GameData,
    options: WeaponCombatOptions = {},
): Promise<{ game: Game }> => {
    const game = withTrainingGame(data);
    const player = game.data.playerOne;
    const opponent = game.data.playerTwo;
    const weaponState = player.weaponState;

    if (!weaponState) {
        throw new Error("No weapon equipped");
    }

    if (options.heroAttack || options.targetIndex === undefined) {
        await weaponToHeroAction({
            weaponState,
            game,
            player,
            opponent,
            owner: "OPPONENT",
            socketId: TEST_SOCKET_ID,
        });
    } else {
        const targetMinion = opponent.board[options.targetIndex];
        if (!targetMinion) {
            throw new Error(`No target minion at index ${options.targetIndex}`);
        }

        await weaponToMinionAction({
            weaponState,
            game,
            player,
            opponent,
            owner: "OPPONENT",
            targetMinion,
            socketId: TEST_SOCKET_ID,
        });
    }

    return { game };
};

export const runWeaponCombatOnGame = async (
    game: Game,
    options: WeaponCombatOptions = {},
): Promise<{ game: Game }> => runWeaponCombat(game.data, options);
