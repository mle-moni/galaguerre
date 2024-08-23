import type { GamePlayer, PlayerCard } from "#api_types/game.types";
import Game from "#models/game";
import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import { getSocketDataFromSocketId } from "#services/sockets/sockets_data";

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

    const { userId } = socketData;

    const currentGame = await Game.query()
        .where((q) => q.where("playerOneId", userId).orWhere("playerTwoId", userId))
        .andWhere("isFinished", false)
        .first();

    if (!currentGame) {
        emitSocketEvent("notify_error", { error: "Vous n'êtes pas en jeu" }, socketId);
        return null;
    }

    return {
        currentGame,
        userId,
    };
};

export const whichPlayerAmI = (
    game: Game,
    userId: number,
): { player: GamePlayer; playerType: "PLAYER_ONE" | "PLAYER_TWO" } => {
    const p1 = game.data.playerOne;
    const p2 = game.data.playerTwo;

    if (p1.userId === userId)
        return {
            player: p1,
            playerType: "PLAYER_ONE",
        };

    return {
        player: p2,
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
