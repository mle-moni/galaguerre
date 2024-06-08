import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import MinionPower from './minion_power.js'

// @dbml-group Minions

export default class Minion extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare internalLabel: string

  @column()
  declare health: number

  @column()
  declare attack: number

  @column()
  declare minionPowerId: number | null

  @belongsTo(() => MinionPower)
  declare minionPower: BelongsTo<typeof MinionPower>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
