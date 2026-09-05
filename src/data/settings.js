/**
 * Every user-controllable preference in the app, grouped by the system it governs.
 * The shape here is the source of truth: AppContext deep-merges whatever is in
 * localStorage over these defaults, so adding a key later can't leave existing
 * users with `undefined` for it.
 */
export const DEFAULT_SETTINGS = {
  appearance: {
    themeMode: 'dark', // 'light' | 'dark' | 'system'
    density: 'comfortable', // 'compact' | 'comfortable' | 'spacious'
    reduceMotion: false,
    introAnimation: true,
  },
  browsing: {
    landing: 'home', // where signed-in users land on '/'
    defaultSort: 'recommended', // Explore's starting sort
    hideAiContent: false,
    mutedDepartments: [], // department ids kept out of feeds
  },
  studio: {
    defaultVideoSeconds: 5,
    keepHistory: true,
  },
  notifications: {
    followedCreators: true,
    teamActivity: true,
    moderationResults: true,
    payouts: true,
    productUpdates: true,
    marketing: false,
  },
  privacy: {
    saveRecentlyViewed: true,
    profileVisibility: 'public', // 'public' | 'private'
    showAppreciations: true,
  },
  downloads: {
    confirmPurchase: true, // ask before a pay-per-download charge
  },
}

export const THEME_MODES = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'System' },
]

export const DENSITIES = [
  { id: 'compact', label: 'Compact', desc: 'More columns, tighter gaps' },
  { id: 'comfortable', label: 'Comfortable', desc: 'The default balance' },
  { id: 'spacious', label: 'Spacious', desc: 'Fewer, larger cards' },
]

export const LANDING_PAGES = [
  { id: 'home', label: 'Dashboard', to: '/' },
  { id: 'explore', label: 'Explore', to: '/explore' },
  { id: 'collections', label: 'Collections', to: '/collections' },
]

export const AI_DEPARTMENTS = ['ai-images', 'ai-video']

/**
 * Applies the viewer's browsing preferences to a content list. Used everywhere
 * a feed is built (Explore, dashboard rails, department counts) so a muted
 * department is genuinely absent rather than hidden in one place and not another.
 */
export function applyBrowsingFilters(items, browsing) {
  if (!browsing) return items
  const muted = browsing.mutedDepartments || []
  if (muted.length === 0 && !browsing.hideAiContent) return items
  const mutedSet = new Set(muted)
  return items.filter((item) => {
    if (mutedSet.has(item.department)) return false
    if (browsing.hideAiContent && AI_DEPARTMENTS.includes(item.department)) return false
    return true
  })
}

/** Deep-merges stored settings over defaults; arrays and primitives are replaced wholesale. */
export function mergeSettings(base, override) {
  const out = { ...base }
  for (const [key, value] of Object.entries(override || {})) {
    if (!(key in base)) continue // drop keys from an older schema
    const isPlainObject = (v) => v && typeof v === 'object' && !Array.isArray(v)
    if (isPlainObject(value) && isPlainObject(base[key])) out[key] = mergeSettings(base[key], value)
    else if (value !== undefined) out[key] = value
  }
  return out
}
