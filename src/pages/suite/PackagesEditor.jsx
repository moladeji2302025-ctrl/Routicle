import { useState } from 'react'

/**
 * Packages and invoice lines live on the project rather than inside a generated
 * document, because both the proposal and the contract need the same figures:
 * the proposal lists the options, and the contract quotes whichever one the
 * client accepted. Editing them in one place stops those two drifting apart.
 */
const EMPTY_PACKAGE = { name: '', items: [], timeline: '', price: '', selected: false }
const EMPTY_LINE = { description: '', quantity: 1, price: '' }

const toLines = (v) => v.split('\n').map((s) => s.trim()).filter(Boolean)

export default function PackagesEditor({ packages, lines, currency, onChange, saving }) {
  const [local, setLocal] = useState({ packages: packages || [], lines: lines || [] })
  const [dirty, setDirty] = useState(false)

  function update(next) {
    setLocal(next)
    setDirty(true)
  }

  const setPackage = (i, patch) =>
    update({ ...local, packages: local.packages.map((p, x) => (x === i ? { ...p, ...patch } : p)) })

  const setLine = (i, patch) =>
    update({ ...local, lines: local.lines.map((l, x) => (x === i ? { ...l, ...patch } : l)) })

  const total = local.lines.reduce((sum, l) => sum + (Number(l.price) || 0) * (Number(l.quantity) || 1), 0)

  return (
    <div className="suite-packages">
      <section>
        <div className="suite-section-head">
          <div>
            <h3>Proposal options</h3>
            <p className="settings-section-desc">
              The packages the client chooses between. Mark one accepted and the contract quotes its figure.
            </p>
          </div>
          <button
            type="button"
            className="settings-btn"
            onClick={() => update({ ...local, packages: [...local.packages, { ...EMPTY_PACKAGE }] })}
          >
            Add option
          </button>
        </div>

        {local.packages.length === 0 ? (
          <p className="explore-empty">No options yet — the proposal will say so until you add one.</p>
        ) : (
          local.packages.map((p, i) => (
            <div key={i} className="suite-package">
              <div className="admin-form-row">
                <label className="settings-stack-field">
                  <span className="settings-stack-label">Option name</span>
                  <input className="settings-input" value={p.name} onChange={(e) => setPackage(i, { name: e.target.value })} />
                </label>
                <label className="settings-stack-field">
                  <span className="settings-stack-label">Timeline</span>
                  <input className="settings-input" value={p.timeline} placeholder="4 weeks" onChange={(e) => setPackage(i, { timeline: e.target.value })} />
                </label>
                <label className="settings-stack-field">
                  <span className="settings-stack-label">Price ({currency})</span>
                  <input type="number" className="settings-input" value={p.price} onChange={(e) => setPackage(i, { price: e.target.value })} />
                </label>
              </div>
              <label className="settings-stack-field">
                <span className="settings-stack-label">What it includes</span>
                <span className="settings-stack-hint">One per line.</span>
                <textarea
                  className="settings-textarea"
                  rows={3}
                  value={(p.items || []).join('\n')}
                  onChange={(e) => setPackage(i, { items: toLines(e.target.value) })}
                />
              </label>
              <div className="settings-inline-actions">
                <label className="explore-checkbox">
                  <input
                    type="checkbox"
                    checked={!!p.selected}
                    onChange={(e) =>
                      // Only one option can be the accepted one, so selecting
                      // here clears the others rather than allowing two.
                      update({
                        ...local,
                        packages: local.packages.map((x, xi) => ({ ...x, selected: xi === i ? e.target.checked : false })),
                      })
                    }
                  />
                  Client accepted this option
                </label>
                <button
                  type="button"
                  className="settings-btn settings-btn-danger"
                  onClick={() => update({ ...local, packages: local.packages.filter((_, x) => x !== i) })}
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      <section>
        <div className="suite-section-head">
          <div>
            <h3>Invoice lines</h3>
            <p className="settings-section-desc">What an invoice bills for. Totals are worked out for you.</p>
          </div>
          <button type="button" className="settings-btn" onClick={() => update({ ...local, lines: [...local.lines, { ...EMPTY_LINE }] })}>
            Add line
          </button>
        </div>

        {local.lines.length === 0 ? (
          <p className="explore-empty">No lines yet.</p>
        ) : (
          <>
            {local.lines.map((l, i) => (
              <div key={i} className="suite-line">
                <input
                  className="settings-input"
                  placeholder="Description"
                  value={l.description}
                  onChange={(e) => setLine(i, { description: e.target.value })}
                />
                <input
                  type="number"
                  className="settings-input"
                  style={{ maxWidth: 80 }}
                  value={l.quantity}
                  onChange={(e) => setLine(i, { quantity: e.target.value })}
                />
                <input
                  type="number"
                  className="settings-input"
                  style={{ maxWidth: 140 }}
                  placeholder="Price"
                  value={l.price}
                  onChange={(e) => setLine(i, { price: e.target.value })}
                />
                <button
                  type="button"
                  className="settings-btn settings-btn-ghost"
                  onClick={() => update({ ...local, lines: local.lines.filter((_, x) => x !== i) })}
                >
                  ×
                </button>
              </div>
            ))}
            <p className="suite-line-total">
              Total <strong>{total.toLocaleString('en-US', { maximumFractionDigits: 2 })}</strong> {currency}
            </p>
          </>
        )}
      </section>

      <div className="settings-actions">
        <button
          type="button"
          className="settings-btn settings-btn-primary"
          disabled={!dirty || saving}
          onClick={() => {
            onChange(local)
            setDirty(false)
          }}
        >
          {saving ? 'Saving…' : dirty ? 'Save figures' : 'Saved'}
        </button>
      </div>
    </div>
  )
}
