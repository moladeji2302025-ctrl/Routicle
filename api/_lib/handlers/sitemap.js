import { sql } from '../db.js'
import { withErrorHandling } from '../http.js'

/**
 * /sitemap.xml, generated from the database so every approved design is
 * listed the moment it goes live. Served at the root through a rewrite in
 * vercel.json; this handler is reached as /api/public/sitemap.
 *
 * Only pages a signed-out visitor can actually see are listed. Account pages,
 * settings and the admin console are excluded here and in robots.txt.
 */

const STATIC = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/explore', priority: '0.9', changefreq: 'daily' },
  { path: '/categories', priority: '0.8', changefreq: 'weekly' },
  { path: '/pricing', priority: '0.8', changefreq: 'monthly' },
  { path: '/become-creator', priority: '0.8', changefreq: 'monthly' },
  { path: '/about', priority: '0.5', changefreq: 'monthly' },
  { path: '/help', priority: '0.5', changefreq: 'monthly' },
  { path: '/blog', priority: '0.4', changefreq: 'weekly' },
  { path: '/contact', priority: '0.4', changefreq: 'yearly' },
  { path: '/careers', priority: '0.3', changefreq: 'monthly' },
  { path: '/brand', priority: '0.3', changefreq: 'yearly' },
  { path: '/terms', priority: '0.2', changefreq: 'yearly' },
  { path: '/privacy', priority: '0.2', changefreq: 'yearly' },
]

// The category pages are the SEO asset: one listing page per category.
const CATEGORIES = ['graphic-design', 'motion-graphics', 'illustration', 'ai-images', 'ai-video']

const escapeXml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]))

function baseUrl(req) {
  const configured = process.env.APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
  if (configured) return configured.replace(/\/$/, '')
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'routicle.vercel.app'
  return `https://${host}`
}

export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    const base = baseUrl(req)

    const designs = await sql`
      SELECT id, COALESCE(updated_at, created_at) AS modified
      FROM content_items
      WHERE moderation_status = 'approved'
      ORDER BY created_at DESC
      LIMIT 45000
    `

    const posts = await sql`SELECT slug, COALESCE(updated_at, published_at) AS modified FROM blog_posts WHERE status = 'published' ORDER BY published_at DESC LIMIT 1000`

    const url = (loc, { lastmod, changefreq, priority } = {}) =>
      '  <url>\n' +
      `    <loc>${escapeXml(loc)}</loc>\n` +
      (lastmod ? `    <lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>\n` : '') +
      (changefreq ? `    <changefreq>${changefreq}</changefreq>\n` : '') +
      (priority ? `    <priority>${priority}</priority>\n` : '') +
      '  </url>'

    const entries = [
      ...STATIC.map((p) => url(base + p.path, p)),
      ...CATEGORIES.map((c) => url(`${base}/explore?category=${c}`, { changefreq: 'daily', priority: '0.8' })),
      ...posts.map((p) => url(`${base}/blog/${p.slug}`, { lastmod: p.modified, changefreq: 'monthly', priority: '0.5' })),
      ...designs.map((d) => url(`${base}/design/${d.id}`, { lastmod: d.modified, changefreq: 'weekly', priority: '0.6' })),
    ]

    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      entries.join('\n') +
      '\n</urlset>\n'

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    // Cheap to regenerate but no need to on every crawl.
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600')
    res.end(xml)
  })
}
