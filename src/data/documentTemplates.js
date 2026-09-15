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
 * Output shape is a block tree the in-app editor renders and edits directly:
 *   { kind, title, sections: [{ id, heading, blocks: [...] }] }
 *   block = { type: 'text' | 'list' | 'fields' | 'table' | 'signature', ... }
 */

const money = (amount, currency = 'NGN') => {
  const n = Number(amount) || 0
  const symbol = { NGN: '₦', USD: '$', GBP: '£', EUR: '€' }[currency] || ''
  return `${symbol}${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}

const longDate = (value) => {
  if (!value) return ''
  const d = new Date(value)
  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

const shortDate = (value) => {
  if (!value) return ''
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('en-GB')
}

const addDays = (date, days) => {
  const d = date ? new Date(date) : new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const text = (value) => ({ type: 'text', value })
const list = (items) => ({ type: 'list', items: items.filter(Boolean) })
const fields = (rows) => ({ type: 'fields', rows: rows.filter((r) => r && r[1]) })

/** Answers arrive keyed by question id; documents want them keyed by meaning. */
export function answersByMeaning(answers = {}, questions = []) {
  const out = {}
  for (const q of questions) {
    const value = answers[q.id]
    if (value && q.maps) out[q.maps] = value
  }
  return out
}

function preparedBy(studio) {
  return fields([
    ['Prepared by', studio.leadName],
    ['Role', studio.roleTitle || 'Design Lead'],
    ['Studio', studio.studioName],
    ['Address', studio.address],
    ['Phone', studio.phone],
    ['Email', studio.email],
  ])
}

/* ------------------------------------------------------------------ brief */

function buildBrief({ studio, project, a }) {
  const client = project.clientCompany || project.clientName || project.name
  return {
    kind: 'brief',
    title: `Design brief — ${client}`,
    sections: [
      {
        id: 'overview',
        heading: 'Overview',
        blocks: [
          fields([
            ['Client', client],
            ['Contact', project.clientName],
            ['Prepared by', studio.leadName || studio.studioName],
            ['Date', longDate(new Date())],
          ]),
          text(project.description || a.inspiration || 'Project description to be confirmed.'),
        ],
      },
      {
        id: 'goals',
        heading: 'Business goals',
        blocks: [text(a.goals || 'Not captured in discovery.'), a.strategyFit && text(a.strategyFit)].filter(Boolean),
      },
      {
        id: 'audience',
        heading: 'Audience & problem',
        blocks: [
          text(a.audience || 'Not captured in discovery.'),
          a.problem && text(a.problem),
          a.competitors && text(`Competitive context: ${a.competitors}`),
        ].filter(Boolean),
      },
      {
        id: 'brand',
        heading: 'Brand direction',
        blocks: [
          fields([
            ['Three words', a.brandWords],
            ['Should feel', a.brandFeeling],
            ['Key message', a.keyMessage],
            ['Existing guidelines', a.guidelines],
            ['Colours & elements', a.brandElements],
            ['Priority channels', a.channels],
          ]),
        ],
      },
      {
        id: 'success',
        heading: 'What success looks like',
        blocks: [
          text(a.successLooksLike || 'To be agreed with the client.'),
          a.successMetrics && text(`Measured by: ${a.successMetrics}`),
          a.whyNow && text(`Why now: ${a.whyNow}`),
        ].filter(Boolean),
      },
      {
        id: 'logistics',
        heading: 'Timeline & working style',
        blocks: [
          fields([
            ['Start', shortDate(project.startDate)],
            ['Target completion', shortDate(project.endDate) || a.deadline],
            ['Review cadence', a.communication],
            ['Known constraints', a.painPoints],
          ]),
        ],
      },
    ],
  }
}

/* --------------------------------------------------------------- proposal */

function buildProposal({ studio, project, a, packages = [], budgetLines = [], timeline = [] }) {
  const client = project.clientCompany || project.clientName || project.name
  const issued = new Date().toISOString().slice(0, 10)
  const cur = project.currency || studio.currency || 'NGN'

  return {
    kind: 'proposal',
    title: `Project proposal — ${client}`,
    sections: [
      {
        id: 'cover',
        heading: 'Project Proposal',
        blocks: [
          preparedBy(studio),
          fields([
            ['Issued', longDate(issued)],
            ['Valid until', longDate(addDays(issued, 30))],
            ['Prepared for', client],
          ]),
        ],
      },
      {
        id: 'vision',
        heading: 'Vision, Mission & Values',
        blocks: [
          studio.vision && text(studio.vision),
          studio.mission && text(studio.mission),
          studio.coreValues?.length && list(studio.coreValues),
        ].filter(Boolean),
      },
      {
        id: 'who',
        heading: 'Who are we?',
        blocks: [
          studio.about && text(studio.about),
          studio.whatWeDo?.length && list(studio.whatWeDo),
        ].filter(Boolean),
      },
      {
        id: 'staff',
        heading: 'Our staff',
        blocks: [
          text('Our collective experience and dedication drive our success in delivering exceptional solutions to our clients.'),
          ...(studio.staff || []).map((m) =>
            fields([
              ['Name', m.name],
              ['Role', m.role],
              ['Experience', m.years ? `${m.years} years` : ''],
              ['About', m.bio],
            ])
          ),
        ],
      },
      {
        id: 'strategy',
        heading: 'Our service strategy',
        blocks: [
          list([
            'Discovery Session: Our journey begins with you. Through open communication and shared vision, we embark on a creative partnership that goes beyond conventional agency-client relationships.',
            "Proposal Submission: Following the discovery session, we translate our insights into a detailed proposal that outlines a strategic roadmap for your brand's visual identity.",
            'Contract Submission: Upon your approval of the proposal, we formalise our partnership with a contract, conveying our commitment to transparency and professionalism.',
            'Concept Development: With the groundwork laid, the designer dives into visionary ideation, translating insights from the discovery session into tangible design concepts.',
            'Iterative Feedback and Refinement: Your feedback is invaluable. Through regular communication and feedback sessions, we refine and tailor the designs to align with your vision.',
          ]),
        ],
      },
      studio.caseStudy?.summary && {
        id: 'case-study',
        heading: 'Case study',
        blocks: [
          text(studio.caseStudy.summary),
          studio.caseStudy.goals?.length && list(studio.caseStudy.goals),
          studio.caseStudy.results?.length && list(studio.caseStudy.results),
        ].filter(Boolean),
      },
      {
        id: 'offer',
        heading: 'Our offer',
        blocks: [
          text(
            `It was enlightening speaking with ${project.clientName || 'you'} and learning about the needs of ${client}. Below you'll find your estimated investment to complete this project.`
          ),
          ...(packages.length
            ? packages.map((p) =>
                fields([
                  ['Option', p.name],
                  ['Includes', (p.items || []).join(', ')],
                  ['Timeline', p.timeline],
                  ['Investment', money(p.price, cur)],
                ])
              )
            : [text('Add one or more packages to this project to populate the offer.')]),
          text(
            'NOTE: Prices and offers are open to slight negotiation. The Client is afforded the opportunity to name a reasonable counter price for services. However, that does not guarantee acceptance.'
          ),
        ],
      },
      {
        id: 'phases',
        heading: 'Project phases',
        blocks: [
          list([
            '01 Discovery Phase — thorough research to understand the business, target audience, industry landscape, competition and objectives.',
            '02 Proposal Submission Phase — a detailed proposal outlining scope, timeline, deliverables and cost estimates based on the insights gathered.',
            '03 Contract Submission Phase — terms and conditions, payment terms, milestones and intellectual property rights, formalising the agreement.',
            '04 Content Strategy Development Phase — key brand messages, tone of voice and visual elements, guiding the creation of brand collateral.',
            '05 Iterative Feedback and Refinement Phase — client feedback on concepts and prototypes, refined until the identity aligns with the vision.',
          ]),
        ],
      },
      budgetLines.length && {
        id: 'budget',
        heading: 'Budget breakdown',
        blocks: [
          {
            type: 'table',
            columns: ['Item', 'Amount'],
            rows: budgetLines.map((l) => [l.label, money(l.amount, cur)]),
          },
        ],
      },
      {
        id: 'timeline',
        heading: 'Project timeline',
        blocks: [
          text(
            'This is an approximate timeline for when we anticipate the project will reach completion. These dates are reference points rather than strict deadlines.'
          ),
          timeline.length
            ? { type: 'table', columns: ['Milestone', 'Date'], rows: timeline.map((t) => [t.label, shortDate(t.date)]) }
            : fields([
                ['Start', shortDate(project.startDate)],
                ['Target completion', shortDate(project.endDate)],
              ]),
        ],
      },
    ].filter(Boolean),
  }
}

