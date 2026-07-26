import type { ApiDevCardsStatsResponse, ApiDevGameStatsResponse } from "#api_types/dev_stats.types";
import {
    getDevStatsCardsCacheSnapshot,
    getDevStatsGamesCacheSnapshot,
} from "#services/dev_stats/dev_stats_cache";
import type { HttpContext } from "@adonisjs/core/http";

export default class DevStatsController {
    async cards(_ctx: HttpContext): Promise<ApiDevCardsStatsResponse> {
        return getDevStatsCardsCacheSnapshot();
    }

    async games(_ctx: HttpContext): Promise<ApiDevGameStatsResponse> {
        return getDevStatsGamesCacheSnapshot();
    }

    /** @deprecated Alias of cards — kept for old clients / bookmarks. */
    async v1(_ctx: HttpContext): Promise<ApiDevCardsStatsResponse> {
        return getDevStatsCardsCacheSnapshot();
    }
}
