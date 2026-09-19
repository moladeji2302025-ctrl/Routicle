/**
 * Document generation for the Business Suite.
 *
 * These are merge templates, not generations. The prose below is fixed and
 * identical for every project — what changes per client is the name, the dates,
 * the figures and the answers they gave in discovery. That means generating a
 * proposal costs nothing: no model call, no credits, no latency, and the same
 * input always produces the same document.
 *
 * Everything an agency would otherwise hardcode (vision, staff, case study,
 * bank details) comes from the subscriber's own Studio Profile, so the output
 * is their document rather than a template with someone else's identity in it.
 *
 * Output is version 2: structured data per kind, which DocumentRenderer lays
 * out page by page after the Branded Proposal, Contract and Invoice templates.
 * The look (fonts, colours, cover) is a separate `style`, so the same content
 * can be shown in any of the styles in documentStyles.js.
 *
 * Version 1 documents (a flat list of text blocks) still open, in the old
 * block editor, so nothing already generated is lost.
 */

import { DEFAULT_STYLE_ID } from './documentStyles'

export const CURRENCY_SYMBOL = { NGN: '₦', USD: '$', GBP: '£', EUR: '€', GHS: 'GH₵', KES: 'KSh', ZAR: 'R' }

export const money = (amount, currency = 'NGN') => {
  const n = Number(String(amount ?? '').replace(/[^0-9.-]/g, '')) || 0
  const symbol = CURRENCY_SYMBOL[currency] ?? ''
  return `${symbol}${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}

export const longDate = (value) => {
  if (!value) return ''
  const d = new Date(value)
  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
}

export const shortDate = (value) => {
  if (!value) return ''
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('en-GB')
}

const isoDay = (d) => d.toISOString().slice(0, 10)

const addDays = (date, days) => {
  const d = date ? new Date(date) : new Date()
  d.setDate(d.getDate() + days)
  return isoDay(d)
}

/* ---------------------------------------------------------- amount in words */

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
  'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
const SCALES = ['', 'Thousand', 'Million', 'Billion', 'Trillion']
const CURRENCY_WORD = { NGN: 'Naira', USD: 'US Dollars', GBP: 'Pounds', EUR: 'Euros', GHS: 'Cedis', KES: 'Shillings', ZAR: 'Rand' }

function under1000(n) {
  const out = []
  if (n >= 100) {
    out.push(`${ONES[Math.floor(n / 100)]} Hundred`)
    n %= 100
  }
  if (n >= 20) {
    out.push(TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : ''))
  } else if (n > 0) {
    out.push(ONES[n])
  }
  return out.join(' ')
}

/** 500000, 'NGN' → "Five Hundred Thousand Naira", the way the contract states a fee. */
export function amountInWords(amount, currency = 'NGN') {
  let n = Math.floor(Math.abs(Number(amount) || 0))
  if (n === 0) return `Zero ${CURRENCY_WORD[currency] || currency}`
  const parts = []
  for (let i = 0; n > 0 && i < SCALES.length; i += 1) {
    const chunk = n % 1000
    if (chunk) parts.unshift([under1000(chunk), SCALES[i]].filter(Boolean).join(' '))
    n = Math.floor(n / 1000)
  }
  return `${parts.join(' ')} ${CURRENCY_WORD[currency] || currency}`
}

/* ---------------------------------------------------------------- helpers */

/** Answers arrive keyed by question id; documents want them keyed by meaning. */
export function answersByMeaning(answers = {}, questions = []) {
  const out = {}
  for (const q of questions) {
    const value = answers[q.id]
    if (value && q.maps) out[q.maps] = value
  }
  return out
}

/**
 * The template sets the first sentence of the vision and mission as a bold
 * accent line, with the rest as body copy underneath.
 */
function splitLead(text) {
  const t = String(text || '').trim()
  if (!t) return { lead: '', body: '' }
  const m = /^(.+?[.!?])\s+([\s\S]+)$/.exec(t)
  return m ? { lead: m[1], body: m[2] } : { lead: t, body: '' }
}

function studioOf(studio = {}) {
  return {
    name: studio.studioName || studio.leadName || 'Your Studio',
    lead: studio.leadName || '',
    role: studio.roleTitle || 'Design Lead',
    address: studio.address || '',
    phone: studio.phone || '',
    email: studio.email || '',
    website: studio.website || '',
  }
}

function clientOf(project = {}) {
  return {
    name: project.clientCompany || project.clientName || project.name || 'Client',
    contact: project.clientName || '',
    email: project.clientEmail || '',
    phone: project.clientPhone || '',
    address: project.clientAddress || '',
  }
}

/**
 * A first-draft schedule from the project's own dates, split across the phases
 * the proposal describes. The subscriber drags the dates about afterwards.
 */
function draftTimeline(project) {
  const start = project.startDate ? new Date(project.startDate) : new Date()
  const endGuess = project.endDate ? new Date(project.endDate) : new Date(start.getTime() + 28 * 864e5)
  const span = Math.max(4, Math.round((endGuess - start) / 864e5))
  const at = (f) => isoDay(new Date(start.getTime() + Math.round(span * f) * 864e5))
  return [
    { label: 'Discovery & strategy', start: at(0), end: at(0.2) },
    { label: 'Concepts', start: at(0.2), end: at(0.55) },
    { label: 'Feedback & refinement', start: at(0.55), end: at(0.85) },
    { label: 'Final delivery', start: at(0.85), end: at(1) },
  ]
}

/* ------------------------------------------------------------------ brief */

function buildBrief({ studio, project, a }) {
  const client = clientOf(project)
  const rows = (pairs) => pairs.filter((p) => p[1])
  return {
    version: 2,
    kind: 'brief',
    title: 'Design Brief',
    studio: studioOf(studio),
    client,
    date: isoDay(new Date()),
    clauses: [
      {
        heading: 'Overview',
        blocks: [
          { text: project.description || a.inspiration || 'Project description to be confirmed.' },
          { fields: rows([['Client', client.name], ['Contact', client.contact], ['Prepared by', studio.leadName || studio.studioName]]) },
        ],
      },
      { heading: 'Business goals', blocks: [{ text: a.goals || 'Not captured in discovery.' }, a.strategyFit && { text: a.strategyFit }].filter(Boolean) },
      {
        heading: 'Audience & problem',
        blocks: [
          { text: a.audience || 'Not captured in discovery.' },
          a.problem && { sub: 'The problem', text: a.problem },
          a.competitors && { sub: 'Competitive context', text: a.competitors },
        ].filter(Boolean),
      },
      {
        heading: 'Brand direction',
        blocks: [
          {
            fields: rows([
              ['Three words', a.brandWords],
              ['Should feel', a.brandFeeling],
              ['Key message', a.keyMessage],
              ['Existing guidelines', a.guidelines],
              ['Colours & elements', a.brandElements],
              ['Priority channels', a.channels],
            ]),
          },
        ],
      },
      {
        heading: 'What success looks like',
        blocks: [
          { text: a.successLooksLike || 'To be agreed with the client.' },
          a.successMetrics && { sub: 'Measured by', text: a.successMetrics },
          a.whyNow && { sub: 'Why now', text: a.whyNow },
        ].filter(Boolean),
      },
      {
        heading: 'Timeline & working style',
        blocks: [
          {
            fields: rows([
              ['Start', shortDate(project.startDate)],
              ['Target completion', shortDate(project.endDate) || a.deadline],
              ['Review cadence', a.communication],
              ['Known constraints', a.painPoints],
            ]),
          },
        ],
      },
    ],
  }
}

/* --------------------------------------------------------------- proposal */

function buildProposal({ studio, project, packages = [], lines = [] }) {
  const client = clientOf(project)
  const issued = isoDay(new Date())
  const vision = splitLead(studio.vision)
  const mission = splitLead(studio.mission)
  const hasCase = Boolean(studio.caseStudy?.summary)

  return {
    version: 2,
    kind: 'proposal',
    title: 'Project Proposal',
    studio: studioOf(studio),
    client,
    currency: project.currency || studio.currency || 'NGN',
    issued,
    validUntil: addDays(issued, 30),
    vision,
    mission,
    values: studio.coreValues?.length ? studio.coreValues : ['Service', 'Transparency', 'Excellence'],
    about: {
      body:
        studio.about ||
        `${studioOf(studio).name} is a design studio that turns ideas into brands people remember. We pair strategy with craft, so every piece we make does a job for the business behind it.`,
    },
    whatWeDo: {
      body: `${studioOf(studio).name} brings brands to life through considered, strategic design, from logos to full visual identities.`,
      items: studio.whatWeDo?.length ? studio.whatWeDo : ['Brand & visual identity', 'Marketing campaigns', 'Social media design'],
    },
    staff: {
      intro: `At ${studioOf(studio).name} we take pride in the talented people who make up our team. Our collective experience and dedication drive the work we deliver for our clients.`,
      members: (studio.staff || []).map((m) => ({ name: m.name || '', role: m.role || '', years: m.years || '', bio: m.bio || '' })),
    },
    strategy: [
      { title: 'Discovery Session', body: 'Our journey begins with you. Through open conversation we get to know your business, your audience and what this project needs to do.' },
      { title: 'Proposal Submission', body: 'Following discovery, we turn what we learned into a detailed proposal: a clear roadmap for the work, the timeline and the investment.' },
      { title: 'Contract Submission', body: 'Once you approve the proposal, we formalise the partnership in a contract, so both sides are clear on the terms before work begins.' },
      { title: 'Concept Development', body: 'With the groundwork laid, the designers turn insight into concepts, grounded in what came out of the discovery session.' },
      { title: 'Iterative Feedback and Refinement', body: 'Your feedback shapes the outcome. We review, refine and tailor the designs with you until they match your vision.' },
    ],
    caseStudy: hasCase
      ? { summary: studio.caseStudy.summary, goals: studio.caseStudy.goals || [], results: studio.caseStudy.results || [] }
      : { summary: '', goals: [], results: [] },
    services: {
      intro: 'The services we offer, priced per project. Every engagement is scoped to what the client actually needs.',
      rows: (studio.whatWeDo?.length ? studio.whatWeDo : ['Graphic Design', 'Motion Graphics', 'Brand Strategy']).map((name) => ({
        name,
        price: 'On request',
      })),
    },
    phases: {
      intro: `Below are the phases involved in crafting a tailored solution for ${client.name}.`,
      items: [
        { title: 'Discovery Phase', body: "We research the client's business, target audience, industry, competition and objectives through interviews, market analysis and brand audits, to understand the brand's values, positioning and goals." },
        { title: 'Proposal Submission Phase', body: 'We set out the scope of work, timeline, deliverables and costs, and show how the design solution addresses the needs uncovered in discovery.' },
        { title: 'Contract Submission Phase', body: 'Once the proposal is approved, a contract formalises the terms: payment, milestones, intellectual property and responsibilities on both sides.' },
        { title: 'Content Strategy Development Phase', body: 'Together we define key brand messages, tone of voice and the visual elements that guide every asset, so the identity stays consistent across touchpoints.' },
        { title: 'Iterative Feedback and Refinement Phase', body: 'The client reviews concepts and prototypes, and we refine them round by round until the final identity matches their vision and objectives.' },
      ],
    },
    offer: {
      intro: `It was great speaking with ${client.contact || 'you'} and learning about what ${client.name} needs. Below is the estimated investment to complete this project.`,
      packages: packages.length
        ? packages.map((p, i) => ({
            name: p.name || `Option ${i + 1}`,
            items: p.items || [],
            timeline: p.timeline || '',
            price: String(p.price ?? ''),
            featured: Boolean(p.selected) || (!packages.some((x) => x.selected) && packages.length === 3 && i === 1),
          }))
        : [
            { name: 'Option One', items: ['Discovery & strategy', 'Primary logo', 'Colour palette'], timeline: '2 weeks', price: '', featured: false },
            { name: 'Option Two', items: ['Everything in Option One', 'Full visual identity', 'Brand guidelines'], timeline: '3 weeks', price: '', featured: true },
            { name: 'Option Three', items: ['Everything in Option Two', 'Social media kit', 'Launch campaign'], timeline: '4 weeks', price: '', featured: false },
          ],
      note: 'Prices and offers are open to slight negotiation. The Client is afforded the opportunity to name a reasonable counter price for services. However, that does not guarantee acceptance.',
    },
    budget: {
      intro: 'Below is the budget breakdown for the completion of the project.',
      groups: lines.length
        ? [{ name: 'Services', rows: lines.map((l) => ({ label: l.description || '', amount: String((Number(l.price) || 0) * (Number(l.quantity) || 1)) })) }]
        : [],
    },
    timeline: {
      intro: 'This is an approximate timeline for when we expect the project to reach completion. The dates are reference points rather than strict deadlines.',
      rows: draftTimeline(project),
    },
    // Pages that can be left out. Case study and budget start off when there
    // is nothing to put in them.
    show: {
      vision: Boolean(studio.vision || studio.mission),
      about: true,
      staff: (studio.staff || []).length > 0,
      strategy: true,
      caseStudy: hasCase,
      services: true,
      phases: true,
      offer: true,
      budget: lines.length > 0,
      timeline: true,
    },
  }
}

/* --------------------------------------------------------------- contract */

function buildContract({ studio, project, packages = [] }) {
  const client = clientOf(project)
  const s = studioOf(studio)
  const cur = project.currency || studio.currency || 'NGN'
  const chosen = packages.find((p) => p.selected) || packages[0]
  const fee = Number(chosen?.price) || 0
  const payBy = project.endDate || addDays(new Date(), 30)

  return {
    version: 2,
    kind: 'contract',
    title: 'Design Services Contract',
    studio: s,
    client,
    currency: cur,
    date: isoDay(new Date()),
    parties: {
      client: { name: client.contact || client.name, company: client.name, address: client.address, email: client.email, phone: client.phone },
      designer: { name: s.lead || s.name, company: s.name, address: s.address, email: s.email, phone: s.phone },
    },
    clauses: [
      {
        heading: 'Project Scope',
        blocks: [
          { sub: '2.1 Project Description', text: `The Client agrees to hire the Designer to provide design services as described below:\n${project.description || 'Scope to be confirmed.'}` },
          { sub: '2.2 Project Process', text: 'The Parties agree to follow the following project process:' },
          { items: ['Discovery Meeting', 'Acceptance of Quote', 'Signing of the Design Service Contract', 'Rendering of every service required of the Designer'] },
        ],
      },
      {
        heading: 'Deliverables',
        blocks: [
          { sub: '3.1 Expected Deliverables', text: 'The Designer agrees to deliver the following design materials:' },
          { items: chosen?.items?.length ? chosen.items : ['Deliverables to be confirmed'] },
          { sub: '3.2 Approval Process', text: 'The Client shall review the deliverables promptly upon receipt and provide feedback within 3 days. Revisions, if necessary, will be made by the Designer.' },
        ],
      },
      {
        heading: 'Timeline',
        blocks: [
          { text: "Here's a breakdown of when the project is set to commence:" },
          { fields: [['Start date', shortDate(project.startDate) || 'To be confirmed'], ['End date', shortDate(project.endDate) || 'To be confirmed']] },
          { text: 'The provided timeline is an approximate timeline for when the project will reach completion. These dates are not meant to pressure or rush the process; they serve as reference points rather than strict deadlines.' },
        ],
      },
      {
        heading: 'Payment Policy',
        blocks: [
          {
            sub: '5.1 Payment Amount',
            text: fee
              ? `Client shall pay Designer a sum of ${amountInWords(fee, cur)} (${money(fee, cur)}) for the services performed under this contract. The payment policy for the project is:`
              : 'Client shall pay Designer the fee of the accepted proposal option for the services performed under this contract. The payment policy for the project is:',
          },
          { items: [`A one time payment into the Designer's bank account on ${longDate(payBy)}`] },
          { sub: '5.2 Payment Method', text: 'Payments shall be made into:' },
          { fields: [['Account name', studio.accountName || ''], ['Account number', studio.accountNumber || ''], ['Bank', studio.bankName || '']] },
        ],
      },
      {
        heading: 'Ownership and Rights',
        blocks: [
          { sub: '6.1 Transfer of Rights', text: 'Upon full payment of the compensation set forth in this contract, Client shall be the exclusive owner of all intellectual property rights, including but not limited to copyrights and trademarks, in and to the work product produced by Designer in connection with this contract. All sketches designed during this project which are not used by the Client will remain the property of the Designer.' },
          { sub: '6.2 Portfolio Usage', text: 'The Designer is granted the right to use the completed design materials for portfolio and self-promotion purposes.' },
        ],
      },
      { heading: 'Revisions and Feedback', blocks: [{ text: 'The Client agrees to provide timely feedback and request revisions, if necessary, within 2 days of receiving deliverables. The Client is entitled to up to 5 rounds of revisions. Where further revisions become necessary beyond what was initially agreed, each additional round will incur an additional fee.' }] },
      { heading: 'Confidentiality', blocks: [{ text: 'Client and Designer agree to maintain the confidentiality of any proprietary or sensitive information shared during the project.' }] },
      { heading: 'Cancellation', blocks: [{ text: 'Client or Designer may terminate this contract with written notice if the other Party breaches any material term or condition. In the event of termination, the Client shall pay for any work completed up to that point. If the Client decides to cancel the project after ideas and proposals have been submitted, refunds for any previous payments made will not be provided.' }] },
      { heading: 'Unforeseen Circumstances', blocks: [{ text: 'In the event that the Designer becomes incapacitated or unable to continue the project due to unexpected and uncontrollable circumstances (e.g. acts of nature, illness, or other emergencies), a portion of the total project budget may be reimbursed. If the work completed thus far can be used by another designer to continue the project, a refund percentage will be determined based on the work completed.' }] },
      { heading: 'Communication Policy', blocks: [{ text: 'No communication from the Client 30 days after a request for information has been made by the Designer automatically terminates the project.' }] },
      { heading: 'Pause Clause', blocks: [{ text: 'If the Client fails to provide the Designer necessary feedback within 4 days of receiving work of any kind, the Designer is no longer responsible for delivering the project within the specified timeline and has the right to pause the project unless an alternate solution is mutually agreed upon.' }] },
      { heading: 'Amendment', blocks: [{ text: 'This contract may be amended or modified only by written agreement signed by both parties.' }] },
      { heading: 'Project Suspension', blocks: [{ text: 'Should the project need to be suspended for any reason, the Client and Designer shall discuss the terms and conditions for resuming the project at a later date.' }] },
      { heading: 'Entire Agreement', blocks: [{ text: 'This contract constitutes the entire agreement between the parties and supersedes all prior negotiations, understandings and agreements between them, whether written or oral, relating to the subject matter of this contract.' }] },
    ],
    closing: 'By signing below, the parties acknowledge their understanding and acceptance of the terms and conditions outlined in this contract.',
  }
}

