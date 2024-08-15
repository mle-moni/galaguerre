import { initSockerAuthController } from "#controllers/auth/socket/index";
import { WS } from "#services/sockets/ws_service";
import app from "@adonisjs/core/services/app";
import emitter from "@adonisjs/core/services/emitter";

emitter.on("http:server_ready", async () => {
    if (app.getEnvironment() !== "web") return;

    WS.boot().on("connection", (socket) => {
        initSockerAuthController(socket);
    });
});
