import { preloadDeckCardSet } from "#controllers/decks/deck_utils";
import { serializeDeck } from "#controllers/decks/serialize_deck";
import { createGame } from "#controllers/games/create_game";
import { findActiveGameForUser } from "#controllers/games/game_utils";
import Deck from "#models/deck";
import GameInvite from "#models/game_invite";
import type User from "#models/user";
import { isMutualFriend } from "#services/friendship/mutual_friendship";
import { isUserOnline } from "#services/presence/presence";
import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import { findQueueItemByUserId } from "#services/sockets/matchmaking";
import { WsRooms } from "#services/sockets/ws_rooms";
import { DeckValidationError } from "../../galaguerre/validation/validate_deck.js";
import { randomBoolean } from "../../utils/random.js";
import { cancelAllInvitesForUser, cancelInviteById } from "./cancel_game_invites.js";
import { GameInviteError } from "./create_game_invite.js";

const loadValidSelectedDeck = async (userId: number, label: string) => {
    const deck = await Deck.query()
        .where("userId", userId)
        .andWhere("selected", true)
        .preload("cards", preloadDeckCardSet)
        .preload("user")
        .first();

    if (!deck) {
        throw new GameInviteError(`${label} n'a pas de deck sélectionné`);
    }

    const serializedDeck = serializeDeck(deck);
    if (!serializedDeck.valid) {
        throw new GameInviteError(
            `Le deck de ${label.toLowerCase()} est invalide et ne peut pas être utilisé pour lancer une partie`,
        );
    }

    return deck;
};

const generatePseudo = (user: User) => user.pseudo ?? user.email.split("@")[0];

export const acceptGameInvite = async (inviteId: number, userId: number) => {
    const invite = await GameInvite.query()
        .where("id", inviteId)
        .where("toUserId", userId)
        .preload("fromUser")
        .first();

    if (!invite) {
        throw new GameInviteError("Invitation introuvable", 404);
    }

    const inviterId = invite.fromUserId;

    const areFriends = await isMutualFriend(inviterId, userId);
    if (!areFriends) {
        await cancelInviteById(invite.id);
        throw new GameInviteError("Vous devez être amis pour accepter cette invitation", 403);
    }

    if (!isUserOnline(invite.fromUser.lastSeenAt)) {
        await cancelInviteById(invite.id);
        throw new GameInviteError("L'inviteur n'est plus en ligne");
    }

    const [inviterActiveGame, inviteeActiveGame] = await Promise.all([
        findActiveGameForUser(inviterId),
        findActiveGameForUser(userId),
    ]);

    if (inviterActiveGame || inviteeActiveGame) {
        await cancelInviteById(invite.id);
        throw new GameInviteError("Un des joueurs a déjà une partie en cours");
    }

    if (findQueueItemByUserId(inviterId) || findQueueItemByUserId(userId)) {
        await cancelInviteById(invite.id);
        throw new GameInviteError("Un des joueurs est déjà en recherche de partie");
    }

    const [inviterDeck, inviteeDeck] = await Promise.all([
        loadValidSelectedDeck(inviterId, "L'inviteur"),
        loadValidSelectedDeck(userId, "Vous"),
    ]);

    const humanOne = {
        userId: inviterId,
        pseudo: generatePseudo(invite.fromUser),
        avatarCardId: invite.fromUser.avatarCardId,
        deck: inviterDeck,
    };
    const humanTwo = {
        userId,
        pseudo: generatePseudo(inviteeDeck.user),
        avatarCardId: inviteeDeck.user.avatarCardId,
        deck: inviteeDeck,
    };

    let game;
    try {
        const swapSeats = randomBoolean();
        const playerOne = swapSeats ? humanTwo : humanOne;
        const playerTwo = swapSeats ? humanOne : humanTwo;

        game = await createGame({ playerOne, playerTwo });
    } catch (error) {
        if (error instanceof DeckValidationError) {
            await cancelInviteById(invite.id);
            throw new GameInviteError("Un des decks est invalide");
        }

        throw error;
    }

    await invite.delete();
    await cancelAllInvitesForUser(inviterId);
    await cancelAllInvitesForUser(userId);

    emitSocketEvent("game:created", { gameId: game.id }, [
        WsRooms.personalSocketRoom(inviterId),
        WsRooms.personalSocketRoom(userId),
    ]);

    return { gameId: game.id };
};
