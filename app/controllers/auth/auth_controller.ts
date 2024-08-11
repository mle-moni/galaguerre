import { adominLogin } from "#adomin/routes/adomin_login";
import { adominLogout } from "#adomin/routes/adomin_logout";
import type { HttpContext } from "@adonisjs/core/http";
import { me } from "./me.js";
import { register } from "./register.js";

export default class AuthController {
    async login(ctx: HttpContext) {
        return adominLogin(ctx);
    }

    async logout(ctx: HttpContext) {
        return adominLogout(ctx);
    }

    async register(ctx: HttpContext) {
        return register(ctx);
    }

    async me(ctx: HttpContext) {
        return me(ctx);
    }
}
