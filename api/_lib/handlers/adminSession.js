import { getSession, isAdminUser } from '../auth.js'
import { send, methodGuard, withErrorHandling } from '../http.js'

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

    // `reason` exists so this is diagnosable: opening the URL straight in a
    // browser sends no bearer header at all, which looks identical to a bad
    // token without it.
    const hasBearer = /^Bearer\s+\S/i.test(req.headers?.authorization || '')

    const session = await getSession(req)
    if (!session) {
      return send(res, 200, {
        isAdmin: false,
        user: null,
        reason: hasBearer
          ? 'The session token was not recognised, or has expired. Sign in again.'
          : 'No session token was sent. This endpoint is called by the app, not opened directly.',
      })
    }

    const isAdmin = await isAdminUser(session.user)
    send(res, 200, {
      isAdmin,
      user: { id: session.user.id, email: session.user.email, name: session.user.name },
      reason: isAdmin
        ? undefined
        : `${session.user.email} is signed in but is not an admin. Add it to ADMIN_EMAILS (and redeploy), or have an existing admin grant access.`,
    })
  })
}
