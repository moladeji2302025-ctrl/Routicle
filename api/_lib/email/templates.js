import { renderEmail, markdownLite, appBase } from './layout.js'

/**
 * Every email Routicle sends, as a function from data to { subject?, html, text }.
 *
 * Keeping them all here means the wording is reviewable in one place and each
 * one can be previewed from the admin page without sending anything.
 *
 * Wording rule: say what happened, what it means for them, and the one thing
 * to do next. No exclamation marks, no filler.
 */

const CURRENCY_SYMBOL = { NGN: '₦', USD: '$', GBP: '£', EUR: '€', GHS: 'GH₵', KES: 'KSh', ZAR: 'R' }

export const formatMoney = (minor, currency = 'NGN') => {
  const n = Number(minor) / 100
  const symbol = CURRENCY_SYMBOL[currency] ?? `${currency} `
  return `${symbol}${n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`
}

const longDate = (value) => {
  const d = value ? new Date(value) : null
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
}

const TIER_LABEL = { standard: 'Standard', express: 'Express', free: 'Free' }
const CYCLE_LABEL = { monthly: 'monthly', annual: 'annual' }
const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || ''

/* ============================================================ account */

export function welcomeEmail({ name }) {
  const base = appBase()
  const hi = firstName(name)
  return {
    subject: 'Welcome to Routicle',
    ...renderEmail({
      heading: hi ? `Welcome, ${hi}` : 'Welcome to Routicle',
      preheader: 'Your account is ready. Here is where to start.',
      blocks: [
        { p: 'Your account is ready. Routicle is a library of finished creative work with the source files behind it, and a set of tools for the business around that work.' },
        { h: 'Where to start' },
        {
          list: [
            'Browse the library and open anything that catches your eye. Free pieces download straight away.',
            'Try the Creative Suite: upload a sketch, get a logo pack, and drop it into a featured template.',
            'Run clients from the Business Suite: a discovery form, then a proposal, contract and invoice.',
            'Have finished work sitting unused? Apply as a creator and earn from it every month.',
          ],
        },
        { button: { label: 'Explore Routicle', url: `${base}/explore` } },
        { note: 'Questions or something not working? Reply to this email and it reaches a person.' },
      ],
      reason: "You're getting this because you just created a Routicle account.",
    }),
  }
}

export function lockoutEmail({ minutes, resetUrl }) {
  return renderEmail({
    heading: `Your account was locked for ${minutes} minutes`,
    preheader: 'Someone entered the wrong password five times.',
    blocks: [
      { p: `Someone tried to sign in to your Routicle account with the wrong password five times in a row, so we've locked it for ${minutes} minutes. After that you can sign in as normal.` },
      { p: "If this was you, there's nothing else to do. If it wasn't, someone may be guessing your password." },
      { button: { label: 'Reset my password', url: resetUrl } },
    ],
    reason: 'This is a security notice about your account, so it is always sent.',
  })
}

export function deletionCodeEmail({ code, minutes }) {
  return renderEmail({
    heading: 'Your account deletion code',
    preheader: `Your code is ${code}. It expires in ${minutes} minutes.`,
    blocks: [
      { p: 'Someone asked to delete your Routicle account. Enter this code to confirm.' },
      { code },
      { p: `It expires in ${minutes} minutes and works once. Entering it deletes your account, your saved items and any workspace only you are in. This can't be undone.` },
      { note: "If this wasn't you, don't share the code with anyone. Your account stays as it is, and it would be worth changing your password." },
    ],
    reason: 'This is a security notice about your account, so it is always sent.',
  })
}

