import { syncEvents } from "#database/seed_helpers/sync_events";
import app from "@adonisjs/core/services/app";
import emitter from "@adonisjs/core/services/emitter";

emitter.on("http:server_ready", async () => {
    if (app.getEnvironment() !== "web") return;

    await syncEvents();
});
