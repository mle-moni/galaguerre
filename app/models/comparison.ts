import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import { GalaguerreComparisonType } from '../galaguerre/galaguerre.types.js'

export default class Comparison extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare costComparison: GalaguerreComparisonType | null

  @column()
  declare cost: number | null

  @column()
  declare attackComparison: GalaguerreComparisonType | null

  @column()
  declare attack: number | null

  @column()
  declare healthComparison: GalaguerreComparisonType | null

  @column()
  declare health: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
