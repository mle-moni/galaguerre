import {
    getDevStatsCardsCacheSnapshot,
    getDevStatsGamesCacheSnapshot,
    refreshDevStatsCacheInBackground,
    scheduleDevStatsNightlyRefresh,
} from "#services/dev_stats/dev_stats_cache";
import app from "@adonisjs/core/services/app";
import emitter from "@adonisjs/core/services/emitter";

emitter.on("http:server_ready", () => {
    if (app.getEnvironment() !== "web") return;

    scheduleDevStatsNightlyRefresh();

    // Warm cache after deploy/restart without waiting until 03:00 — still off the request path.
    const cardsPending = getDevStatsCardsCacheSnapshot().status === "pending";
    const gamesPending = getDevStatsGamesCacheSnapshot().status === "pending";
    if (cardsPending || gamesPending) {
        refreshDevStatsCacheInBackground();
    }
});
