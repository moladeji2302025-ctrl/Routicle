import { useId } from 'react'

/** A titled block of related settings. */
export function Section({ title, description, children, actions }) {
  return (
    <section className="settings-section">
      <div className="settings-section-head">
        <div>
          <h2>{title}</h2>
          {description && <p className="settings-section-desc">{description}</p>}
        </div>
        {actions}
      </div>
      <div className="settings-card">{children}</div>
    </section>
  )
}

/** One labelled setting: text on the left, its control on the right. */
export function Row({ title, description, children, stacked = false }) {
  return (
    <div className={stacked ? 'settings-row settings-row-stacked' : 'settings-row'}>
      <div className="settings-row-text">
        <span className="settings-row-title">{title}</span>
        {description && <span className="settings-row-desc">{description}</span>}
      </div>
      <div className="settings-row-control">{children}</div>
    </div>
  )
}

export function Toggle({ checked, onChange, label, disabled = false }) {
  return (
    <label className={disabled ? 'settings-toggle settings-toggle-disabled' : 'settings-toggle'}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
      />
      <span className="settings-toggle-track" aria-hidden="true">
        <span className="settings-toggle-thumb" />
      </span>
    </label>
  )
}

export function Segmented({ options, value, onChange, name }) {
  return (
    <div className="settings-seg" role="radiogroup" aria-label={name}>
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="radio"
          aria-checked={value === opt.id}
          className={value === opt.id ? 'settings-seg-btn settings-seg-btn-active' : 'settings-seg-btn'}
          onClick={() => onChange(opt.id)}
          title={opt.desc}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function Field({ label, hint, children }) {
  const id = useId()
  return (
    <div className="settings-field">
      <label htmlFor={id}>{label}</label>
      {typeof children === 'function' ? children(id) : children}
      {hint && <span className="settings-field-hint">{hint}</span>}
    </div>
  )
}

export function Chips({ options, selected, onToggle, emptyLabel }) {
  return (
    <div className="settings-chip-grid">
      {options.length === 0 && <span className="settings-row-desc">{emptyLabel}</span>}
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          aria-pressed={selected.includes(opt.id)}
          className={selected.includes(opt.id) ? 'settings-chip settings-chip-active' : 'settings-chip'}
          onClick={() => onToggle(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

/** Irreversible actions, visually separated so they can't be hit by accident. */
export function DangerZone({ title, description, children }) {
  return (
    <section className="settings-section">
      <div className="settings-section-head">
        <div>
          <h2 className="settings-danger-title">{title}</h2>
          {description && <p className="settings-section-desc">{description}</p>}
        </div>
      </div>
      <div className="settings-card settings-card-danger">{children}</div>
    </section>
  )
}

export function Feedback({ error, notice }) {
  if (!error && !notice) return null
  return <p className={error ? 'settings-error' : 'settings-notice'}>{error || notice}</p>
}
