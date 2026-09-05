/**
 * Server-side source of truth for what a plan costs. The client sends a tier
 * and a billing cycle; it never sends an amount, so a tampered request can't
 * buy Express for a penny.
 *
 * Prices mirror src/data/pricing.js: Standard $12/mo ($9/mo billed annually),
 * Express $30/mo ($22.50/mo billed annually) — annual is charged as one
 * up-front payment for twelve months.
 */
const USD_PRICES = {
  standard: { monthly: 12, annual: 9 * 12 },
  express: { monthly: 30, annual: 22.5 * 12 },
}

export const TIERS = Object.keys(USD_PRICES)
export const CYCLES = ['monthly', 'annual']

/**
 * Paystack charges in the currency's minor unit (cents/kobo). Default is USD
 * so the buyer is charged exactly the price shown on the pricing page. If the
 * Paystack account is NGN-only, set PAYSTACK_CURRENCY=NGN and USD_TO_NGN_RATE
 * to your own rate — no rate is assumed here, since that's a pricing decision.
 */
export function priceFor(tier, cycle) {
  const usd = USD_PRICES[tier]?.[cycle]
  if (usd == null) throw new Error(`Unknown plan: ${tier}/${cycle}`)

  const currency = (process.env.PAYSTACK_CURRENCY || 'USD').toUpperCase()
  if (currency === 'USD') {
    return { currency, amountMinor: Math.round(usd * 100) }
  }

  if (currency === 'NGN') {
    const rate = Number(process.env.USD_TO_NGN_RATE)
    if (!rate || Number.isNaN(rate)) {
      throw new Error('PAYSTACK_CURRENCY=NGN requires USD_TO_NGN_RATE to be set')
    }
    return { currency, amountMinor: Math.round(usd * rate * 100) }
  }

  throw new Error(`Unsupported PAYSTACK_CURRENCY: ${currency}`)
}

/**
 * Optional: a Paystack plan code turns the charge into a true auto-renewing
 * subscription. Set e.g. PAYSTACK_PLAN_STANDARD_MONTHLY=PLN_xxxx. When unset,
 * the charge is one-off and the period end is tracked in our own database.
 */
export function planCodeFor(tier, cycle) {
  return process.env[`PAYSTACK_PLAN_${tier.toUpperCase()}_${cycle.toUpperCase()}`] || null
}

/**
 * Advances a date by one billing cycle, clamping to the last valid day of the
 * target month. Naively calling setMonth(+1) on Jan 31 overflows to Mar 3
 * (Feb 31 doesn't exist), which would hand out a few free days every cycle.
 */
export function periodEndFrom(startDate, cycle) {
  const start = new Date(startDate)
  const end = new Date(start)
  const day = start.getDate()

  if (cycle === 'annual') end.setFullYear(start.getFullYear() + 1, start.getMonth(), 1)
  else end.setFullYear(start.getFullYear(), start.getMonth() + 1, 1)

  // Days in the month we just landed on.
  const lastDay = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate()
  end.setDate(Math.min(day, lastDay))
  return end
}
