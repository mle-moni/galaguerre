import type {
    ActionTarget,
    GameData,
    MinionCard,
    MinionSpotId,
    PlayerCard,
} from "#api_types/game.types";
import type Game from "#models/game";
import { playMinion } from "#controllers/games/play_card/play_minion";
import { playSpell } from "#controllers/games/play_card/play_spell";
import { playWeapon } from "#controllers/games/play_card/play_weapon";
import { createInMemoryGame } from "./in_memory_game.js";

const TEST_SOCKET_ID = "test-socket";

const withTrainingGame = (data: GameData): Game =>
    createInMemoryGame({ ...data, isTraining: true });

export type PlayerKey = "playerOne" | "playerTwo";

export interface PlayMinionOptions {
    spotId?: MinionSpotId;
    actionTarget?: ActionTarget;
    actor?: PlayerKey;
}

export const runPlayMinion = async (
    data: GameData,
    card: MinionCard,
    options: PlayMinionOptions = {},
): Promise<{ game: Game }> => {
    const spotId = options.spotId ?? "SPOT_1";
    const actor = options.actor ?? "playerOne";
    const game = withTrainingGame(data);
    const player = game.data[actor];

    await playMinion({
        card,
        spotId,
        owner: "PLAYER",
        player,
        game,
        socketId: TEST_SOCKET_ID,
        actionTarget: options.actionTarget,
    });

    return { game };
};

export const runPlayMinionOnGame = async (
    game: Game,
    card: MinionCard,
    options: PlayMinionOptions = {},
): Promise<{ game: Game }> => {
    const spotId = options.spotId ?? "SPOT_1";
    const actor = options.actor ?? "playerOne";
    const player = game.data[actor];

    await playMinion({
        card,
        spotId,
        owner: "PLAYER",
        player,
        game,
        socketId: TEST_SOCKET_ID,
        actionTarget: options.actionTarget,
    });

    return { game };
};

export const runPlayWeaponOnGame = async (
    game: Game,
    card: Extract<PlayerCard, { type: "WEAPON" }>,
    actor: PlayerKey = "playerOne",
): Promise<{ game: Game }> => {
    const player = game.data[actor];

    await playWeapon({
        card,
        player,
        game,
        socketId: TEST_SOCKET_ID,
        spotId: null,
        owner: "PLAYER",
    });

    return { game };
};

export const runPlaySpell = async (
    data: GameData,
    card: Extract<PlayerCard, { type: "SPELL" }>,
    actionTarget?: ActionTarget,
    actor: PlayerKey = "playerOne",
): Promise<{ game: Game }> => {
    const game = withTrainingGame(data);
    const player = game.data[actor];

    await playSpell({
        card,
        player,
        game,
        socketId: TEST_SOCKET_ID,
        owner: "PLAYER",
        spotId: null,
        actionTarget,
    });

    return { game };
};

export const runPlayWeapon = async (
    data: GameData,
    card: Extract<PlayerCard, { type: "WEAPON" }>,
    actor: PlayerKey = "playerOne",
): Promise<{ game: Game }> => {
    const game = withTrainingGame(data);
    const player = game.data[actor];

    await playWeapon({
        card,
        player,
        game,
        socketId: TEST_SOCKET_ID,
        spotId: null,
        owner: "PLAYER",
    });

    return { game };
};
