import { syncCards } from "#database/seed_helpers/sync_cards";
import { BaseSeeder } from "@adonisjs/lucid/seeders";

export default class extends BaseSeeder {
    async run() {
        await syncCards();
    }
}
