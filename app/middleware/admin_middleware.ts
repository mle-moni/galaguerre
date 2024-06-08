import type { Authenticators } from '@adonisjs/auth/types'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Admin middleware is used authenticate HTTP requests and deny
 * access to non admin users.
 */
export default class AdminMiddleware {
  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: {
      guards?: (keyof Authenticators)[]
    } = {}
  ) {
    await ctx.auth.authenticateUsing(options.guards)

    if (!ctx.auth.user?.isSuperAdmin) {
      return ctx.response.unauthorized({ error: 'Unauthorized access' })
    }

    return next()
  }
}
