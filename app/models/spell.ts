import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Action from './action.js'

export default class Spell extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare actionId: number

  @belongsTo(() => Action)
  declare action: BelongsTo<typeof Action>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
