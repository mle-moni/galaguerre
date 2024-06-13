import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'tool_to_targets'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.integer('target_id').notNullable().references('targets.id').onDelete('CASCADE')

      table.integer('action_id').references('actions.id').onDelete('CASCADE')
      table.integer('boost_id').references('boosts.id').onDelete('CASCADE')

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
