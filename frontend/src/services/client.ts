import { registry } from "@generated/registry";
import { createTuyau } from "@tuyau/core/client";

export const TOKEN_STORAGE_KEY = "token";

export const setToken = (newToken: string) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
};

const authBeforeRequest = [
    (request: Request) => {
        const token = localStorage.getItem(TOKEN_STORAGE_KEY);
        if (token) {
            request.headers.set("Authorization", `Bearer ${token}`);
        }
    },
];

export const client = createTuyau({
    baseUrl: "/",
    registry,
    headers: { Accept: "application/json" },
    hooks: {
        beforeRequest: authBeforeRequest,
    },
});

export const publicClient = createTuyau({
    baseUrl: "/",
    registry,
    headers: { Accept: "application/json" },
});

export const urlFor = client.urlFor;
