export const TIERS = {
  free: { id: 'free', label: 'Free', monthly: 0, annual: 0 },
  standard: { id: 'standard', label: 'Standard', monthly: 12, annual: 9, imageCredits: 50, videoCredits: 0 },
  express: { id: 'express', label: 'Express', monthly: 30, annual: 22.5, imageCredits: 50, videoCredits: 60 },
}

export const TIER_RANK = { free: 0, standard: 1, express: 2 }

const EXPRESS_FORMATS = ['AEP', 'PPRO']

export function requiredTier(item) {
  if (item.fileTypes?.some((f) => EXPRESS_FORMATS.includes(f))) return 'express'
  if (item.fileTypes?.length > 0) return 'standard'
  if (item.department === 'ai-video') return 'express'
  return 'standard'
}

export function payPerDownloadPrice(item) {
  return requiredTier(item) === 'express' ? 3 : 1.5
}

/**
 * Works out what the download button should show/do for a given item + viewer.
 * Mirrors the paywall states described in the product spec.
 */
export function evaluateDownload(item, user) {
  if (!user) return { state: 'signed-out' }
  if (item.free) return { state: 'free-download' }

  const tier = requiredTier(item)

  if (user.billingMode === 'payPerDownload') {
    if (user.purchasedItemIds?.includes(item.id)) return { state: 'owned' }
    return { state: 'pay-per-download', tier, price: payPerDownloadPrice(item) }
  }

  if (user.role === 'free') return { state: 'paywall', tier }

  if (TIER_RANK[user.role] >= TIER_RANK[tier]) return { state: 'subscriber-download' }

  return { state: 'upgrade-required', tier }
}
