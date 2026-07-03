import { syncEvents } from "#database/seed_helpers/sync_events";
import { BaseSeeder } from "@adonisjs/lucid/seeders";

export default class extends BaseSeeder {
    async run() {
        await syncEvents();
    }
}
