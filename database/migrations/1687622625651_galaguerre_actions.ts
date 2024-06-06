import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'actions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.string('type').notNullable()
      table.boolean('is_targeted').notNullable()

      table.integer('draw_count').nullable()
      table
        .integer('draw_card_filter_id')
        .references('card_filters.id')
        .nullable()
        .onDelete('CASCADE')

      table.integer('enemy_draw_count').nullable()
      table
        .integer('enemy_draw_card_filter_id')
        .references('card_filters.id')
        .nullable()
        .onDelete('CASCADE')

      table.integer('damage').nullable()
      table.integer('heal').nullable()

      table.integer('boost_id').references('boosts.id').nullable().onDelete('CASCADE')

      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
