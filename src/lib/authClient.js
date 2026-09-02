import { createAuthClient } from '@neondatabase/neon-js/auth'

/**
 * Real user identity via Neon Auth (Managed Better Auth) — Google OAuth (shared dev
 * credentials) and email/password sign-in/up. Session lives server-side; Routicle's
 * app-specific profile fields (role, credits, saved items, etc.) are layered on top
 * client-side in AppContext, keyed by this user's real id.
 */
export const authClient = createAuthClient(import.meta.env.VITE_NEON_AUTH_URL)
