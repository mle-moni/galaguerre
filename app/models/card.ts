import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import type { GalaguerreCardMode, GalaguerreCardType } from '../galaguerre/galaguerre.types.js'
import Minion from './minion.js'
import Spell from './spell.js'
import Weapon from './weapon.js'

export default class Card extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare label: string

  @column()
  declare imageUrl: string

  @column()
  declare cost: number

  @column()
  declare type: GalaguerreCardType

  @column()
  declare cardMode: GalaguerreCardMode

  @column()
  declare minionId: number | null

  @belongsTo(() => Minion)
  declare minion: BelongsTo<typeof Minion>

  @column()
  declare spellId: number | null

  @belongsTo(() => Spell)
  declare spell: BelongsTo<typeof Spell>

  @column()
  declare weaponId: number | null

  @belongsTo(() => Weapon)
  declare weapon: BelongsTo<typeof Weapon>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
