import { client } from "./client.js";

export const fetchCurrentUser = async () => {
    return client.api.auth.me({});
};
