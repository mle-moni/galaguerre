import { syncCards } from "#database/seed_helpers/sync_cards";
import { assert } from "@japa/assert";
import { apiClient } from "@japa/api-client";
import app from "@adonisjs/core/services/app";
import type { Config } from "@japa/runner/types";
import { pluginAdonisJS } from "@japa/plugin-adonisjs";
import testUtils from "@adonisjs/core/services/test_utils";

export const plugins: Config["plugins"] = [assert(), apiClient(), pluginAdonisJS(app)];

export const runnerHooks: Required<Pick<Config, "setup" | "teardown">> = {
    setup: [],
    teardown: [],
};

export const configureSuite: Config["configureSuite"] = (suite) => {
    if (["unit", "functional"].includes(suite.name)) {
        suite.setup(async () => {
            await testUtils.db().migrate();
            await syncCards();
        });
    }

    if (["browser", "e2e"].includes(suite.name)) {
        return suite.setup(() => testUtils.httpServer().start());
    }
};
