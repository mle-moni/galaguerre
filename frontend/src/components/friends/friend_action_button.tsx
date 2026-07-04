import type { FriendRequestStatus } from "#api_types/friend.types";
import { ActionIcon, Tooltip } from "@mantine/core";
import { IconClock, IconUserMinus, IconUserPlus } from "@tabler/icons-react";
import { useMemo, type MouseEvent } from "react";
import {
    useCancelFriendRequestMutation,
    useSentFriendRequestsQuery,
} from "~/hooks/use_friend_requests";
import { useAddFriendMutation, useRemoveFriendMutation } from "~/hooks/use_friends";
import { useUser } from "~/hooks/use_user";

interface FriendActionButtonProps {
    userId: number;
    isFriend: boolean;
    friendRequestStatus?: FriendRequestStatus;
    size?: "sm" | "md";
}

export const FriendActionButton = ({
    userId,
    isFriend,
    friendRequestStatus,
    size = "sm",
}: FriendActionButtonProps) => {
    const user = useUser();
    const sentRequestsQuery = useSentFriendRequestsQuery();
    const addFriendMutation = useAddFriendMutation();
    const removeFriendMutation = useRemoveFriendMutation();
    const cancelFriendRequestMutation = useCancelFriendRequestMutation();

    const sentRequest = useMemo(
        () => (sentRequestsQuery.data ?? []).find((request) => request.toUserId === userId),
        [sentRequestsQuery.data, userId],
    );

    const resolvedStatus: FriendRequestStatus =
        friendRequestStatus ?? (sentRequest ? "sent" : "none");

    if (!user || user.id === userId) return null;
    if (resolvedStatus === "received") return null;

    const isLoading =
        (addFriendMutation.isPending && addFriendMutation.variables === userId) ||
        (removeFriendMutation.isPending && removeFriendMutation.variables === userId) ||
        (cancelFriendRequestMutation.isPending &&
            cancelFriendRequestMutation.variables === sentRequest?.id);

    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();

        if (isFriend) {
            removeFriendMutation.mutate(userId);
            return;
        }

        if (resolvedStatus === "sent" && sentRequest) {
            cancelFriendRequestMutation.mutate(sentRequest.id);
            return;
        }

        addFriendMutation.mutate(userId);
    };

    if (isFriend) {
        return (
            <Tooltip label="Retirer des amis" withArrow>
                <ActionIcon
                    aria-label="Retirer des amis"
                    color="red"
                    loading={isLoading}
                    onClick={handleClick}
                    size={size}
                    variant="subtle"
                >
                    <IconUserMinus size={16} />
                </ActionIcon>
            </Tooltip>
        );
    }

    if (resolvedStatus === "sent") {
        return (
            <Tooltip label="Demande envoyée — cliquer pour annuler" withArrow>
                <ActionIcon
                    aria-label="Annuler la demande d'ami"
                    color="gray"
                    loading={isLoading}
                    onClick={handleClick}
                    size={size}
                    variant="subtle"
                >
                    <IconClock size={16} />
                </ActionIcon>
            </Tooltip>
        );
    }

    return (
        <Tooltip label="Envoyer une demande d'ami" withArrow>
            <ActionIcon
                aria-label="Envoyer une demande d'ami"
                color="gold"
                loading={isLoading}
                onClick={handleClick}
                size={size}
                variant="filled"
            >
                <IconUserPlus size={16} />
            </ActionIcon>
        </Tooltip>
    );
};
