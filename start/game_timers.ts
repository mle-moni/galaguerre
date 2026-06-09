import { restoreGameTimers } from "../app/galaguerre/timers/game_timers.js";
import app from "@adonisjs/core/services/app";
import emitter from "@adonisjs/core/services/emitter";

emitter.on("http:server_ready", async () => {
    if (app.getEnvironment() !== "web") return;

    await restoreGameTimers();
});
