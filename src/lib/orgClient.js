import { createAuthClient } from 'better-auth/client'
import { organizationClient } from 'better-auth/client/plugins'

/**
 * Neon Auth is Managed Better Auth, and its database already provisions the
 * standard organization/member/invitation tables (confirmed live: POST
 * {base}/organization/list responds 401 Unauthorized, not 404 — the plugin
 * is enabled server-side). `authClient.js`'s wrapper (@neondatabase/neon-js)
 * doesn't expose organization methods, so this is a second, plain Better
 * Auth client pointed at the same base URL/cookies with the organization
 * client plugin added, giving us team creation, invites, and membership.
 */
export const orgClient = createAuthClient({
  baseURL: import.meta.env.VITE_NEON_AUTH_URL,
  plugins: [organizationClient()],
})
