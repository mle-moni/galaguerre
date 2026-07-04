import { useQueryClient } from "@tanstack/react-query";
import { useApiMutation } from "~/hooks/use_api_mutation";
import { USER_QUERY_KEY } from "~/hooks/use_user";
import { client } from "~/services/client";
import { PACKS_QUERY_KEY } from "./use_collection.js";

export const useClaimProgressionLevelMutation = () => {
    const queryClient = useQueryClient();

    return useApiMutation({
        errorMessage: "Impossible de réclamer la récompense",
        mutationFn: async (level: number) => {
            return client.api.progression.claim({
                params: { level },
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: PACKS_QUERY_KEY });
        },
    });
};
