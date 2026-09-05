import { getSession, isAdminUser } from '../_lib/auth.js'
import { send, methodGuard, withErrorHandling } from '../_lib/http.js'

/**
 * "Is whoever is holding this cookie an admin?" — the client asks once on load
 * and uses the answer to decide whether to render the admin console at all.
 *
 * Deliberately answers 200 with isAdmin:false rather than 403, so a normal
 * signed-in user checking their own status isn't treated as an error.
 */
export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (!methodGuard(req, res, ['GET'])) return

    const session = await getSession(req)
    if (!session) return send(res, 200, { isAdmin: false, user: null })

    const isAdmin = await isAdminUser(session.user)
    send(res, 200, {
      isAdmin,
      user: { id: session.user.id, email: session.user.email, name: session.user.name },
    })
  })
}
