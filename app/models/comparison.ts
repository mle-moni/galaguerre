import { BaseModel, column, computed } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import { GalaguerreComparisonType } from '../galaguerre/galaguerre.types.js'

export default class Comparison extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @computed()
  get internalLabel() {
    const costLabel = this.cost ? `Coût ${this.costComparison} ${this.cost}` : ''
    const attackLabel = this.attack ? `Attaque ${this.attackComparison} ${this.attack}` : ''
    const healthLabel = this.health ? `Points de vie ${this.healthComparison} ${this.health}` : ''

    const label = [costLabel, attackLabel, healthLabel].filter((l) => l !== '').join(' ET ')

    return `FILTRE ${label}`
  }

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
