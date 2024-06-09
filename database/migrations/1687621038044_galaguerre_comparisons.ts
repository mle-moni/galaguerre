import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'comparisons'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.string('cost_comparison').nullable()
      table.integer('cost').nullable()
      table.string('attack_comparison').nullable()
      table.integer('attack').nullable()
      table.string('health_comparison').nullable()
      table.integer('health').nullable()

      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })

      this.defer(async (db) => {
        await db.schema.raw(`
        ALTER TABLE ${this.tableName}
        ADD COLUMN internal_label TEXT GENERATED ALWAYS AS (
          'FILTRE ' ||
          COALESCE('Coût ' || cost_comparison || ' ' || cost, '') ||
          CASE
            WHEN cost IS NOT NULL THEN ' ET '
            ELSE ''
          END ||
          COALESCE('Attaque ' || attack_comparison || ' ' || attack, '') ||
          CASE
            WHEN attack IS NOT NULL THEN ' ET '
            ELSE ''
          END ||
          COALESCE('Points de vie ' || health_comparison || ' ' || health, '')
        ) STORED;
      `)
      })
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
