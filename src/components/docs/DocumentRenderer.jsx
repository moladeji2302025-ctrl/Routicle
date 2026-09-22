import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { findStyle, styleVars, coverFace } from '../../data/documentStyles'
import { longDate, shortDate, money, invoiceTotals, amountInWords } from '../../data/documentTemplates'
import { ensureFont } from '../../lib/fonts'
import { DocProvider, useDoc, E, EDate, EList, EditOnly, useListOps, RemoveBtn, AddBtn } from './DocEditable'

/**
 * Draws a version 2 document as A4 pages, laid out after the Branded Proposal,
 * Contract and Invoice templates: a full cover, a contents page, a running
 * header and footer, and a designed page per section.
 *
 * Pages are a fixed 794 × 1123 CSS pixels (A4 at 96dpi) and print one to a
 * sheet. On a narrow screen the whole stack is zoomed down to fit rather than
 * reflowed, so what you see on a phone is still the page that will print.
 */

/**
 * The proposal is drawn at the size of the Branded Proposal template itself
 * (893 × 1263), so its type sizes and spacing are the template's own numbers
 * rather than an approximation of them. Contracts, briefs and invoices keep
 * A4 at 96dpi.
 */
const A4_WIDTH = 794
const PROPOSAL_WIDTH = 893
const pageWidthFor = (kind) => (kind === 'proposal' ? PROPOSAL_WIDTH : A4_WIDTH)

/* ------------------------------------------------------------- shared bits */

const parseMoney = (t) => String(t).replace(/[^0-9.]/g, '')

function Wordmark({ className = '' }) {
  return <E path="studio.name" className={`dt-wordmark ${className}`} placeholder="Studio name" />
}

function Heading({ n, far, children }) {
  const { style } = useDocMeta()
  // 'ghost' reuses the same section number as 'numbered', just drawn as a
  // huge pale watermark behind the heading instead of a small accent label.
  const showNum = style.heads === 'numbered' || style.heads === 'ghost'
  return (
    <div className={`dt-h dt-h-${style.heads}${far ? ' dt-h-far' : ''}`}>
      {showNum && n != null && <span className="dt-h-num">{String(n).padStart(2, '0')}</span>}
      <h2>{children}</h2>
      {style.heads === 'rule' && <span className="dt-h-bar" />}
    </div>
  )
}

function ProposalHead() {
  // Exactly what the template's header carries: the mark, and the two dates.
  return (
    <header className="dt-head">
      <Wordmark className="dt-logo" />
      <div className="dt-head-meta">
        <div>
          ISSUED <EDate path="issued" format={longDate} />
        </div>
        <div>
          VALID UNTIL <EDate path="validUntil" format={longDate} />
        </div>
      </div>
    </header>
  )
}

function PreparedBy({ className = '' }) {
  return (
    <div className={`dt-prepared ${className}`}>
      <div>
        Prepared by <E path="studio.lead" placeholder="Your name" />
        <br />
        <E path="studio.role" placeholder="Design Lead" /> @<E path="studio.name" placeholder="Studio" />
      </div>
      <div>
        <E path="studio.address" multiline placeholder="Studio address" />
      </div>
      <div>
        <E path="studio.phone" placeholder="Phone" />
        <br />
        <E path="studio.email" placeholder="Email" />
      </div>
    </div>
  )
}

function ProposalFoot() {
  return (
    <footer className="dt-foot">
      <PreparedBy />
    </footer>
  )
}

function Page({ children, className = '', head = true, foot = true, kind }) {
  return (
    <section className={`dt-page ${className}`}>
      {head && kind === 'proposal' && <ProposalHead />}
      {head && kind !== 'proposal' && (
        <header className="dt-head dt-head-simple">
          <span />
          <Wordmark />
        </header>
      )}
      <div className="dt-body">{children}</div>
      {foot && kind === 'proposal' && <ProposalFoot />}
      {foot && kind !== 'proposal' && foot}
    </section>
  )
}

/* -------------------------------------------------------------- the cover */

/** How much of the page a cover's title may span, by cover layout. */
function titleRoom(cover, pageWidth) {
  switch (cover) {
    case 'bleed':
      return pageWidth * 0.913 // the template's "Proposal" runs from x34 to x849 of 893
    case 'split':
      return pageWidth * 0.62 - 90
    case 'frame':
    case 'poster':
      return pageWidth - 150
    case 'masthead':
      return pageWidth - 140
    case 'grid':
      // Swiss-style restraint: small, precise type, not the page-filling
      // giant word stack every other archetype uses. dt-cover-grid also
      // forces this with !important, since a font that hasn't finished
      // loading yet would otherwise flash at the default huge size.
      return pageWidth * 0.34
    case 'sticker':
      // The title sits inside a rotated blob well short of the page edge —
      // the default room measures against the full page and overflows it.
      return pageWidth * 0.5
    default:
      return pageWidth - 80
  }
}

