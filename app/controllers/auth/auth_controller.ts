import type { HttpContext } from "@adonisjs/core/http";
import { adominLogout } from "./adomin_logout.js";
import { createLoginToken, loginMessagesProvider, loginSchema } from "./adomin_login.js";
import { me } from "./me.js";
import { registerMessagesProvider, registerSchema, registerUser } from "./register.js";
import { updateAvatar } from "./update_avatar.js";

export default class AuthController {
    async login({ request }: HttpContext): Promise<{ token: string }> {
        const { email, password } = await request.validateUsing(loginSchema, {
            messagesProvider: loginMessagesProvider,
        });

        const accessToken = await createLoginToken(email, password);
        return { token: accessToken.value!.release() };
    }

    async logout(ctx: HttpContext) {
        return adominLogout(ctx);
    }

    async register(ctx: HttpContext) {
        const { email, password, pseudo, avatarCardId } = await ctx.request.validateUsing(
            registerSchema,
            {
                messagesProvider: registerMessagesProvider,
            },
        );

        return registerUser(ctx, { email, password, pseudo, avatarCardId });
    }

    async me(ctx: HttpContext) {
        return me(ctx);
    }

    async updateAvatar(ctx: HttpContext) {
        return updateAvatar(ctx);
    }
}
