import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import type { GalaguerreActionType } from '../galaguerre/galaguerre.types.js'
import Boost from './boost.js'
import CardFilter from './card_filter.js'

export default class Action extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare type: GalaguerreActionType

  @column()
  declare isTargeted: boolean

  @column()
  declare drawCount: number | null

  @column()
  declare drawCardFilterId: number | null

  @belongsTo(() => CardFilter, { foreignKey: 'drawCardFilterId' })
  declare drawCardFilter: BelongsTo<typeof CardFilter>

  @column()
  declare enemyDrawCount: number | null

  @column()
  declare enemyDrawCardFilterId: number | null

  @belongsTo(() => CardFilter, { foreignKey: 'enemyDrawCardFilterId' })
  declare enemyDrawCardFilter: BelongsTo<typeof CardFilter>

  @column()
  declare damage: number | null

  @column()
  declare heal: number | null

  @column()
  declare boostId: number | null

  @belongsTo(() => Boost)
  declare boost: BelongsTo<typeof Boost>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
