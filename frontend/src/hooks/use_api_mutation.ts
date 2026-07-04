import {
    useMutation,
    type UseMutationOptions,
    type UseMutationResult,
} from "@tanstack/react-query";
import { getTuyauErrorResponse, isUnauthorizedError } from "~/helpers/tuyau_errors";
import { notifyApiError } from "~/services/toasts";

type ApiMutationOptions<TData, TError, TVariables, TContext> = UseMutationOptions<
    TData,
    TError,
    TVariables,
    TContext
> & {
    showErrorToast?: boolean;
    errorMessage?: string;
};

export const useApiMutation = <
    TData = unknown,
    TError = Error,
    TVariables = void,
    TContext = unknown,
>(
    options: ApiMutationOptions<TData, TError, TVariables, TContext>,
): UseMutationResult<TData, TError, TVariables, TContext> => {
    const { showErrorToast = true, errorMessage, onError, ...rest } = options;

    return useMutation({
        ...rest,
        onError: (error, variables, onMutateResult, context) => {
            if (showErrorToast && !isUnauthorizedError(error)) {
                notifyApiError(getTuyauErrorResponse(error), errorMessage);
            }

            onError?.(error, variables, onMutateResult, context);
        },
    });
};
