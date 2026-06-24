import { Button, Center, Modal, Stack, Text } from "@mantine/core";
import { PackIcon } from "~/components/rewards/pack_icon";
import { useMutation } from "@tanstack/react-query";
import { observer } from "mobx-react-lite";
import { useState } from "react";
import { useLocation } from "react-router-dom";
import type { ApiClaimDailyPackResponse } from "#api_types/rewards.types";
import { PACKS_QUERY_KEY } from "~/hooks/use_collection";
import { USER_QUERY_KEY, useUser } from "~/hooks/use_user";
import { privateAxios } from "~/services/axios";
import { queryClient } from "~/services/query_client";
import { notifyError, notifySuccess } from "~/services/toasts";

const HIDDEN_ROUTES = new Set(["/play", "/login", "/register"]);

export const DailyPackModal = observer(() => {
    const user = useUser();
    const location = useLocation();
    const [dismissed, setDismissed] = useState(false);

    const claimMutation = useMutation({
        mutationFn: async () => {
            const response =
                await privateAxios.post<ApiClaimDailyPackResponse>("/api/rewards/daily-pack");
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: PACKS_QUERY_KEY });
            notifySuccess("Paquet quotidien obtenu !");
            setDismissed(true);
        },
        onError: () => {
            notifyError("Impossible de réclamer le paquet quotidien");
        },
    });

    const shouldShow =
        user?.canClaimDailyPack && !dismissed && !HIDDEN_ROUTES.has(location.pathname);

    return (
        <Modal
            opened={shouldShow}
            onClose={() => setDismissed(true)}
            title="Paquet quotidien"
            centered
        >
            <Stack gap="md">
                <Center>
                    <PackIcon width={100} />
                </Center>
                <Text size="sm">Venez chaque jour pour récupérer votre paquet offert.</Text>
                <Button
                    onClick={() => claimMutation.mutate()}
                    loading={claimMutation.isPending}
                    className="gg-btn-primary"
                >
                    Obtenir
                </Button>
            </Stack>
        </Modal>
    );
});
