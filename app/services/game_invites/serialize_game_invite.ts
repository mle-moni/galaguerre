import type { ApiGameInvite, ApiSentGameInvite } from "#api_types/game_invite.types";
import type GameInvite from "#models/game_invite";

export const serializeIncomingGameInvite = (invite: GameInvite): ApiGameInvite => ({
    id: invite.id,
    fromUserId: invite.fromUserId,
    fromPseudo: invite.fromUser.pseudo,
    createdAt: invite.createdAt.toISO()!,
});

export const serializeSentGameInvite = (invite: GameInvite): ApiSentGameInvite => ({
    id: invite.id,
    toUserId: invite.toUserId,
    toPseudo: invite.toUser.pseudo,
    createdAt: invite.createdAt.toISO()!,
});
