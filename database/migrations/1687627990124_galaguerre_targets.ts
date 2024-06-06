import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'targets'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.string('type').notNullable()

      table.integer('comparison_id').references('comparisons.id').nullable().onDelete('CASCADE')

      table.integer('action_id').references('actions.id').notNullable().onDelete('CASCADE')

      table.integer('boost_id').references('boosts.id').notNullable().onDelete('CASCADE')

      table.integer('tag_id').references('tags.id').notNullable().onDelete('CASCADE')

      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
