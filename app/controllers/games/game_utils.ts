import {
    type BoardState,
    type GamePlayer,
    type MinionPosition,
    type MinionState,
    type PlayerCard,
    type PlayerNumber,
    type SpotOwner,
    type WeaponState,
} from "#api_types/game.types";
import { migrateGameBoards } from "#api_types/board";
import Game from "#models/game";
import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import { getSocketDataFromSocketId } from "#services/sockets/sockets_data";
import { TRAINING_AI_USER_ID } from "#services/training/training_constants";
import { popStealth } from "../../galaguerre/action_engine/apply_damage_to_minion.js";

export const findActiveGameForUser = async (userId: number) => {
    return Game.query()
        .where((q) => q.where("playerOneId", userId).orWhere("playerTwoId", userId))
        .andWhere("isFinished", false)
        .first();
};
import { recordHeroAttack as recordHeroAttackStat } from "../../galaguerre/game_stats/record_player_stats.js";
import { canOpponentDirectlyTargetMinion } from "#api_types/target_matching";

export const getGameActionInfos = async (socketId: string) => {
    const socketData = getSocketDataFromSocketId(socketId);

    if (!socketData) {
        emitSocketEvent(
            "notify_error",
            { error: "Une erreur est survenue, essayez de rafraichir la page" },
            socketId,
        );
        return null;
    }

    const { userId, gameId } = socketData;

    let currentGame: Game | null = null;

    if (userId === TRAINING_AI_USER_ID && gameId !== undefined) {
        currentGame = await Game.query().where("id", gameId).andWhere("isFinished", false).first();

        if (currentGame && !currentGame.data.isTraining) {
            currentGame = null;
        }
    } else {
        currentGame = await Game.query()
            .where((q) => q.where("playerOneId", userId).orWhere("playerTwoId", userId))
            .andWhere("isFinished", false)
            .if(gameId !== undefined, (query) => query.where("id", gameId!))
            .first();
    }

    if (!currentGame) {
        emitSocketEvent("notify_error", { error: "Vous n'êtes pas en jeu" }, socketId);
        return null;
    }

    if (migrateGameBoards(currentGame.data.playerOne, currentGame.data.playerTwo)) {
        await currentGame.save();
    }

    return {
        currentGame,
        userId,
    };
};

export const whichPlayerAmI = (
    game: Game,
    userId: number,
): { player: GamePlayer; opponent: GamePlayer; playerType: PlayerNumber } => {
    const p1 = game.data.playerOne;
    const p2 = game.data.playerTwo;

    if (p1.userId === userId)
        return {
            player: p1,
            opponent: p2,
            playerType: "PLAYER_ONE",
        };

    return {
        player: p2,
        opponent: p1,
        playerType: "PLAYER_TWO",
    };
};

export const getIsMyTurn = (game: Game, userId: number) => {
    const { playerType } = whichPlayerAmI(game, userId);

    if (game.data.state === "PLAYER_ONE_TURN" && playerType === "PLAYER_ONE") return true;
    if (game.data.state === "PLAYER_TWO_TURN" && playerType === "PLAYER_TWO") return true;

    return false;
};

export const ensureIsMyTurn = (game: Game, userId: number, socketId: string): boolean => {
    const isMyTurn = getIsMyTurn(game, userId);

    if (!isMyTurn) {
        emitSocketEvent("notify_error", { error: "Ce n'est pas votre tour (gros con)" }, socketId);
    }

    return isMyTurn;
};

export const findCardInHand = (hand: PlayerCard[], cardId: string) => {
    const found = hand.find((card) => card.uuid === cardId);

    return found ?? null;
};

export const ensureCardFoundInHand = (hand: PlayerCard[], cardId: string, socketId: string) => {
    const card = findCardInHand(hand, cardId);

    if (!card) {
        emitSocketEvent(
            "notify_error",
            { error: "Cette carte n'est pas dans votre main (gros con)" },
            socketId,
        );
    }

    return card;
};

export const findMinionInBoard = (
    board: BoardState,
    minionId: string,
    owner: SpotOwner,
): MinionPosition | null => {
    const boardIndex = board.findIndex((minion) => minion.uuid === minionId);
    if (boardIndex === -1) return null;

    return {
        position: { boardIndex, owner },
        minion: board[boardIndex],
    };
};

export const ensureMinionFoundInBoard = (
    board: BoardState,
    minionId: string,
    owner: SpotOwner,
    socketId: string,
) => {
    const minion = findMinionInBoard(board, minionId, owner);

    if (!minion) {
        emitSocketEvent(
            "notify_error",
            { error: "Ce monstre n'est pas sur le plateau (gros con)" },
            socketId,
        );
    }

    return minion;
};

