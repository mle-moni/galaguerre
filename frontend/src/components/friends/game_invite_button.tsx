import type { ApiFriend } from "#api_types/friend.types";
import { ActionIcon, Tooltip } from "@mantine/core";
import { IconClock, IconDeviceGamepad2 } from "@tabler/icons-react";
import { useMemo, type MouseEvent } from "react";
import {
    useCancelGameInviteMutation,
    useSendGameInviteMutation,
    useSentGameInvitesQuery,
} from "~/hooks/use_game_invites";
import { useUser } from "~/hooks/use_user";

interface GameInviteButtonProps {
    friend: Pick<ApiFriend, "userId" | "isOnline" | "currentGameId">;
    size?: "sm" | "md";
}

const getDisabledReason = (friend: GameInviteButtonProps["friend"]) => {
    if (!friend.isOnline) return "Ce joueur n'est pas en ligne";
    if (friend.currentGameId !== null) return "Ce joueur est déjà en partie";
    return null;
};

export const GameInviteButton = ({ friend, size = "sm" }: GameInviteButtonProps) => {
    const user = useUser();
    const sentInvitesQuery = useSentGameInvitesQuery();
    const sendInviteMutation = useSendGameInviteMutation();
    const cancelInviteMutation = useCancelGameInviteMutation();

    const sentInvite = useMemo(
        () => (sentInvitesQuery.data ?? []).find((invite) => invite.toUserId === friend.userId),
        [friend.userId, sentInvitesQuery.data],
    );

    const pendingInviteToOther = useMemo(() => {
        const invites = sentInvitesQuery.data ?? [];
        if (invites.length === 0) return null;
        if (sentInvite) return null;
        return invites[0] ?? null;
    }, [sentInvite, sentInvitesQuery.data]);

    if (!user || user.id === friend.userId) return null;

    const disabledReason = getDisabledReason(friend);
    const isLoading =
        (sendInviteMutation.isPending && sendInviteMutation.variables === friend.userId) ||
        (cancelInviteMutation.isPending && cancelInviteMutation.variables === sentInvite?.id);

    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();

        if (sentInvite) {
            cancelInviteMutation.mutate(sentInvite.id);
            return;
        }

        sendInviteMutation.mutate(friend.userId);
    };

    if (sentInvite) {
        return (
            <Tooltip label="Invitation envoyée — cliquer pour annuler" withArrow>
                <ActionIcon
                    aria-label="Annuler l'invitation à jouer"
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

    const tooltipLabel =
        disabledReason ??
        (pendingInviteToOther
            ? "Vous avez déjà une invitation en attente"
            : "Inviter à jouer — Match amical");

    return (
        <Tooltip label={tooltipLabel} withArrow>
            <ActionIcon
                aria-label="Inviter à jouer un match amical"
                color="gold"
                disabled={Boolean(disabledReason) || Boolean(pendingInviteToOther)}
                loading={isLoading}
                onClick={handleClick}
                size={size}
                variant="filled"
            >
                <IconDeviceGamepad2 size={16} />
            </ActionIcon>
        </Tooltip>
    );
};
