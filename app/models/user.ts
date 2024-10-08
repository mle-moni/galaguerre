import { PASSWORD_SERIALIZED_FORM } from "#adomin/create_model_view_config";
import { DbAccessTokensProvider } from "@adonisjs/auth/access_tokens";
import { withAuthFinder } from "@adonisjs/auth/mixins/lucid";
import { compose } from "@adonisjs/core/helpers";
import hash from "@adonisjs/core/services/hash";
import { BaseModel, column } from "@adonisjs/lucid/orm";
import type { DateTime } from "luxon";

// @dbml-group Users

const AuthFinder = withAuthFinder(() => hash.use("scrypt"), {
    uids: ["email"],
    passwordColumnName: "password",
});

export default class User extends compose(BaseModel, AuthFinder) {
    @column({ isPrimary: true })
    declare id: number;

    @column()
    declare pseudo: string | null;

    @column()
    declare email: string;

    @column({ serialize: () => PASSWORD_SERIALIZED_FORM })
    declare password: string;

    @column()
    declare socketToken: string | null;

    @column()
    declare isSuperAdmin: boolean;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime | null;

    static accessTokens = DbAccessTokensProvider.forModel(User);
}