export const getMinionHasTaunt = (minion: MinionState): boolean => {
    if (minion.originalCard.type !== "MINION") return false;
    return minion.originalCard.minionPowers?.hasTaunt ?? false;
};

export const getMinionHasCharge = (minion: MinionState): boolean => {
    if (minion.originalCard.type !== "MINION") return false;
    return minion.originalCard.minionPowers?.hasCharge ?? false;
};

export const getMinionHasRush = (minion: MinionState): boolean => {
    if (minion.originalCard.type !== "MINION") return false;
    return minion.originalCard.minionPowers?.hasRush ?? false;
};

export const getMinionHasWindfury = (minion: MinionState): boolean => {
    if (minion.originalCard.type !== "MINION") return false;
    return minion.originalCard.minionPowers?.hasWindfury ?? false;
};

export const getMinionIsPoisonous = (minion: MinionState): boolean => {
    if (minion.originalCard.type !== "MINION") return false;
    return minion.originalCard.minionPowers?.isPoisonous ?? false;
};

export const getMinionMaxAttacks = (minion: MinionState): number => {
    return getMinionHasWindfury(minion) ? 2 : 1;
};

export const getMinionAttacksThisRound = (minion: MinionState, currentRound: number): number => {
    if (minion.lastActionAtRound !== currentRound) return 0;
    return minion.attacksThisRound ?? 1;
};

export const recordMinionAttack = (minion: MinionState, currentRound: number): void => {
    if (minion.lastActionAtRound !== currentRound) {
        minion.attacksThisRound = 1;
    } else {
        minion.attacksThisRound = (minion.attacksThisRound ?? 1) + 1;
    }
    minion.lastActionAtRound = currentRound;
    popStealth(minion);
};

export const canMinionAttack = (minion: MinionState, currentRound: number): boolean => {
    if (minion.attack <= 0) return false;
    if (getMinionAttacksThisRound(minion, currentRound) >= getMinionMaxAttacks(minion))
        return false;
    if (
        minion.placedAtRound === currentRound &&
        !getMinionHasCharge(minion) &&
        !getMinionHasRush(minion)
    )
        return false;
    return true;
};

export const canMinionAttackHero = (minion: MinionState, currentRound: number): boolean => {
    if (!canMinionAttack(minion, currentRound)) return false;
    if (
        minion.placedAtRound === currentRound &&
        getMinionHasRush(minion) &&
        !getMinionHasCharge(minion)
    )
        return false;
    return true;
};

export const boardHasTaunt = (board: BoardState): boolean => {
    return board.some((minion) => getMinionHasTaunt(minion));
};

export const boardHasAttackableTaunt = (board: BoardState): boolean => {
    return board.some(
        (minion) => getMinionHasTaunt(minion) && canOpponentDirectlyTargetMinion(minion),
    );
};

export const getHeroAttacksThisRound = (player: GamePlayer, currentRound: number): number => {
    if (player.heroLastAttackAtRound !== currentRound) return 0;
    return player.heroAttacksThisRound ?? 1;
};

export const recordHeroAttack = (player: GamePlayer, currentRound: number): void => {
    if (player.heroLastAttackAtRound !== currentRound) {
        player.heroAttacksThisRound = 1;
    } else {
        player.heroAttacksThisRound = (player.heroAttacksThisRound ?? 1) + 1;
    }
    player.heroLastAttackAtRound = currentRound;
    recordHeroAttackStat(player);
};

export const canHeroAttack = (player: GamePlayer, currentRound: number): boolean => {
    return getHeroAttacksThisRound(player, currentRound) < 1;
};

export const canWeaponAttack = (
    player: GamePlayer,
    weaponState: WeaponState | null,
    currentRound: number,
): boolean => {
    if (!weaponState) return false;
    return canHeroAttack(player, currentRound);
};

export const ensureValidAttackTarget = (
    opponentBoard: BoardState,
    owner: SpotOwner,
    targetMinion: MinionState | null,
    socketId: string,
): boolean => {
    if (boardHasAttackableTaunt(opponentBoard)) {
        if (!targetMinion || owner !== "OPPONENT") {
            emitSocketEvent(
                "notify_error",
                { error: "Vous devez d'abord attaquer un monstre avec Provocation" },
                socketId,
            );
            return false;
        }

        if (!getMinionHasTaunt(targetMinion)) {
            emitSocketEvent(
                "notify_error",
                { error: "Vous devez d'abord attaquer un monstre avec Provocation" },
                socketId,
            );
            return false;
        }
    }

    if (targetMinion && owner === "OPPONENT" && !canOpponentDirectlyTargetMinion(targetMinion)) {
        emitSocketEvent("notify_error", { error: "Ce monstre ne peut pas être ciblé" }, socketId);
        return false;
    }

    return true;
};

/** @deprecated Use ensureValidAttackTarget */
export const ensureValidTauntTarget = ensureValidAttackTarget;
