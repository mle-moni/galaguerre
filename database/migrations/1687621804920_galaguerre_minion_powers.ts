import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
    protected tableName = "minion_powers";

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.increments("id");

            table.boolean("has_taunt").notNullable();
            table.boolean("has_charge").notNullable();
            table.boolean("has_windfury").notNullable();
            table.boolean("is_poisonous").notNullable();

            table.timestamp("created_at", { useTz: true });
            table.timestamp("updated_at", { useTz: true });

            this.defer(async (db) => {
                await db.schema.raw(`
        ALTER TABLE ${this.tableName}
        ADD COLUMN internal_label TEXT GENERATED ALWAYS AS (
          TRIM(
            TRAILING ', ' FROM
            COALESCE(NULLIF(
              CASE
                WHEN has_taunt THEN 'Provocation, '
                ELSE ''
              END,
              ''
            ), '') ||
            COALESCE(NULLIF(
              CASE
                WHEN has_charge THEN 'Charge, '
                ELSE ''
              END,
              ''
            ), '') ||
            COALESCE(NULLIF(
              CASE
                WHEN has_windfury THEN 'Furie des vents, '
                ELSE ''
              END,
              ''
            ), '') ||
            COALESCE(NULLIF(
              CASE
                WHEN is_poisonous THEN 'Toxique, '
                ELSE ''
              END,
              ''
            ), '')
          )
        ) STORED;
      `);
            });
        });
    }

    async down() {
        this.schema.dropTable(this.tableName);
    }
}