/* --------------------------------------------------------------- contract */

function buildContract({ studio, project, packages = [] }) {
  const client = project.clientCompany || project.clientName || project.name
  const cur = project.currency || studio.currency || 'NGN'
  const chosen = packages.find((p) => p.selected) || packages[0]
  const fee = chosen?.price

  return {
    kind: 'contract',
    title: `Design services contract — ${client}`,
    sections: [
      {
        id: 'parties',
        heading: '1. Parties',
        blocks: [
          text(`This Design Services Contract is entered into on ${longDate(new Date())} by and between:`),
          fields([
            ['Client name', client],
            ['Address', project.clientAddress],
            ['Email', project.clientEmail],
            ['Phone', project.clientPhone],
          ]),
          text('Hereafter referred to as the "Client."'),
          fields([
            ['Contractor name', studio.leadName || studio.studioName],
            ['Address', studio.address],
            ['Email', studio.email],
            ['Phone', studio.phone],
          ]),
          text('Hereafter referred to as the "Designer."'),
        ],
      },
      {
        id: 'scope',
        heading: '2. Project scope',
        blocks: [
          text('2.1 Project Description — The Client agrees to hire the Designer to provide design services as described below:'),
          text(project.description || 'Scope to be confirmed.'),
          text('2.2 Project Process — The Parties agree to follow the following project process:'),
          list(['Discovery Meeting', 'Acceptance of Quote', 'Signing of the Design Service Contract', 'Rendering of every service required of the Designer']),
        ],
      },
      {
        id: 'deliverables',
        heading: '3. Deliverables',
        blocks: [
          text('3.1 Expected Deliverables — The Designer agrees to deliver the following design materials:'),
          list(chosen?.items?.length ? chosen.items : ['Deliverables to be confirmed.']),
          text('3.2 Approval Process — The Client shall review the deliverables promptly upon receipt and provide feedback within 3 days. Revisions, if necessary, will be made by the Designer.'),
        ],
      },
      {
        id: 'timeline',
        heading: '4. Timeline',
        blocks: [
          fields([
            ['Start date', shortDate(project.startDate)],
            ['End date', shortDate(project.endDate)],
          ]),
          text('The provided timeline is approximate. These dates are not meant to pressure or rush the process; they serve as reference points rather than strict deadlines.'),
        ],
      },
      {
        id: 'payment',
        heading: '5. Payment policy',
        blocks: [
          text(
            fee
              ? `5.1 Payment Amount — Client shall pay Designer a sum of ${money(fee, cur)} for the services performed under this contract.`
              : '5.1 Payment Amount — Fee to be confirmed from the accepted proposal option.'
          ),
          text('5.2 Payment Method — Payments shall be made into:'),
          fields([
            ['Account name', studio.accountName],
            ['Account number', studio.accountNumber],
            ['Bank', studio.bankName],
          ]),
        ],
      },
      {
        id: 'rights',
        heading: '6. Ownership and rights',
        blocks: [
          text('6.1 Transfer of Rights — Upon full payment of the compensation set forth in this contract, Client shall be the exclusive owner of all intellectual property rights, including but not limited to copyrights and trademarks, in and to the work product produced by Designer in connection with this contract. All sketches designed during this project which are not used by the Client will remain the property of the Designer.'),
          text('6.2 Portfolio Usage — The Designer is granted the right to use the completed design materials for portfolio and self-promotion purposes.'),
        ],
      },
      {
        id: 'revisions',
        heading: '7. Revisions and feedback',
        blocks: [
          text('The Client agrees to provide timely feedback and request revisions, if necessary, within 2 days of receiving deliverables. The Client is entitled to up to 5 rounds of revisions. In the event that further revisions become necessary beyond what was initially agreed upon, each additional round of revisions will incur an additional fee.'),
        ],
      },
      {
        id: 'confidentiality',
        heading: '8. Confidentiality',
        blocks: [text('Client and Designer agree to maintain the confidentiality of any proprietary or sensitive information shared during the project.')],
      },
      {
        id: 'cancellation',
        heading: '9. Cancellation',
        blocks: [
          text('Client or Designer may terminate this contract with written notice if the other Party breaches any material term or condition. In the event of termination, the Client shall pay for any work completed up to that point. If the Client decides to cancel the project after ideas and proposals have been submitted, refunds for any previous payments made will not be provided.'),
        ],
      },
      {
        id: 'unforeseen',
        heading: '10. Unforeseen circumstances',
        blocks: [
          text('In the event that the Designer becomes incapacitated or unable to continue the project due to unexpected and uncontrollable circumstances (e.g. acts of nature, illness, or other emergencies), a portion of the total project budget may be reimbursed. If the work completed thus far can be utilised by another designer to continue the project, a refund percentage will be determined based on the work completed.'),
        ],
      },
      {
        id: 'communication',
        heading: '11. Communication policy',
        blocks: [text('No communication from the Client 30 days after a request for information has been made by the Designer automatically terminates the project.')],
      },
      {
        id: 'pause',
        heading: '12. Pause clause',
        blocks: [
          text('If the Client fails to provide the Designer necessary feedback within 4 days of receiving work of any kind, the Designer is no longer responsible for delivering the project within the specified timeline and has the right to implement a pause on the project unless an alternate solution is mutually agreed upon.'),
        ],
      },
      {
        id: 'suspension',
        heading: '13. Project suspension',
        blocks: [text('Should the project need to be suspended for any reason, the Client and Designer shall discuss the terms and conditions for resuming the project at a later date.')],
      },
      {
        id: 'entire',
        heading: '14. Entire agreement',
        blocks: [
          text('This contract constitutes the entire agreement between the parties and supersedes all prior negotiations, understandings and agreements between them, whether written or oral, relating to the subject matter of this contract.'),
        ],
      },
      {
        id: 'amendment',
        heading: '15. Amendment',
        blocks: [text('This contract may be amended or modified only by written agreement signed by both parties.')],
      },
      {
        id: 'signatures',
        heading: '16. Signatures',
        blocks: [
          text('By signing below, the parties acknowledge their understanding and acceptance of the terms and conditions outlined in this contract.'),
          { type: 'signature', parties: ['Client', 'Designer'] },
          text('Please retain a copy of this contract for your records.'),
        ],
      },
    ],
  }
}

