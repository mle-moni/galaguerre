import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class Boost extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare health: number | null

  @column()
  declare attack: number | null

  @column()
  declare spellPower: number | null

  @column()
  declare minionPowerId: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
