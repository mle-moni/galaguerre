import { touchPresence } from "#services/presence/presence";
import type { HttpContext } from "@adonisjs/core/http";

export default class PresenceController {
    async heartbeat({ auth }: HttpContext) {
        await touchPresence(auth.user!.id);
        return { ok: true };
    }
}
