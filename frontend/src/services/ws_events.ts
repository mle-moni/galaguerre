import { CLIENT_SOCKET, setSocketAuthSuccess, subscribeToSocketEvent } from "./ws_client.js";

CLIENT_SOCKET.on("error", (error) => {
    console.error(error);
});

CLIENT_SOCKET.on("debug", (...data) => {
    console.log("debug", ...data);
});

subscribeToSocketEvent("auth_error", ({ error }) => {
    console.log("auth_error", error);
    setSocketAuthSuccess(false);
});

subscribeToSocketEvent("auth_success", () => {
    setSocketAuthSuccess(true);
});

subscribeToSocketEvent("game:created", () => {
    console.log("game:created, redirecting to play page");
    location.reload();
});
