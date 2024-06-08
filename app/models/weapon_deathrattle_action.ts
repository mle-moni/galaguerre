import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Action from './action.js'
import Weapon from './weapon.js'

// @dbml-group Weapons

export default class WeaponDeathrattleAction extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare weaponId: number

  @belongsTo(() => Weapon)
  declare weapon: BelongsTo<typeof Weapon>

  @column()
  declare actionId: number

  @belongsTo(() => Action)
  declare action: BelongsTo<typeof Action>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
