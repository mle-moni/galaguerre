import { useQuery, type UseQueryOptions, type UseQueryResult } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { getTuyauErrorResponse, isUnauthorizedError } from "~/helpers/tuyau_errors";
import { notifyApiError } from "~/services/toasts";

type ApiQueryOptions<
    TQueryFnData = unknown,
    TError = Error,
    TData = TQueryFnData,
    TQueryKey extends readonly unknown[] = readonly unknown[],
> = UseQueryOptions<TQueryFnData, TError, TData, TQueryKey> & {
    showErrorToast?: boolean;
    errorMessage?: string;
};

export const useApiQuery = <
    TQueryFnData = unknown,
    TError = Error,
    TData = TQueryFnData,
    TQueryKey extends readonly unknown[] = readonly unknown[],
>(
    options: ApiQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
): UseQueryResult<TData, TError> => {
    const { showErrorToast = false, errorMessage, ...rest } = options;
    const query = useQuery(rest);
    const notifiedErrorRef = useRef<unknown>(null);

    useEffect(() => {
        if (!showErrorToast || !query.isError || !query.error) return;
        if (isUnauthorizedError(query.error)) return;
        if (notifiedErrorRef.current === query.error) return;

        notifiedErrorRef.current = query.error;
        notifyApiError(getTuyauErrorResponse(query.error), errorMessage);
    }, [showErrorToast, errorMessage, query.isError, query.error]);

    return query;
};
