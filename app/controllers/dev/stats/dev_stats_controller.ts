import type { ApiDevStatsV1Response } from "#api_types/dev_stats.types";
import { getDevStatsV1CacheSnapshot } from "#services/dev_stats/stats_v1_cache";
import type { HttpContext } from "@adonisjs/core/http";

export default class DevStatsController {
    async v1(_ctx: HttpContext): Promise<ApiDevStatsV1Response> {
        return getDevStatsV1CacheSnapshot();
    }
}