/**
 * Sizes a cover title so its widest word fills the room the layout gives it.
 * The template's title is set as large as the page allows, and every style
 * uses a different face with different widths, so the size can't be fixed:
 * it is measured from the face itself once it has loaded.
 */
function useFitTitle(words, style, room) {
  const [size, setSize] = useState(null)
  const { weight, italic } = coverFace(style)
  const key = words.join(' ')

  useEffect(() => {
    let cancelled = false
    ensureFont(style.display, { weights: [weight], italics: italic ? [weight] : [] }).then(() => {
      if (cancelled) return
      const ctx = document.createElement('canvas').getContext('2d')
      ctx.font = `${italic ? 'italic ' : ''}${weight} 100px "${style.display}"`
      // The titles are set with a slight negative tracking.
      const widest = Math.max(...key.split(' ').map((w) => ctx.measureText(w).width - w.length * 2))
      if (widest > 0) setSize(Math.min(230, Math.max(60, (room / widest) * 100)))
    })
    return () => {
      cancelled = true
    }
  }, [key, style.display, weight, italic, room])

  return size
}

function Cover({ title, bottom, kind }) {
  const { style, pageWidth } = useDocMeta()
  const words = String(title).split(/\s+/)
  const banded = style.cover === 'split' || style.cover === 'top'
  const { weight, italic } = coverFace(style)
  const fit = useFitTitle(words, style, titleRoom(style.cover, pageWidth))
  const titleStyle = {
    fontWeight: weight,
    fontStyle: italic ? 'italic' : 'normal',
    ...(fit ? { fontSize: `${fit}px` } : {}),
    // The template's title lines sit 173px apart on a 893px page.
    ...(style.cover === 'bleed' ? { lineHeight: `${Math.round(pageWidth * 0.1937)}px` } : {}),
  }

  return (
    <section className={`dt-page dt-cover dt-cover-${style.cover}`}>
      {banded && <div className="dt-cover-band"><Wordmark className="dt-cover-mark" /></div>}
      <div className="dt-cover-main">
        {/* The template's cover is the title and the studio's details, nothing
            else. Layouts with somewhere to put a mark still show one. */}
        {!banded && style.cover !== 'bleed' && <Wordmark className="dt-cover-mark" />}
        <div className="dt-cover-title-wrap">
          <h1 className={`dt-cover-title dt-cover-title-${words.length}`} style={titleStyle}>
            {words.map((w, i) => (
              <span key={i}>
                {w}
                {style.cover === 'minimal' && i === words.length - 1 && <em className="dt-dot">.</em>}
              </span>
            ))}
          </h1>
        </div>
        <div className="dt-cover-bottom">{bottom}</div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------ the proposal */

const PROPOSAL_SECTIONS = [
  { key: 'vision', label: 'Vision & Mission' },
  { key: 'about', label: 'Who are We?' },
  { key: 'staff', label: 'Our Staff' },
  { key: 'strategy', label: 'Our Work Strategy' },
  { key: 'caseStudy', label: 'Case Study' },
  { key: 'services', label: 'Services and Price' },
  { key: 'phases', label: 'Project Phases' },
  { key: 'offer', label: 'Our Offer' },
  { key: 'budget', label: 'Budget Breakdown' },
  { key: 'timeline', label: 'Project Timeline' },
]

export const PROPOSAL_PAGE_LABELS = PROPOSAL_SECTIONS

function chunk(list, size) {
  const out = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out.length ? out : [[]]
}

function Proposal() {
  const { doc } = useDoc()
  const { coverOnly } = useDocMeta()
  const show = doc.show || {}
  const included = PROPOSAL_SECTIONS.filter((s) => show[s.key] !== false)
  const num = (key) => included.findIndex((s) => s.key === key) + 1

  const cover = <Cover title={doc.title || 'Project Proposal'} bottom={<PreparedBy className="dt-prepared-cover" />} />
  if (coverOnly) return cover

  return (
    <>
      {cover}

      <Page kind="proposal">
        <h2 className="dt-contents-title">Contents</h2>
        <ol className="dt-contents">
          {included.map((s, i) => (
            <li key={s.key}>
              <b>Section #{i + 1}.</b> {s.label}
            </li>
          ))}
        </ol>
      </Page>

      {show.vision !== false && (
        <Page kind="proposal">
          <div className="dt-cols">
            <div>
              <Heading n={num('vision')}>Vision</Heading>
              <E as="p" path="vision.lead" multiline className="dt-lead" placeholder="Your vision in one line" />
              <E as="p" path="vision.body" multiline className="dt-p" placeholder="More about your vision" />
            </div>
            <div>
              <Heading>Mission</Heading>
              <E as="p" path="mission.lead" multiline className="dt-lead" placeholder="Your mission in one line" />
              <E as="p" path="mission.body" multiline className="dt-p" placeholder="More about your mission" />
            </div>
          </div>
          <div className="dt-block dt-block-band" />
          <div className="dt-values">
            <Heading>Values</Heading>
            <EList path="values" className="dt-dots" addLabel="Add value" placeholder="Value" />
          </div>
        </Page>
      )}

      {show.about !== false && (
        <Page kind="proposal">
          <div className="dt-who">
            <div className="dt-block dt-block-tall" />
            <div>
              <Heading n={num('about')}>Who are we?</Heading>
              <E as="p" path="about.body" multiline className="dt-p" placeholder="About the studio" />
            </div>
          </div>
          <Heading>What we do?</Heading>
          <E as="p" path="whatWeDo.body" multiline className="dt-p" placeholder="What the studio does" />
          <EList path="whatWeDo.items" className="dt-bars dt-bars-pin" addLabel="Add service" placeholder="Service" />
        </Page>
      )}

      {show.staff !== false && <StaffPages n={num('staff')} />}

      {show.strategy !== false && (
        <Page kind="proposal">
          <Heading n={num('strategy')}>Our Service Strategy</Heading>
          <div className="dt-block dt-block-banner" />
          <TitledList path="strategy" />
        </Page>
      )}

      {show.caseStudy !== false && (
        <Page kind="proposal">
          <div className="dt-indent">
            <Heading n={num('caseStudy')}>Case Study</Heading>
            <E as="p" path="caseStudy.summary" multiline className="dt-p" placeholder="Who the client was, and what they needed" />
            <div className="dt-block dt-block-case" />
            <div className="dt-table-head dt-table-accent">Company goals</div>
            <EList path="caseStudy.goals" className="dt-bars dt-bars-tight" addLabel="Add goal" placeholder="Goal" />
            <div className="dt-table-head dt-table-accent">Expected Results</div>
            <EList path="caseStudy.results" className="dt-bars dt-bars-tight" addLabel="Add result" placeholder="Result" />
          </div>
        </Page>
      )}

      {show.services !== false && <ServicesPage n={num('services')} />}
      {show.phases !== false && <PhasePages n={num('phases')} />}
      {show.offer !== false && <OfferPage n={num('offer')} />}
      {show.budget !== false && <BudgetPage n={num('budget')} />}
      {show.timeline !== false && <TimelinePage n={num('timeline')} />}
    </>
  )
}

function TitledList({ path }) {
  const { list, add, remove } = useListOps(path)
  return (
    <div className="dt-titled">
      {list.map((_, i) => (
        <p key={i} className="dt-p dt-row-edit">
          <E path={`${path}.${i}.title`} className="dt-accent-strong" placeholder="Step" />
          <span className="dt-accent-strong">: </span>
          <E path={`${path}.${i}.body`} placeholder="What happens in this step" />
          <RemoveBtn onClick={() => remove(i)} />
        </p>
      ))}
      <AddBtn onClick={() => add({ title: '', body: '' })}>Add step</AddBtn>
    </div>
  )
}

function StaffPages({ n }) {
  const { get } = useDoc()
  const { add, remove } = useListOps('staff.members')
  const members = get('staff.members') || []
  const pages = chunk(members.map((m, i) => i), 5)
  return pages.map((indexes, p) => (
    <Page kind="proposal" key={p}>
      {p === 0 && (
        <>
          <Heading n={n}>Our Staff</Heading>
          <p className="dt-p dt-staff-intro">
            {get('staff.lead') != null && (
              <>
                <E path="staff.lead" className="dt-accent-strong" placeholder="At your studio" />{' '}
              </>
            )}
            <E path="staff.intro" multiline placeholder="Introduce the team" />
          </p>
        </>
      )}
      <div className="dt-staff">
        {indexes.map((i) => {
          const m = members[i]
          const years = Number(m.years) || 0
          const initials = String(m.name || '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
          return (
            <div key={i} className="dt-member dt-row-edit">
              <div className="dt-avatar">{initials}</div>
              <div className="dt-member-main">
                <div className="dt-member-top">
                  <div>
                    <E as="strong" path={`staff.members.${i}.name`} placeholder="Name" />
                    <E as="span" path={`staff.members.${i}.role`} className="dt-member-role" placeholder="Role" />
                  </div>
                  <div className="dt-exp">
                    <span>
                      Experience - <E path={`staff.members.${i}.years`} placeholder="0" /> years
                    </span>
                    <span className="dt-exp-track">
                      <span className="dt-exp-fill" style={{ width: `${Math.min(100, (years / 8) * 100)}%` }} />
                    </span>
                  </div>
                </div>
                <E as="p" path={`staff.members.${i}.bio`} multiline className="dt-small" placeholder="A line or two about them" />
              </div>
              <RemoveBtn onClick={() => remove(i)} label="Remove member" />
            </div>
          )
        })}
      </div>
      {p === pages.length - 1 && <AddBtn onClick={() => add({ name: '', role: '', years: '', bio: '' })}>Add team member</AddBtn>}
    </Page>
  ))
}

function ServicesPage({ n }) {
  const { list, add, remove } = useListOps('services.rows')
  return (
    <Page kind="proposal" className="dt-pg-services">
      <Heading n={n}>Services & Prices</Heading>
      <div className="dt-cols2">
        <E as="p" path="services.intro" multiline className="dt-p" placeholder="A line about how you price" />
        <E as="p" path="services.intro2" multiline className="dt-p" placeholder="A second line" />
      </div>
      <div className="dt-table">
        <div className="dt-table-head dt-table-2">
          <span>Services</span>
          <span>Price</span>
        </div>
        {list.map((_, i) => (
          <div key={i} className="dt-table-row dt-table-2 dt-row-edit">
            <E path={`services.rows.${i}.name`} placeholder="Service" />
            <E path={`services.rows.${i}.price`} placeholder="On request" />
            <RemoveBtn onClick={() => remove(i)} />
          </div>
        ))}
      </div>
      <AddBtn onClick={() => add({ name: '', price: 'On request' })}>Add service</AddBtn>
      <div className="dt-note">
        <b>NOTE:</b> <E path="offer.note" multiline placeholder="Pricing note" />
      </div>
    </Page>
  )
}

function PhasePages({ n }) {
  const { get } = useDoc()
  const { add, remove } = useListOps('phases.items')
  const items = get('phases.items') || []
  const pages = chunk(items.map((_, i) => i), 3)
  return pages.map((indexes, p) => (
    <Page kind="proposal" key={p} className={p === 0 ? 'dt-pg-phases' : ''}>
      <div className="dt-indent-sm">
        {p === 0 && (
          <>
            <Heading n={n}>Project Phases</Heading>
            <E as="p" path="phases.intro" multiline className="dt-p" placeholder="Introduce the phases" />
          </>
        )}
        <div className="dt-phases">
          {indexes.map((i) => (
            <div key={i} className="dt-phase dt-row-edit">
              <span className="dt-phase-num">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <E as="strong" path={`phases.items.${i}.title`} placeholder="Phase" />
                <E as="p" path={`phases.items.${i}.body`} multiline className="dt-p" placeholder="What happens in this phase" />
              </div>
              <RemoveBtn onClick={() => remove(i)} />
            </div>
          ))}
        </div>
        {p === pages.length - 1 && <AddBtn onClick={() => add({ title: '', body: '' })}>Add phase</AddBtn>}
      </div>
      {p === pages.length - 1 && (
        <div className="dt-indent-sm dt-note-plain">
          <b>NOTE:</b> <E path="offer.note" multiline placeholder="Pricing note" />
        </div>
      )}
      {p === pages.length - 1 && (
        <div className="dt-steps">
          {items.map((it, i) => (
            <div key={i} className="dt-step">
              <b>Step {i + 1}</b>
              <span>{String(it.title || '').replace(/\s*phase$/i, '')}</span>
            </div>
          ))}
        </div>
      )}
    </Page>
  ))
}

function OfferPage({ n }) {
  const { get, set } = useDoc()
  const { list, add, remove } = useListOps('offer.packages')
  const cur = get('currency')
  return (
    <Page kind="proposal">
      <Heading n={n} far>Our Offer</Heading>
      <E as="p" path="offer.intro" multiline className="dt-p" placeholder="Thank them for the conversation" />
      <div className={`dt-offer dt-offer-${Math.min(4, Math.max(1, list.length))}`}>
        {list.map((p, i) => (
          <div key={i} className={p.featured ? 'dt-pack dt-pack-featured' : 'dt-pack'}>
            <div className="dt-pack-head">
              <E path={`offer.packages.${i}.name`} placeholder="Option" />
            </div>
            <div className="dt-pack-body">
              <EList path={`offer.packages.${i}.items`} className="dt-bullets" addLabel="Add line" placeholder="What's included" />
              <div className="dt-pack-foot">
                <E
                  as="strong"
                  path={`offer.packages.${i}.price`}
                  className="dt-pack-price"
                  placeholder="Price"
                  format={(v) => (String(v).trim() ? money(v, cur) : '')}
                  parse={parseMoney}
                />
                <span className="dt-pack-time">
                  TIMELINE: <E path={`offer.packages.${i}.timeline`} placeholder="2 weeks" />
                </span>
              </div>
              <EditOnly>
                <div className="dt-pack-tools dt-screen-only">
                  <button type="button" onClick={() => set(`offer.packages.${i}.featured`, !p.featured)}>
                    {p.featured ? 'Unhighlight' : 'Highlight'}
                  </button>
                  <button type="button" onClick={() => remove(i)}>Remove</button>
                </div>
              </EditOnly>
            </div>
          </div>
        ))}
      </div>
      {list.length < 4 && (
        <AddBtn onClick={() => add({ name: `Option ${list.length + 1}`, items: [], timeline: '', price: '', featured: false })}>
          Add option
        </AddBtn>
      )}
    </Page>
  )
}

function BudgetPage({ n }) {
  const { get, set } = useDoc()
  const cur = get('currency')
  const groups = get('budget.groups') || []
  const addGroup = () => set('budget.groups', [...groups, { name: 'Design', rows: [{ label: '', amount: '' }] }])
  return (
    <Page kind="proposal">
      <Heading n={n} far>Budget Breakdown</Heading>
      <E as="p" path="budget.intro" multiline className="dt-p" placeholder="Introduce the budget" />
      {groups.map((g, gi) => (
        <div key={gi} className="dt-table dt-table-budget dt-row-edit">
          <div className="dt-table-head dt-table-2">
            <E path={`budget.groups.${gi}.name`} placeholder="Group" />
            <span>Price</span>
          </div>
          {(g.rows || []).map((_, ri) => (
            <div key={ri} className="dt-table-row dt-table-2 dt-row-edit">
              <E path={`budget.groups.${gi}.rows.${ri}.label`} placeholder="Item" />
              <E
                path={`budget.groups.${gi}.rows.${ri}.amount`}
                placeholder="0"
                format={(v) => (String(v).trim() ? money(v, cur) : '')}
                parse={parseMoney}
              />
              <RemoveBtn onClick={() => set(`budget.groups.${gi}.rows`, g.rows.filter((__, x) => x !== ri))} />
            </div>
          ))}
          <AddBtn onClick={() => set(`budget.groups.${gi}.rows`, [...(g.rows || []), { label: '', amount: '' }])}>Add line</AddBtn>
          <RemoveBtn onClick={() => set('budget.groups', groups.filter((__, x) => x !== gi))} label="Remove group" />
        </div>
      ))}
      <AddBtn onClick={addGroup}>Add group</AddBtn>
    </Page>
  )
}

function TimelinePage({ n }) {
  const { list, add, remove } = useListOps('timeline.rows')
  const valid = list.filter((r) => r.start && r.end && !Number.isNaN(new Date(r.start)) && !Number.isNaN(new Date(r.end)))
  const min = valid.length ? Math.min(...valid.map((r) => new Date(r.start).getTime())) : Date.now()
  const max = valid.length ? Math.max(...valid.map((r) => new Date(r.end).getTime())) : Date.now() + 28 * 864e5
  const span = Math.max(864e5, max - min)
  const ticks = Array.from({ length: 6 }, (_, i) => new Date(min + (span * i) / 5))
  const pct = (t) => ((new Date(t).getTime() - min) / span) * 100
  const fmt = (d) => d.toLocaleDateString('en-GB').replace(/\//g, '-')

  return (
    <Page kind="proposal">
      <Heading n={n} far>Project Timeline</Heading>
      <E as="p" path="timeline.intro" multiline className="dt-p" placeholder="How to read the timeline" />
      <div className="dt-gantt">
        <div className="dt-gantt-row dt-gantt-dates">
          <b>Dates</b>
          <div className="dt-gantt-ticks">
            {ticks.map((t, i) => (
              <span key={i}>{fmt(t)}</span>
            ))}
          </div>
        </div>
        {list.map((r, i) => {
          const left = Math.max(0, Math.min(100, pct(r.start)))
          const width = Math.max(4, Math.min(100 - left, pct(r.end) - pct(r.start)))
          return (
            <div key={i} className="dt-gantt-row dt-row-edit">
              <E path={`timeline.rows.${i}.label`} className="dt-gantt-label" placeholder="Task" />
              <div className="dt-gantt-track">
                <span className={i % 2 ? 'dt-gantt-bar dt-gantt-bar-alt' : 'dt-gantt-bar'} style={{ left: `${left}%`, width: `${width}%` }}>
                  {r.label}
                </span>
              </div>
              <RemoveBtn onClick={() => remove(i)} />
            </div>
          )
        })}
      </div>
      <EditOnly>
        <div className="dt-gantt-edit dt-screen-only">
          {list.map((r, i) => (
            <div key={i} className="dt-gantt-edit-row">
              <span>{r.label || `Task ${i + 1}`}</span>
              <EDate path={`timeline.rows.${i}.start`} format={shortDate} />
              <span>to</span>
              <EDate path={`timeline.rows.${i}.end`} format={shortDate} />
            </div>
          ))}
        </div>
      </EditOnly>
      <AddBtn
        onClick={() => {
          const last = list[list.length - 1]
          const start = last?.end || new Date().toISOString().slice(0, 10)
          const end = new Date(new Date(start).getTime() + 7 * 864e5).toISOString().slice(0, 10)
          add({ label: 'New task', start, end })
        }}
      >
        Add task
      </AddBtn>
    </Page>
  )
}

/* ------------------------------------------- contracts and briefs (clauses) */

/**
 * Clause documents flow onto as many pages as they need, and a clause is never
 * split across a page break.
 *
 * The first layout packs clauses by a rough estimate of the lines their text
 * will take. Once drawn, every clause is measured for real and the pages are
 * packed again from those heights, so the result is right for whatever font
 * the style uses. Heights don't depend on which page a clause lands on, so the
 * second pass is final.
 */
function estimateClause(c) {
  const CH = 56
  const LINE = 25
  let h = 60
  for (const b of c.blocks || []) {
    if (b.sub) h += LINE + 4
    if (b.text) h += Math.max(1, Math.ceil(String(b.text).length / CH) + (String(b.text).match(/\n/g) || []).length) * LINE
    if (b.items) h += b.items.length * LINE + 10
    if (b.fields) h += b.fields.length * LINE + 6
    h += 14
  }
  return h
}

function paginate(heights, firstCapacity, capacity, tail = 0) {
  const pages = [[]]
  let used = 0
  let cap = firstCapacity
  heights.forEach((h, i) => {
    // The contract's first page already holds the parties, so it may end up
    // with no clause at all; any other page always takes at least one.
    const pageHasRoomForNothing = pages.length === 1 && firstCapacity < capacity
    if (used + h > cap && (pages[pages.length - 1].length || pageHasRoomForNothing)) {
      pages.push([])
      used = 0
      cap = capacity
    }
    pages[pages.length - 1].push(i)
    used += h
  })
  // Whatever closes the document (the signatures) needs room on the last page.
  if (tail && used + tail > cap) pages.push([])
  return pages
}

function ClauseBlocks({ ci }) {
  const { get, set } = useDoc()
  const blocks = get(`clauses.${ci}.blocks`) || []
  return blocks.map((b, bi) => {
    const base = `clauses.${ci}.blocks.${bi}`
    return (
      <div key={bi} className="dt-clause-block">
        {b.sub != null && <E as="h4" path={`${base}.sub`} className="dt-sub" placeholder="Subheading" />}
        {b.text != null && <E as="p" path={`${base}.text`} multiline className="dt-p" placeholder="Clause text" />}
        {b.items && <EList path={`${base}.items`} className="dt-accent-bullets" addLabel="Add line" />}
        {b.fields && (
          <div className="dt-fields">
            {b.fields.map((_, fi) => (
              <div key={fi} className="dt-field dt-row-edit">
                <E path={`${base}.fields.${fi}.0`} placeholder="Label" />:{' '}
                <E path={`${base}.fields.${fi}.1`} className="dt-accent-text" placeholder="Value" />
                <RemoveBtn onClick={() => set(`${base}.fields`, b.fields.filter((__, x) => x !== fi))} />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  })
}

function PartyBlock({ who, label }) {
  return (
    <div className="dt-party">
      <strong>{label}</strong>
      <div>Name: <E path={`parties.${who}.name`} className="dt-accent-text" placeholder="Name" /></div>
      <div>Address: <E path={`parties.${who}.address`} className="dt-accent-text" placeholder="Address" /></div>
      <div>Email: <E path={`parties.${who}.email`} className="dt-accent-text" placeholder="Email" /></div>
      <div>Phone: <E path={`parties.${who}.phone`} className="dt-accent-text" placeholder="Phone" /></div>
    </div>
  )
}

function ClauseDoc() {
  const { doc, set } = useDoc()
  const isContract = doc.kind === 'contract'
  const clauses = doc.clauses || []
  const rootRef = useRef(null)
  const [measured, setMeasured] = useState(null)

  // The contract's first page also carries the parties, and the last page the
  // signatures, so both leave less room for clauses.
  const heights = clauses.map((c, i) => measured?.heights[i] ?? estimateClause(c))
  const body = measured?.body ?? 900
  const first = isContract ? body - (measured?.parties ?? 380) : body
  const pages = paginate(heights, first, body, (measured?.tail ?? (isContract ? 330 : 40)))
  const offset = isContract ? 2 : 1

  useLayoutEffect(() => {
    const root = rootRef.current?.parentElement
    if (!root) return
    const cover = root.querySelector('.dt-cover')
    const page = root.querySelector('.dt-page:not(.dt-cover)')
    if (!cover || !page) return
    // Whatever zoom the stack is drawn at, a cover is exactly one A4 page tall.
    const f = cover.offsetHeight / 1123 || 1
    const px = (el) => (el ? el.offsetHeight / f : 0)
    const gap = 44
    const next = {
      body: 1123 - 66 - px(page.querySelector('.dt-head')) - 44 - px(page.querySelector('.dt-foot')) - 28 - 8,
      parties: px(root.querySelector('[data-parties]')) + gap,
      tail: px(root.querySelector('[data-tail]')) + (isContract ? gap : 10),
      heights: clauses.map((_, i) => px(root.querySelector(`[data-ci="${i}"]`)) + gap),
    }
    if (JSON.stringify(next) !== JSON.stringify(measured)) setMeasured(next)
  })
  const footLabel = `${doc.studio?.name || ''} ${isContract ? 'Contract' : 'Brief'}`.trim()

  const foot = (n) => (
    <footer className="dt-foot dt-foot-simple">
      <span>{footLabel}</span>
      <span>{n}</span>
    </footer>
  )

  const { coverOnly } = useDocMeta()
  return (
    <>
      <span ref={rootRef} hidden />
      <Cover
        title={doc.title || (isContract ? 'Design Services Contract' : 'Design Brief')}
        bottom={
          isContract ? (
            <div className="dt-cover-parties">
              <div>
                <div>Created by: <E path="parties.designer.name" placeholder="Your name" /></div>
                <div>Company: <E path="parties.designer.company" placeholder="Studio" /></div>
              </div>
              <div>
                <div>Created for: <E path="parties.client.name" placeholder="Client" /></div>
                <div>Company: <E path="parties.client.company" placeholder="Client company" /></div>
              </div>
            </div>
          ) : (
            <PreparedBy className="dt-prepared-cover" />
          )
        }
      />
      {!coverOnly && pages.map((indexes, p) => (
        <Page kind={doc.kind} key={p} foot={foot(p + 2)}>
          {p === 0 && isContract && (
            <div className="dt-clause" data-parties>
              <h3 className="dt-clause-h">1. Parties</h3>
              <div>
                <p className="dt-p">
                  This Design Services Contract is entered into on <EDate path="date" format={longDate} /> by and between:
                </p>
                <PartyBlock who="client" label="Client" />
                <p className="dt-p">Hereafter referred to as the “Client.”</p>
                <p className="dt-p">AND</p>
                <PartyBlock who="designer" label="Contractor" />
                <p className="dt-p">Hereafter referred to as the “Designer.”</p>
              </div>
            </div>
          )}
          {indexes.map((ci) => (
            <div key={ci} className="dt-clause dt-row-edit" data-ci={ci}>
              <h3 className="dt-clause-h">
                {ci + offset}. <E path={`clauses.${ci}.heading`} placeholder="Heading" />
              </h3>
              <div>
                <ClauseBlocks ci={ci} />
                <EditOnly>
                  <div className="dt-clause-tools dt-screen-only">
                    <button type="button" onClick={() => set(`clauses.${ci}.blocks`, [...(clauses[ci].blocks || []), { text: '' }])}>
                      + Paragraph
                    </button>
                    <button type="button" onClick={() => set(`clauses.${ci}.blocks`, [...(clauses[ci].blocks || []), { items: [''] }])}>
                      + List
                    </button>
                    <button type="button" onClick={() => set('clauses', clauses.filter((_, x) => x !== ci))}>Remove clause</button>
                  </div>
                </EditOnly>
              </div>
            </div>
          ))}
          {p === pages.length - 1 && (
            <div data-tail>
              <AddBtn onClick={() => set('clauses', [...clauses, { heading: 'New clause', blocks: [{ text: '' }] }])}>Add clause</AddBtn>
              {isContract && (
                <div className="dt-clause">
                  <h3 className="dt-clause-h">{clauses.length + offset}. Signatures</h3>
                  <div>
                    <E as="p" path="closing" multiline className="dt-p" />
                    <div className="dt-sign">
                      {['Client', 'Designer'].map((who) => (
                        <div key={who}>
                          <span>{who}’s Signature</span>
                          <i />
                          <span>Date</span>
                          <i />
                        </div>
                      ))}
                    </div>
                    <p className="dt-p">Please retain a copy of this contract for your records.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </Page>
      ))}
    </>
  )
}

/* ---------------------------------------------------------------- invoice */

function Invoice() {
  const { doc } = useDoc()
  const cur = doc.currency
  const { list, add, remove } = useListOps('lines')
  const t = invoiceTotals(doc)
  const m = (v) => money(v, cur)

  return (
    <section className="dt-page dt-invoice">
      <header className="dt-inv-head">
        <h1 className="dt-inv-title">INVOICE</h1>
        <Wordmark className="dt-inv-mark" />
      </header>
      <table className="dt-inv-meta">
        <tbody>
          <tr>
            <th>INVOICE NR:</th>
            <td><E path="number" placeholder="0001" /></td>
          </tr>
          <tr>
            <th>DATE:</th>
            <td><EDate path="date" format={shortDate} /></td>
          </tr>
          <tr>
            <th>DUE DATE:</th>
            <td><EDate path="due" format={shortDate} /></td>
          </tr>
          {doc.period && (
            <tr>
              <th>PERIOD:</th>
              <td><E path="period" /></td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="dt-inv-parties">
        <div className="dt-inv-box">
          <b>BILL TO:</b>
          <E as="div" path="billTo.name" placeholder="Client name" />
          <E as="div" path="billTo.company" placeholder="Company" />
          <E as="div" path="billTo.address" multiline placeholder="Address" />
          <E as="div" path="billTo.email" placeholder="Email" />
        </div>
        <div className="dt-inv-pay">
          <b>PAYABLE TO:</b>
          <E as="div" path="payableTo.name" placeholder="Studio" />
          <E as="div" path="payableTo.phone" placeholder="Phone" />
          <E as="div" path="payableTo.email" placeholder="Email" />
        </div>
      </div>

      <table className="dt-inv-lines">
        <thead>
          <tr>
            <th>NO.</th>
            <th>DESCRIPTION</th>
            <th><E path="unitLabel" /></th>
            <th>PRICE</th>
            <th>TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {list.map((l, i) => {
            const lineTotal = (Number(String(l.price).replace(/[^0-9.-]/g, '')) || 0) * (Number(l.quantity) || 0)
            return (
              <tr key={i} className="dt-row-edit">
                <td>{i + 1}.</td>
                <td><E path={`lines.${i}.description`} placeholder="Description" /></td>
                <td><E path={`lines.${i}.quantity`} placeholder="1" parse={(v) => v.replace(/[^0-9.]/g, '')} /></td>
                <td><E path={`lines.${i}.price`} placeholder="0" format={m} parse={parseMoney} /></td>
                <td>
                  {m(lineTotal)}
                  <RemoveBtn onClick={() => remove(i)} label="Remove line" />
                </td>
              </tr>
            )
          })}
          {Array.from({ length: Math.max(0, 2 - list.length + 1) }).map((_, i) => (
            <tr key={`blank-${i}`} className="dt-inv-blank">
              <td /><td /><td /><td /><td />
            </tr>
          ))}
        </tbody>
      </table>
      <AddBtn onClick={() => add({ description: '', quantity: '1', price: '' })}>Add line</AddBtn>

      <table className="dt-inv-totals">
        <tbody>
          <tr>
            <th>subtotal:</th>
            <td>{m(t.subtotal)}</td>
          </tr>
          <tr>
            <th>discount:</th>
            <td><E path="discount" parse={(v) => v.replace(/[^0-9.]/g, '')} placeholder="0" />%</td>
          </tr>
          <tr>
            <th>
              taxes (VAT <E path="taxRate" parse={(v) => v.replace(/[^0-9.]/g, '')} placeholder="0" />%):
            </th>
            <td>{m(t.taxes)}</td>
          </tr>
          <tr className="dt-inv-grand">
            <th>TOTAL AMOUNT:</th>
            <td>{m(t.total)}</td>
          </tr>
        </tbody>
      </table>
      <p className="dt-inv-words">{amountInWords(t.total, cur)} only.</p>

      <table className="dt-inv-bank">
        <tbody>
          <tr>
            <th>BANK NAME:</th>
            <td><E path="bank.bankName" placeholder="Bank" /></td>
          </tr>
          <tr>
            <th>ACCOUNT:</th>
            <td><E path="bank.accountNumber" placeholder="Account number" /></td>
          </tr>
          <tr>
            <th>ACCT NAME:</th>
            <td><E path="bank.accountName" placeholder="Account name" /></td>
          </tr>
        </tbody>
      </table>
    </section>
  )
}

/* ------------------------------------------------------------------ shell */

const MetaContext = createContext({ style: findStyle(), pageWidth: A4_WIDTH })
const useDocMeta = () => useContext(MetaContext)

/**
 * `mode` "full" draws every page; "cover" draws only the first page, for the
 * style thumbnails in the picker.
 */
export default function DocumentRenderer({ doc, onChange = () => {}, editable = false, mode = 'full', fit = true }) {
  const style = findStyle(doc.style)
  const pageWidth = pageWidthFor(doc.kind)
  const wrapRef = useRef(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    ensureFont(style.display, { weights: [400, 500, 600, 700] })
    if (style.body !== style.display) ensureFont(style.body, { weights: [400, 500, 600, 700], italics: [400] })
  }, [style.display, style.body])

  // Zoom the stack down to the column it sits in, rather than reflowing it.
  useLayoutEffect(() => {
    if (!fit || !wrapRef.current) return undefined
    const el = wrapRef.current
    // A zero width (not laid out yet) would mean zoom: 0, which browsers treat
    // as no zoom at all.
    const measure = () => el.clientWidth > 0 && setScale(Math.min(1, el.clientWidth / pageWidth))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [fit, pageWidth])

  const body =
    doc.kind === 'proposal' ? <Proposal /> : doc.kind === 'invoice' ? <Invoice /> : <ClauseDoc />

  return (
    <div ref={wrapRef} className="dt-wrap">
      <MetaContext.Provider value={{ style, pageWidth, coverOnly: mode === 'cover' }}>
        <DocProvider doc={doc} onChange={onChange} editable={editable}>
          <div
            className={`dt-doc dt-style-${style.id} dt-heads-${style.heads} dt-genre-${style.cover} ${doc.kind === 'proposal' ? 'dt-prop' : ''} ${mode === 'cover' ? 'dt-only-cover' : ''} ${style.id === 'branded' ? 'dt-headfont-body' : ''}`}
            style={{ ...styleVars(style, doc.accent), zoom: scale }}
          >
            {body}
          </div>
        </DocProvider>
      </MetaContext.Provider>
    </div>
  )
}
