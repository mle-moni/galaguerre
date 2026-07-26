import {
    getDevStatsV1CacheSnapshot,
    refreshDevStatsV1CacheInBackground,
    scheduleDevStatsV1NightlyRefresh,
} from "#services/dev_stats/stats_v1_cache";
import app from "@adonisjs/core/services/app";
import emitter from "@adonisjs/core/services/emitter";

emitter.on("http:server_ready", () => {
    if (app.getEnvironment() !== "web") return;

    scheduleDevStatsV1NightlyRefresh();

    // Warm cache after deploy/restart without waiting until 03:00 — still off the request path.
    if (getDevStatsV1CacheSnapshot().status === "pending") {
        refreshDevStatsV1CacheInBackground();
    }
});
