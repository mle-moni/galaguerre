import { REPLAY_FORMAT_VERSION } from "#api_types/game_replay.types";
import { compactReplayStep } from "#galaguerre/game_replay/compact_replay_step";
import type { GamePresentationUpdate } from "#api_types/game_narrative.types";
import type { GameReplayData } from "#api_types/game_replay.types";
import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
    async up() {
        this.schema.createTable("game_replay_steps", (table) => {
            table.increments("id");

            table
                .integer("game_id")
                .unsigned()
                .notNullable()
                .references("id")
                .inTable("games")
                .onDelete("CASCADE");

            table.integer("step_index").unsigned().notNullable();
            table.jsonb("data").notNullable();
            table.timestamp("created_at").notNullable();

            table.unique(["game_id", "step_index"]);
            table.index(["game_id", "step_index"]);
        });

        this.schema.alterTable("game_replays", (table) => {
            table.integer("version").unsigned().notNullable().defaultTo(REPLAY_FORMAT_VERSION);
        });

        this.defer(async (db) => {
            const replays = await db.from("game_replays").select("id", "game_id", "data");

            for (const replay of replays) {
                const data = replay.data as GameReplayData | null;
                if (!data?.steps?.length) {
                    continue;
                }

                for (let stepIndex = 0; stepIndex < data.steps.length; stepIndex++) {
                    const step = data.steps[stepIndex] as GamePresentationUpdate;
                    const compact = compactReplayStep(step, stepIndex);

                    await db.table("game_replay_steps").insert({
                        game_id: replay.game_id,
                        step_index: stepIndex,
                        data: JSON.stringify(compact),
                        created_at: new Date(),
                    });
                }

                await db
                    .from("game_replays")
                    .where("id", replay.id)
                    .update({ version: data.version ?? REPLAY_FORMAT_VERSION });
            }
        });

        this.schema.alterTable("game_replays", (table) => {
            table.dropColumn("data");
        });
    }

    async down() {
        this.schema.alterTable("game_replays", (table) => {
            table.jsonb("data").notNullable().defaultTo('{"version":1,"steps":[]}');
        });

        this.defer(async (db) => {
            const headers = await db.from("game_replays").select("id", "game_id", "version");

            for (const header of headers) {
                const stepRows = await db
                    .from("game_replay_steps")
                    .where("game_id", header.game_id)
                    .orderBy("step_index", "asc")
                    .select("data");

                if (stepRows.length === 0) {
                    continue;
                }

                const { expandReplaySteps } = await import(
                    "#galaguerre/game_replay/compact_replay_step"
                );

                await db
                    .from("game_replays")
                    .where("id", header.id)
                    .update({
                        data: JSON.stringify({
                            version: header.version ?? REPLAY_FORMAT_VERSION,
                            steps: expandReplaySteps(stepRows.map((row) => row.data)),
                        }),
                    });
            }
        });

        this.schema.dropTableIfExists("game_replay_steps");

        this.schema.alterTable("game_replays", (table) => {
            table.dropColumn("version");
        });
    }
}
