import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Card from './card.js'
import Tag from './tag.js'

export default class CardTag extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare cardId: number

  @belongsTo(() => Card)
  declare card: BelongsTo<typeof Card>

  @column()
  declare tagId: number

  @belongsTo(() => Tag)
  declare tag: BelongsTo<typeof Tag>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
