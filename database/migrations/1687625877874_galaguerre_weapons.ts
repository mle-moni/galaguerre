import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'weapons'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.string('internal_label').notNullable()

      table.integer('durability').notNullable()
      table.integer('damage').notNullable()

      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