/* ---------------------------------------------------------------- invoice */

function buildInvoice({ studio, project, lines = [], invoiceNumber, period }) {
  const client = clientOf(project)
  const s = studioOf(studio)
  const issued = isoDay(new Date())
  return {
    version: 2,
    kind: 'invoice',
    title: 'Invoice',
    studio: s,
    client,
    currency: project.currency || studio.currency || 'NGN',
    number: invoiceNumber || '0001',
    date: issued,
    due: addDays(issued, 14),
    period: period || '',
    unitLabel: project.billingType === 'recurring' ? 'Month' : 'Qty',
    billTo: { name: client.contact, company: client.name, address: client.address, email: client.email },
    payableTo: { name: s.name, phone: s.phone, email: s.email },
    lines: (lines.length ? lines : [{ description: 'Services rendered', quantity: 1, price: 0 }]).map((l) => ({
      description: l.description || '',
      quantity: String(l.quantity || 1),
      price: String(l.price ?? 0),
    })),
    taxRate: '0',
    discount: '0',
    bank: { bankName: studio.bankName || '', accountNumber: studio.accountNumber || '', accountName: studio.accountName || '' },
  }
}

/** The totals are worked out when drawn, from the lines, never stored. */
export function invoiceTotals(doc) {
  const subtotal = (doc.lines || []).reduce(
    (sum, l) => sum + (Number(String(l.price).replace(/[^0-9.-]/g, '')) || 0) * (Number(l.quantity) || 0),
    0
  )
  const discount = subtotal * ((Number(doc.discount) || 0) / 100)
  const taxes = (subtotal - discount) * ((Number(doc.taxRate) || 0) / 100)
  return { subtotal, discount, taxes, total: subtotal - discount + taxes }
}

