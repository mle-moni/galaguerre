import logger from "@adonisjs/core/services/logger";
import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
    async up() {
        this.schema.alterTable("cards", (table) => {
            table.jsonb("data").notNullable().defaultTo("{}");
        });

        this.schema.alterTable("cards", (table) => {
            table.dropForeignIfExists(["minion_id"]);
            table.dropForeignIfExists(["spell_id"]);
            table.dropForeignIfExists(["weapon_id"]);
            table.dropColumn("minion_id");
            table.dropColumn("spell_id");
            table.dropColumn("weapon_id");
        });

        this.schema.dropTableIfExists("minion_battlecry_actions");
        this.schema.dropTableIfExists("minion_deathrattle_actions");
        this.schema.dropTableIfExists("minion_passives");
        this.schema.dropTableIfExists("weapon_deathrattle_actions");
        this.schema.dropTableIfExists("tool_to_targets");
        this.schema.dropTableIfExists("card_filter_tags");
        this.schema.dropTableIfExists("card_tags");
        this.schema.dropTableIfExists("spells");
        this.schema.dropTableIfExists("weapons");
        this.schema.dropTableIfExists("minions");
        this.schema.dropTableIfExists("passives");
        this.schema.dropTableIfExists("actions");
        this.schema.dropTableIfExists("card_filters");
        this.schema.dropTableIfExists("boosts");
        this.schema.dropTableIfExists("targets");
        this.schema.dropTableIfExists("comparisons");
        this.schema.dropTableIfExists("minion_powers");
        this.schema.dropTableIfExists("tags");

        this.defer(async (db) => {
            await db.rawQuery(`
                UPDATE cards
                SET data = data || jsonb_build_object('type', type)
                WHERE type IS NOT NULL AND NOT jsonb_exists(data, 'type')
            `);
        });

        this.schema.alterTable("cards", (table) => {
            table.dropColumn("type");
        });
    }

    async down() {
        this.schema.alterTable("cards", (table) => {
            table.string("type").notNullable().defaultTo("MINION");
        });

        this.schema.alterTable("cards", (table) => {
            table.dropColumn("data");
            table.integer("minion_id").nullable();
            table.integer("spell_id").nullable();
            table.integer("weapon_id").nullable();
        });

        logger.warn("This migration cannot be reversed");
    }
}
