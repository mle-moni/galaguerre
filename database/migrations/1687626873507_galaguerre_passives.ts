import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'passives'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.string('internal_label').notNullable()
      table.string('type').notNullable()
      table.string('triggers_on').nullable()

      table.integer('action_id').references('actions.id').nullable().onDelete('CASCADE')

      table.integer('boost_id').references('boosts.id').nullable().onDelete('CASCADE')

      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
