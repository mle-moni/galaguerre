import { ActionIcon, Tooltip } from "@mantine/core";
import { IconUserMinus, IconUserPlus } from "@tabler/icons-react";
import type { MouseEvent } from "react";
import { useAddFriendMutation, useRemoveFriendMutation } from "~/hooks/use_friends";
import { useUser } from "~/hooks/use_user";

interface FriendActionButtonProps {
    userId: number;
    isFriend: boolean;
    size?: "sm" | "md";
}

export const FriendActionButton = ({ userId, isFriend, size = "sm" }: FriendActionButtonProps) => {
    const user = useUser();
    const addFriendMutation = useAddFriendMutation();
    const removeFriendMutation = useRemoveFriendMutation();

    if (!user || user.id === userId) return null;

    const isLoading =
        (addFriendMutation.isPending && addFriendMutation.variables === userId) ||
        (removeFriendMutation.isPending && removeFriendMutation.variables === userId);
    const label = isFriend ? "Retirer des amis" : "Ajouter en ami";

    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();

        if (isFriend) {
            removeFriendMutation.mutate(userId);
            return;
        }

        addFriendMutation.mutate(userId);
    };

    return (
        <Tooltip label={label} withArrow>
            <ActionIcon
                aria-label={label}
                color={isFriend ? "red" : "gold"}
                loading={isLoading}
                onClick={handleClick}
                size={size}
                variant={isFriend ? "subtle" : "filled"}
            >
                {isFriend ? <IconUserMinus size={16} /> : <IconUserPlus size={16} />}
            </ActionIcon>
        </Tooltip>
    );
};
