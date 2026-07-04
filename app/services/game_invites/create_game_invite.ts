import { preloadDeckCardSet } from "#controllers/decks/deck_utils";
import { serializeDeck } from "#controllers/decks/serialize_deck";
import { findActiveGameForUser } from "#controllers/games/game_utils";
import type { ApiSentGameInvite } from "#api_types/game_invite.types";
import Deck from "#models/deck";
import GameInvite from "#models/game_invite";
import User from "#models/user";
import { isMutualFriend } from "#services/friendship/mutual_friendship";
import { isUserOnline } from "#services/presence/presence";
import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import { findQueueItemByUserId } from "#services/sockets/matchmaking";
import { WsRooms } from "#services/sockets/ws_rooms";
import {
    findSentInviteByUser,
    findSentInviteToUser,
    serializeIncomingGameInvite,
    serializeSentGameInvite,
} from "./cancel_game_invites.js";

export class GameInviteError extends Error {
    constructor(
        message: string,
        readonly statusCode: 400 | 403 | 404 = 400,
    ) {
        super(message);
    }
}

const assertUserAvailableForInvite = async (userId: number, label: string) => {
    const activeGame = await findActiveGameForUser(userId);
    if (activeGame) {
        throw new GameInviteError(`${label} a déjà une partie en cours`);
    }

    if (findQueueItemByUserId(userId)) {
        throw new GameInviteError(`${label} est déjà en recherche de partie`);
    }
};

const assertInviterDeckValid = async (userId: number) => {
    const deck = await Deck.query()
        .where("userId", userId)
        .andWhere("selected", true)
        .preload("cards", preloadDeckCardSet)
        .first();

    if (!deck) {
        throw new GameInviteError("Vous n'avez pas de deck sélectionné");
    }

    const serializedDeck = serializeDeck(deck);
    if (!serializedDeck.valid) {
        throw new GameInviteError(
            "Votre deck est invalide et ne peut pas être utilisé pour lancer une partie",
        );
    }

    return deck;
};

export const createGameInvite = async (
    fromUserId: number,
    toUserId: number,
): Promise<ApiSentGameInvite> => {
    if (fromUserId === toUserId) {
        throw new GameInviteError("Vous ne pouvez pas vous inviter vous-même");
    }

    const [inviter, invitee] = await Promise.all([User.find(fromUserId), User.find(toUserId)]);

    if (!inviter || !invitee) {
        throw new GameInviteError("Joueur introuvable", 404);
    }

    const areFriends = await isMutualFriend(fromUserId, toUserId);
    if (!areFriends) {
        throw new GameInviteError("Vous devez être amis pour envoyer une invitation", 403);
    }

    if (!isUserOnline(invitee.lastSeenAt)) {
        throw new GameInviteError("Ce joueur n'est pas en ligne");
    }

    await assertUserAvailableForInvite(fromUserId, "Vous");
    await assertUserAvailableForInvite(toUserId, "Ce joueur");
    await assertInviterDeckValid(fromUserId);

    const existingToSameFriend = await findSentInviteToUser(fromUserId, toUserId);
    if (existingToSameFriend) {
        return serializeSentGameInvite(existingToSameFriend);
    }

    const existingOutgoing = await findSentInviteByUser(fromUserId);
    if (existingOutgoing) {
        throw new GameInviteError("Vous avez déjà une invitation en attente");
    }

    const invite = await GameInvite.create({
        fromUserId,
        toUserId,
    });
    await invite.load("fromUser");
    await invite.load("toUser");

    emitSocketEvent(
        "game:invite_received",
        { invite: serializeIncomingGameInvite(invite) },
        WsRooms.personalSocketRoom(toUserId),
    );

    return serializeSentGameInvite(invite);
};