/* ---------------------------------------------------------------- invoice */

function buildInvoice({ studio, project, lines = [], invoiceNumber, period, taxRate = 0, discount = 0 }) {
  const client = project.clientCompany || project.clientName || project.name
  const cur = project.currency || studio.currency || 'NGN'
  const issued = new Date().toISOString().slice(0, 10)

  const rows = lines.length ? lines : [{ description: 'Services rendered', quantity: 1, price: 0 }]
  const subtotal = rows.reduce((sum, l) => sum + (Number(l.price) || 0) * (Number(l.quantity) || 1), 0)
  const taxes = subtotal * (Number(taxRate) || 0)
  const total = subtotal + taxes - (Number(discount) || 0)

  return {
    kind: 'invoice',
    title: `Invoice ${invoiceNumber || '0001'}${period ? ` — ${period}` : ''}`,
    sections: [
      {
        id: 'header',
        heading: 'Invoice',
        blocks: [
          fields([
            ['Invoice no.', invoiceNumber || '0001'],
            ['Date', shortDate(issued)],
            ['Due date', shortDate(addDays(issued, 14))],
            period ? ['Period', period] : null,
          ]),
          fields([
            ['Bill to', client],
            ['Attention', project.clientName],
            ['Address', project.clientAddress],
            ['Email', project.clientEmail],
          ]),
          fields([
            ['Payable to', studio.studioName || studio.leadName],
            ['Phone', studio.phone],
            ['Email', studio.email],
          ]),
        ],
      },
      {
        id: 'lines',
        heading: 'Description',
        blocks: [
          {
            type: 'table',
            columns: ['Description', 'Qty', 'Price', 'Total'],
            rows: rows.map((l) => [
              l.description,
              String(l.quantity || 1),
              money(l.price, cur),
              money((Number(l.price) || 0) * (Number(l.quantity) || 1), cur),
            ]),
          },
          fields([
            ['Subtotal', money(subtotal, cur)],
            ['Taxes (VAT)', `${Math.round((Number(taxRate) || 0) * 100)}%  ${money(taxes, cur)}`],
            ['Discount', money(discount, cur)],
            ['Total amount', money(total, cur)],
          ]),
        ],
      },
      {
        id: 'payment',
        heading: 'Payment details',
        blocks: [
          fields([
            ['Bank name', studio.bankName],
            ['Account name', studio.accountName],
            ['Account number', studio.accountNumber],
          ]),
        ],
      },
    ],
  }
}

const BUILDERS = { brief: buildBrief, proposal: buildProposal, contract: buildContract, invoice: buildInvoice }

/**
 * Builds one document. `ctx` carries the studio profile, the project, the
 * discovery answers already mapped by meaning, and any packages/lines the
 * subscriber has entered.
 */
export function buildDocument(kind, ctx) {
  const builder = BUILDERS[kind]
  if (!builder) throw new Error(`Unknown document kind: ${kind}`)
  return builder({ a: {}, ...ctx })
}

export const DOCUMENT_KINDS = [
  { id: 'brief', label: 'Design brief', blurb: "Built from the client's own discovery answers." },
  { id: 'proposal', label: 'Proposal', blurb: 'Your studio profile, their project, your packages.' },
  { id: 'contract', label: 'Contract', blurb: 'Your standard terms, their details and the accepted figure.' },
  { id: 'invoice', label: 'Invoice', blurb: 'Line items and your bank details.' },
]
