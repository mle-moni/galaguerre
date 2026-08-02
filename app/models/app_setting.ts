import { BaseModel, column } from "@adonisjs/lucid/orm";
import type { DateTime } from "luxon";

/**
 * Réglages runtime modifiables sans redéploiement (voir `#services/settings/get_app_setting`).
 */
export default class AppSetting extends BaseModel {
    static table = "app_settings";

    @column({ isPrimary: true })
    declare key: string;

    @column()
    declare value: unknown;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;
}
