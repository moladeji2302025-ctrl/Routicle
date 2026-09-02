import { neon } from '@neondatabase/serverless'

let sqlClient = null

/** Lazily-created Neon serverless SQL client, reused across warm invocations. */
export function sql(...args) {
  if (!sqlClient) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set')
    }
    sqlClient = neon(process.env.DATABASE_URL)
  }
  return sqlClient(...args)
}
