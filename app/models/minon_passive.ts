import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Minion from './minion.js'
import Passive from './passive.js'

export default class MinionPassive extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare minionId: number

  @belongsTo(() => Minion)
  declare minion: BelongsTo<typeof Minion>

  @column()
  declare passiveId: number

  @belongsTo(() => Passive)
  declare passive: BelongsTo<typeof Passive>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
