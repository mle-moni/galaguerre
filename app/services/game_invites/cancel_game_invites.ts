import GameInvite from "#models/game_invite";
import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import { WsRooms } from "#services/sockets/ws_rooms";
import { serializeIncomingGameInvite, serializeSentGameInvite } from "./serialize_game_invite.js";

const notifyInviteCancelled = (invite: GameInvite) => {
    const payload = { inviteId: invite.id };

    emitSocketEvent("game:invite_cancelled", payload, [
        WsRooms.personalSocketRoom(invite.fromUserId),
        WsRooms.personalSocketRoom(invite.toUserId),
    ]);
};

export const cancelInviteById = async (inviteId: number) => {
    const invite = await GameInvite.query().where("id", inviteId).first();
    if (!invite) return null;

    await invite.delete();
    notifyInviteCancelled(invite);

    return invite;
};

export const cancelInvitesAsInvitee = async (userId: number) => {
    const invites = await GameInvite.query().where("toUserId", userId);

    for (const invite of invites) {
        await invite.delete();
        notifyInviteCancelled(invite);
    }
};

export const cancelInvitesAsInviter = async (userId: number) => {
    const invite = await GameInvite.query().where("fromUserId", userId).first();
    if (!invite) return;

    await invite.delete();
    notifyInviteCancelled(invite);
};

export const cancelAllInvitesForUser = async (userId: number) => {
    await cancelInvitesAsInvitee(userId);
    await cancelInvitesAsInviter(userId);
};

export const findSentInviteToUser = async (fromUserId: number, toUserId: number) => {
    return GameInvite.query()
        .where("fromUserId", fromUserId)
        .where("toUserId", toUserId)
        .preload("toUser")
        .first();
};

export const findSentInviteByUser = async (fromUserId: number) => {
    return GameInvite.query().where("fromUserId", fromUserId).preload("toUser").first();
};

export { serializeIncomingGameInvite, serializeSentGameInvite };
