import { cancelInvitesAsInvitee } from "./cancel_game_invites.js";

const INVITE_DISCONNECT_GRACE_MS = 8_000;

const pendingInviteeRemovals = new Map<number, ReturnType<typeof setTimeout>>();

export const scheduleInviteeInviteRemoval = (userId: number) => {
    cancelInviteeInviteRemoval(userId);

    const timeout = setTimeout(() => {
        void cancelInvitesAsInvitee(userId);
        pendingInviteeRemovals.delete(userId);
    }, INVITE_DISCONNECT_GRACE_MS);

    pendingInviteeRemovals.set(userId, timeout);
};

export const cancelInviteeInviteRemoval = (userId: number) => {
    const timeout = pendingInviteeRemovals.get(userId);
    if (!timeout) return;

    clearTimeout(timeout);
    pendingInviteeRemovals.delete(userId);
};