export function inviteEmail({ teamName, inviterName, acceptUrl, role }) {
  const roleLine = role && role !== 'member' ? ` as ${role}` : ''
  const who = inviterName || 'A teammate'
  return renderEmail({
    heading: `${who} invited you to join ${teamName}${roleLine}`,
    preheader: `Accept the invitation to join ${teamName} on Routicle.`,
    blocks: [
      { p: 'A Routicle workspace shares one plan, one collection of saved work, one set of folders and one download history across everyone in it.' },
      { button: { label: `Join ${teamName}`, url: acceptUrl } },
      { link: acceptUrl },
      { note: "This link expires in 7 days. If you weren't expecting it, you can ignore this email." },
    ],
    reason: `${who} sent you this invitation.`,
  })
}

/* ============================================================ billing */

function planName({ tier, cycle, teamName }) {
  const t = TIER_LABEL[tier] || tier
  const c = CYCLE_LABEL[cycle] || cycle
  return teamName ? `${t} for ${teamName} (${c})` : `${t} (${c})`
}

export function receiptEmail({ tier, cycle, amountMinor, currency, reference, periodEnd, teamName }) {
  const base = appBase()
  return {
    subject: `Your Routicle ${TIER_LABEL[tier] || tier} plan is active`,
    ...renderEmail({
      heading: `You're on ${TIER_LABEL[tier] || tier}`,
      preheader: `Payment received: ${formatMoney(amountMinor, currency)}.`,
      blocks: [
        { p: teamName ? `Payment received. ${teamName}'s plan is active, and everyone in the workspace has it.` : 'Payment received. Your plan is active and everything in it is unlocked.' },
        {
          facts: [
            ['Plan', planName({ tier, cycle, teamName })],
            ['Amount', formatMoney(amountMinor, currency)],
            ['Renews on', longDate(periodEnd)],
            ['Reference', reference],
          ],
        },
        { button: { label: 'Manage your plan', url: `${base}/settings/plan` } },
        { note: 'Keep this email as your receipt. You can cancel any time from Plan & billing and keep access until the period ends.' },
      ],
      reason: 'This is a receipt for a payment, so it is always sent.',
    }),
  }
}

export function paymentFailedEmail({ tier, accessUntil }) {
  const base = appBase()
  return {
    subject: "We couldn't renew your Routicle plan",
    ...renderEmail({
      heading: "We couldn't renew your plan",
      preheader: 'Update your payment details to keep your access.',
      blocks: [
        { p: `The payment for your ${TIER_LABEL[tier] || tier} plan didn't go through${accessUntil ? `. Your access continues until ${longDate(accessUntil)}` : ''}.` },
        { p: "This is usually an expired card or a bank declining the charge. Updating your payment details fixes it, and we'll try again." },
        { button: { label: 'Update payment details', url: `${base}/settings/plan` } },
      ],
      reason: 'This is a billing notice, so it is always sent.',
    }),
  }
}

export function canceledEmail({ tier, accessUntil }) {
  const base = appBase()
  return {
    subject: 'Your Routicle plan has been cancelled',
    ...renderEmail({
      heading: 'Your plan has been cancelled',
      preheader: accessUntil ? `You keep access until ${longDate(accessUntil)}.` : 'Nothing further will be charged.',
      blocks: [
        { p: `Your ${TIER_LABEL[tier] || tier} plan won't renew and nothing further will be charged.${accessUntil ? ` You keep full access until ${longDate(accessUntil)}.` : ''}` },
        { p: 'Anything you downloaded is yours to keep. Changed your mind? You can resubscribe whenever you like.' },
        { button: { label: 'See plans', url: `${base}/pricing` } },
      ],
      reason: 'This is a billing notice, so it is always sent.',
    }),
  }
}

/* ========================================================== creators */

export function submissionReceivedEmail({ title }) {
  const base = appBase()
  return {
    subject: `We've received "${title}"`,
    ...renderEmail({
      heading: 'Your upload is in review',
      preheader: `"${title}" is with our team.`,
      blocks: [
        { p: `We've received "${title}". Every piece is checked by a person before it goes live, and you'll hear from us once it has been.` },
        { button: { label: 'View your uploads', url: `${base}/dashboard` } },
      ],
      reason: 'You can turn off upload review emails in Settings > Notifications.',
    }),
  }
}

