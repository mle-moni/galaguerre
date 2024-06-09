import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import type { GalaguerreCardType } from '../galaguerre/galaguerre.types.js'
import Comparison from './comparison.js'

export default class CardFilter extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare internalLabel: string

  @column()
  declare type: GalaguerreCardType

  @column()
  declare comparisonId: number | null

  @belongsTo(() => Comparison)
  declare comparison: BelongsTo<typeof Comparison>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
