import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import type { GalaguerreTargetType } from '../galaguerre/galaguerre.types.js'
import Comparison from './comparison.js'
import Tag from './tag.js'

export default class Target extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare internalLabel: string

  @column()
  declare type: GalaguerreTargetType

  @column()
  declare comparisonId: number | null

  @belongsTo(() => Comparison)
  declare comparison: BelongsTo<typeof Comparison>

  @column()
  declare tagId: number | null

  @belongsTo(() => Tag)
  declare tag: BelongsTo<typeof Tag>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
