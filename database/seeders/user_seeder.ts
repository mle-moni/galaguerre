import User from '#models/user'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    await User.createMany([
      { email: 'admin@admin.fr', password: 'test', isSuperAdmin: true },
      { email: 'test@test.fr', password: 'test' },
    ])
  }
}