const BUILDERS = { brief: buildBrief, proposal: buildProposal, contract: buildContract, invoice: buildInvoice }

/**
 * Builds one document. `ctx` carries the studio profile, the project, the
 * discovery answers already mapped by meaning, any packages/lines the
 * subscriber has entered, and the chosen style and accent colour.
 */
export function buildDocument(kind, ctx) {
  const builder = BUILDERS[kind]
  if (!builder) throw new Error(`Unknown document kind: ${kind}`)
  const doc = builder({ a: {}, ...ctx })
  return { ...doc, style: ctx.style || DEFAULT_STYLE_ID, accent: ctx.accent || null }
}

export const DOCUMENT_KINDS = [
  { id: 'proposal', label: 'Proposal', blurb: 'Your studio, their project and your options, over up to 13 designed pages.' },
  { id: 'contract', label: 'Contract', blurb: 'Your standard terms, their details and the accepted figure.' },
  { id: 'invoice', label: 'Invoice', blurb: 'Line items, totals worked out for you, and your bank details.' },
  { id: 'brief', label: 'Design brief', blurb: "Built from the client's own discovery answers." },
]

/**
 * What a document of this kind will be missing, so the subscriber can fix it
 * before generating rather than discover blanks afterwards.
 */
export function readiness(kind, { profile, project, submissions, figures }) {
  const p = profile || {}
  const packages = figures?.packages || []
  const lines = figures?.lines || []
  const checks = [
    { ok: Boolean(profile && (p.studioName || p.leadName)), label: 'Studio profile', fix: 'Add your studio name and contact details', to: '/suite/business/studio' },
  ]
  if (kind === 'proposal') {
    checks.push(
      { ok: Boolean(p.vision || p.mission), label: 'Vision & mission', fix: 'Without them the proposal skips that page', to: '/suite/business/studio' },
      { ok: (p.staff || []).length > 0, label: 'Team', fix: 'Add your team to include the staff page', to: '/suite/business/studio' },
      { ok: packages.length > 0, label: 'Options & prices', fix: 'Add options under Figures, or fill in the sample ones after', tab: 'figures' }
    )
  }
  if (kind === 'contract') {
    checks.push(
      { ok: packages.length > 0, label: 'Accepted option', fix: 'The fee and deliverables come from Figures', tab: 'figures' },
      { ok: Boolean(p.accountNumber), label: 'Bank details', fix: 'Add them to your studio profile', to: '/suite/business/studio' },
      { ok: Boolean(project?.clientEmail || project?.clientAddress), label: 'Client details', fix: 'Add the client contact to the project' }
    )
  }
  if (kind === 'invoice') {
    checks.push(
      { ok: lines.length > 0, label: 'Invoice lines', fix: 'Add lines under Figures, or type them in after', tab: 'figures' },
      { ok: Boolean(p.accountNumber), label: 'Bank details', fix: 'Add them to your studio profile', to: '/suite/business/studio' }
    )
  }
  if (kind === 'brief') {
    checks.push({ ok: (submissions || []).length > 0, label: 'Client answers', fix: 'Send the discovery form first; the brief quotes it', tab: 'form' })
  }
  return checks
}
