import type { TuyauHTTPError } from "@tuyau/core/client";

export const getTuyauErrorStatus = (error: unknown): number | undefined => {
    if (error instanceof Error && "status" in error) {
        return (error as TuyauHTTPError).status;
    }

    return undefined;
};

export const getTuyauErrorResponse = (error: unknown): unknown => {
    if (error instanceof Error && "response" in error) {
        return (error as TuyauHTTPError).response;
    }

    return error;
};

export const isUnauthorizedError = (error: unknown): boolean => getTuyauErrorStatus(error) === 401;
