const AUTH_BASE = (import.meta.env.VITE_NEON_AUTH_URL || '').replace(/\/$/, '')

/**
 * A short-lived JWT from Neon Auth, used to prove who is calling /api/*.
 *
 * Neon Auth lives on its own domain, so its session cookie never reaches this
 * app's origin and the session token behind it is httpOnly. Its /token endpoint
 * does accept that cookie (cross-origin, with credentials) and hands back a
 * signed JWT the page can actually read — which the API then verifies against
 * the public key in neon_auth.jwks.
 *
 * Held in memory only. Never localStorage: this is a bearer credential, and
 * anything that can read it can act as the user.
 */
let cached = null // { token, expiresAt }
let inFlight = null

/** Reads `exp` without verifying — this is only for deciding when to refetch. */
function expiryOf(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.exp ? payload.exp * 1000 : 0
  } catch {
    return 0
  }
}

export function clearAuthToken() {
  cached = null
  inFlight = null
}

/**
 * Returns a usable token, or null when signed out. Refreshes a minute before
 * expiry so a request can't land just after the token dies, and de-dupes
 * concurrent callers onto one fetch.
 */
export async function getAuthToken() {
  if (!AUTH_BASE) return null
  if (cached && Date.now() < cached.expiresAt - 60_000) return cached.token
  if (inFlight) return inFlight

  inFlight = (async () => {
    try {
      const res = await fetch(`${AUTH_BASE}/token`, {
        credentials: 'include',
        headers: { accept: 'application/json' },
      })
      if (!res.ok) {
        cached = null
        return null
      }
      const data = await res.json().catch(() => null)
      const token = data?.token
      if (!token) {
        cached = null
        return null
      }
      cached = { token, expiresAt: expiryOf(token) || Date.now() + 5 * 60_000 }
      return token
    } catch {
      cached = null
      return null
    } finally {
      inFlight = null
    }
  })()

  return inFlight
}
