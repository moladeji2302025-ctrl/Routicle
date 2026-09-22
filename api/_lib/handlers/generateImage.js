import { sql } from '../db.js'
import { send, methodGuard } from '../http.js'
import { effectiveTier, TIER_RANK } from '../guard.js'
import { isAdminId } from '../auth.js'
import { limit } from '../ratelimit.js'

/**
 * AI images, made for a template's photo slot rather than in a studio of their
 * own: the picture is generated where it is going to be used.
 *
 * GET                      this month's allowance: { enabled, used, limit }
 * POST { prompt, aspect }  one image, returned as a data URL
 *
 * The model is fal.ai's FLUX [schnell], called only when FAL_KEY is set. With
 * no key the feature says so plainly instead of pretending: nothing is charged
 * and no stock picture is passed off as a generation.
 *
 * The allowance is counted in its own table, per calendar month, and a
 * generation is only recorded once it has succeeded. It is deliberately not
 * the rate limiter, which fails open on a database error: that is right for
 * abuse protection and wrong for something that costs money per call.
 */

const MONTHLY = { free: 0, standard: 50, express: 50 }
const SIZES = { square: 'square_hd', landscape: 'landscape_4_3', portrait: 'portrait_4_3', wide: 'landscape_16_9', tall: 'portrait_16_9' }
const MAX_IMAGE_BYTES = 8 * 1024 * 1024

async function usedThisMonth(userId) {
  const [{ n }] = await sql`
    SELECT COUNT(*)::int AS n FROM ai_generations
    WHERE user_id = ${userId} AND created_at >= date_trunc('month', now())
  `
  return n
}

async function aiImagesOn() {
  const rows = await sql`SELECT value FROM app_settings WHERE key = 'aiImagesEnabled'`
  return rows[0] ? rows[0].value !== false : true
}

export default async function generateImage(req, res, user) {
  if (!methodGuard(req, res, ['GET', 'POST'])) return

  const enabled = Boolean(process.env.FAL_KEY)
  const tier = await effectiveTier(user.id, req.body?.organizationId || req.query?.organizationId || null)
  const admin = await isAdminId(user.id)
  const allowance = admin ? 100000 : MONTHLY[tier] ?? 0
  const used = await usedThisMonth(user.id)

  if (req.method === 'GET') return send(res, 200, { enabled, used, limit: allowance, tier })

  if (TIER_RANK[tier] < TIER_RANK.standard) {
    return send(res, 402, { error: 'AI images come with the Standard and Express plans.', requiredTier: 'standard' })
  }
  if (!enabled) {
    return send(res, 503, { error: "AI images aren't switched on yet. You can upload your own photo in the meantime." })
  }
  if (!admin && !(await aiImagesOn())) {
    return send(res, 503, { error: 'AI image generation is paused right now. Try again shortly.' })
  }
  if (used >= allowance) {
    return send(res, 429, { error: `You've used all ${allowance} AI images for this month. They reset on the 1st.` })
  }
  // A burst guard on top of the monthly count.
  if (!(await limit(req, res, { name: 'ai-image', key: user.id, limit: 6, windowSeconds: 60 }))) return

  const prompt = String(req.body?.prompt || '').trim().slice(0, 800)
  if (prompt.length < 3) return send(res, 400, { error: 'Describe the picture you want.' })
  const imageSize = SIZES[req.body?.aspect] || SIZES.landscape

  let url
  try {
    const r = await fetch('https://fal.run/fal-ai/flux/schnell', {
      method: 'POST',
      headers: { Authorization: `Key ${process.env.FAL_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, image_size: imageSize, num_images: 1, enable_safety_checker: true }),
    })
    const body = await r.json().catch(() => ({}))
    if (!r.ok) {
      console.error('fal.ai error', r.status, JSON.stringify(body).slice(0, 400))
      return send(res, 502, { error: "The image couldn't be made just now. Try again in a moment." })
    }
    if (body.has_nsfw_concepts?.[0]) {
      return send(res, 422, { error: "That prompt made an image we can't use. Try describing it differently." })
    }
    url = body.images?.[0]?.url
  } catch (err) {
    console.error('fal.ai request failed', err.message)
    return send(res, 502, { error: "The image couldn't be made just now. Try again in a moment." })
  }
  if (!url) return send(res, 502, { error: "The image couldn't be made just now. Try again in a moment." })

  // Returned inline rather than as the provider's URL: the image goes inside
  // an SVG drawn as a picture, which can't load anything from the internet.
  const img = await fetch(url)
  const type = img.headers.get('content-type') || 'image/jpeg'
  const buf = Buffer.from(await img.arrayBuffer())
  if (!/^image\/(jpeg|png|webp)$/.test(type) || buf.length > MAX_IMAGE_BYTES) {
    return send(res, 502, { error: "The image couldn't be made just now. Try again in a moment." })
  }

  await sql`INSERT INTO ai_generations (user_id, kind, prompt) VALUES (${user.id}, 'image', ${prompt})`
  send(res, 200, { image: `data:${type};base64,${buf.toString('base64')}`, used: used + 1, limit: allowance })
}