export function submissionApprovedEmail({ title, itemId }) {
  const base = appBase()
  return {
    subject: `"${title}" is live on Routicle`,
    ...renderEmail({
      heading: 'Your piece is live',
      preheader: `"${title}" was approved and is now in the library.`,
      blocks: [
        { p: `"${title}" was approved and is now in the library. From here, every subscriber download counts towards your share of the monthly pool.` },
        { button: { label: 'See it live', url: `${base}/design/${itemId}` } },
      ],
      reason: 'You can turn off upload review emails in Settings > Notifications.',
    }),
  }
}

export function submissionRejectedEmail({ title, note }) {
  const base = appBase()
  return {
    subject: `About "${title}"`,
    ...renderEmail({
      heading: "This piece wasn't approved",
      preheader: `"${title}" needs changes before it can go live.`,
      blocks: [
        { p: `"${title}" wasn't approved this time.` },
        note ? { p: 'The reviewer left this note:' } : { p: 'No note was left. Reply to this email and we will explain.' },
        ...(note ? [{ quote: note }] : []),
        { p: 'You can fix it and upload it again. Common reasons are a preview that does not match the files, client trademarks in the work, or a source file that is missing or will not open.' },
        { button: { label: 'Go to your uploads', url: `${base}/dashboard` } },
      ],
      reason: 'You can turn off upload review emails in Settings > Notifications.',
    }),
  }
}

/* ======================================================= business suite */

export function clientResponseEmail({ projectName, projectId, respondent, formTitle }) {
  const base = appBase()
  const who = respondent || 'Your client'
  return {
    subject: `${who} answered your form for ${projectName}`,
    ...renderEmail({
      heading: `${who} answered your discovery form`,
      preheader: `New responses on ${projectName}.`,
      blocks: [
        { p: `${who} just submitted the ${formTitle || 'discovery'} form for ${projectName}. Their answers are saved on the project and feed the brief, proposal and contract.` },
        { button: { label: 'Read the responses', url: `${base}/suite/business/${projectId}` } },
      ],
      reason: 'You can turn off client response emails in Settings > Notifications.',
    }),
  }
}

/* ======================================================== newsletter */

export function newsletterConfirmEmail({ confirmUrl }) {
  return renderEmail({
    heading: 'Confirm your email',
    preheader: 'One click and you are on the list.',
    blocks: [
      { p: "Thanks for signing up. Confirm and we'll send you new work from creators and the occasional product update." },
      { button: { label: 'Confirm my email', url: confirmUrl } },
      { note: "The link works for 48 hours. If you didn't sign up, ignore this email and you won't hear from us again." },
    ],
    reason: 'Someone entered this address on routicle.vercel.app.',
  })
}

/** A broadcast, from the admin composer. `body` is the lite markup in layout.js. */
export function newsletterEmail({ subject, preheader, body, unsubscribeUrl }) {
  return renderEmail({
    heading: subject,
    preheader,
    blocks: markdownLite(body),
    unsubscribeUrl,
    reason: "You're getting this because you signed up for Routicle updates.",
  })
}

/* ============================================================== admin */

export function testEmail({ transport, from, sentAt }) {
  return {
    subject: 'Routicle email test',
    ...renderEmail({
      heading: 'Email is working',
      preheader: 'A test message from the Routicle admin console.',
      blocks: [
        { p: 'If you can read this, Routicle can send email to your address.' },
        { facts: [['Sent through', transport], ['From', from], ['Sent at', sentAt]] },
        { note: 'In Gmail, choose "Show original" and check that SPF, DKIM and DMARC all say PASS. If any say FAIL or NEUTRAL, mail to other people is likely to land in spam.' },
      ],
      reason: 'You sent this test from the admin console.',
    }),
  }
}
