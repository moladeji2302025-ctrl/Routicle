import { useEffect, useMemo, useRef, useState } from 'react'
import { buildMark, BG_SHAPES, DEFAULTS } from '../lib/markEditor'
import { svgToRaster, downloadBlob } from '../lib/logoPack'

/* ---------------------------------------------------------------- controls */

const FLIPS = [
  { id: 'flipH', label: 'Mirror horizontally', d: 'M12 3v18M7 7l-4 5 4 5M17 7l4 5-4 5' },
  { id: 'flipV', label: 'Mirror vertically', d: 'M3 12h18M7 7l5-4 5 4M7 17l5 4 5-4' },
]

const ROTATIONS = [
  { deg: -90, label: 'Rotate left 90°', d: 'M4 9h10a5 5 0 0 1 0 10H9M4 9l4-4M4 9l4 4' },
  { deg: 90, label: 'Rotate right 90°', d: 'M20 9H10a5 5 0 0 0 0 10h5M20 9l-4-4M20 9l-4 4' },
  { deg: 180, label: 'Turn upside down', d: 'M7 4.5a8 8 0 1 1-3 6.2M7 4.5H3.2M7 4.5V8.3M15 11l-3 3-3-3' },
]

const DIAGONALS = [
  { skew: 0, label: 'Upright', d: 'M12 20V5M12 5l-4 4M12 5l4 4' },
  { skew: -14, label: 'Lean right', d: 'M7 20L17 5M17 5l-5 1M17 5l1 5' },
  { skew: 14, label: 'Lean left', d: 'M17 20L7 5M7 5l5 1M7 5L6 10' },
]

const SURFACES = [
  { id: 'grid', label: 'Grid' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
]

const EXPORTS = [
  { id: 'svg', label: 'SVG', hint: 'Vector, infinitely scalable' },
  { id: 'png1', label: 'PNG 1×', hint: 'At the size you set' },
  { id: 'png2', label: 'PNG 2×', hint: 'Retina' },
  { id: 'png3', label: 'PNG 3×', hint: 'Print-safe raster' },
]

function Glyph({ d, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

/** A slider with its value shown as a chip, so the number is never a guess. */
function Slider({ label, value, min, max, step = 1, suffix = '', onChange }) {
  return (
    <div className="me-row">
      <span className="me-row-label">{label}</span>
      <input
        type="range"
        className="me-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <output className="me-chip">
        {value}
        {suffix}
      </output>
    </div>
  )
}

function ColorRow({ label, value, onChange }) {
  return (
    <div className="me-row">
      <span className="me-row-label">{label}</span>
      <label className="me-color">
        <span className="me-color-dot" style={{ background: value }}>
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
        </span>
        <input
          type="text"
          className="me-color-hex"
          value={value.toUpperCase()}
          onChange={(e) => {
            const v = e.target.value.trim()
            // Only commit a complete hex, so typing doesn't reset the preview
            // to black on the way to a valid value.
            if (/^#[0-9a-f]{6}$/i.test(v)) onChange(v)
          }}
          spellCheck="false"
        />
      </label>
    </div>
  )
}

function shapeGlyph(id) {
  switch (id) {
    case 'square':
      return <rect x="4" y="4" width="16" height="16" rx="4" />
    case 'squircle':
      return <path d="M12 4c6 0 8 2 8 8s-2 8-8 8-8-2-8-8 2-8 8-8Z" />
    case 'circle':
      return <circle cx="12" cy="12" r="8" />
    case 'hexagon':
      return <polygon points="12,3.5 19.4,7.8 19.4,16.2 12,20.5 4.6,16.2 4.6,7.8" />
    case 'shield':
      return <path d="M12 3.5 20 6.4v5.6c0 4-3.3 6.6-8 8.5-4.7-1.9-8-4.5-8-8.5V6.4Z" />
    default:
      return <rect x="4" y="4" width="16" height="16" rx="3" strokeDasharray="3 3" />
  }
}

/* ------------------------------------------------------------------ editor */

export default function MarkEditor({ trace, name = 'mark', onClose }) {
  const [o, setO] = useState(DEFAULTS)
  const [surface, setSurface] = useState('grid')
  const [copied, setCopied] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [busy, setBusy] = useState('')
  const exportRef = useRef(null)

  const set = (patch) => setO((prev) => ({ ...prev, ...patch }))

  const svg = useMemo(() => buildMark(trace, o), [trace, o])

  // Close the export menu on an outside click or Escape, the way a menu should.
  useEffect(() => {
    if (!exportOpen) return
    function onDown(e) {
      if (!exportRef.current?.contains(e.target)) setExportOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setExportOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [exportOpen])

  async function copySvg() {
    try {
      await navigator.clipboard.writeText(svg)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard blocked (no permission, or an insecure origin) — fall back to
      // handing over the file rather than failing silently.
      downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), `${name}.svg`)
    }
  }

  async function doExport(kind) {
    setExportOpen(false)
    if (kind === 'svg') {
      downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), `${name}.svg`)
      return
    }
    const scale = Number(kind.replace('png', '')) || 1
    setBusy(kind)
    try {
      const blob = await svgToRaster(svg, { type: 'image/png', scale })
      downloadBlob(blob, `${name}@${scale}x.png`)
    } finally {
      setBusy('')
    }
  }

  const dirty = JSON.stringify(o) !== JSON.stringify(DEFAULTS)

  return (
    <section className="me">
      <header className="me-head">
        <div>
          <h3>Mark editor</h3>
          <p>What you see here is what you'll export.</p>
        </div>
        <div className="me-head-actions">
          {dirty && (
            <button type="button" className="me-reset" onClick={() => setO(DEFAULTS)}>
              Reset
            </button>
          )}
          {onClose && (
            <button type="button" className="me-close" onClick={onClose} aria-label="Close the editor">
              <Glyph d="M18 6 6 18M6 6l12 12" size={15} />
            </button>
          )}
        </div>
      </header>

      <div className="me-body">
        {/* ------------------------------------------------------ preview */}
        <div className="me-stage-col">
          <div className={`me-stage me-stage-${surface}`}>
            <div className="me-art" dangerouslySetInnerHTML={{ __html: svg }} />
          </div>

          <div className="me-stage-bar">
            <div className="me-seg" role="tablist" aria-label="Preview surface">
              {SURFACES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={surface === s.id}
                  className={surface === s.id ? 'me-seg-btn me-seg-btn-on' : 'me-seg-btn'}
                  onClick={() => setSurface(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <span className="me-dims">
              {Math.round(o.size + o.size * (o.padding / 100) * 2)}
              <em>px square</em>
            </span>
          </div>
        </div>

        {/* ------------------------------------------------------ controls */}
        <div className="me-controls">
          <div className="me-group">
            <p className="me-group-title">Geometry</p>
            <Slider label="Icon size" value={o.size} min={48} max={512} step={4} suffix="px" onChange={(v) => set({ size: v })} />
            <Slider label="Padding" value={o.padding} min={0} max={40} suffix="%" onChange={(v) => set({ padding: v })} />
            <Slider label="Thickness" value={o.thickness} min={0} max={30} suffix="%" onChange={(v) => set({ thickness: v })} />
          </div>

          <div className="me-group">
            <p className="me-group-title">Orientation</p>

            <div className="me-row">
              <span className="me-row-label">Mirror</span>
              <div className="me-btns">
                {FLIPS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={o[f.id] ? 'me-icon-btn me-icon-btn-on' : 'me-icon-btn'}
                    onClick={() => set({ [f.id]: !o[f.id] })}
                    title={f.label}
                    aria-label={f.label}
                    aria-pressed={o[f.id]}
                  >
                    <Glyph d={f.d} />
                  </button>
                ))}
              </div>
            </div>

            <div className="me-row">
              <span className="me-row-label">Rotation</span>
              <div className="me-btns">
                {ROTATIONS.map((r) => (
                  <button
                    key={r.deg}
                    type="button"
                    className="me-icon-btn"
                    onClick={() => set({ rotation: (((o.rotation + r.deg) % 360) + 360) % 360 })}
                    title={r.label}
                    aria-label={r.label}
                  >
                    <Glyph d={r.d} />
                  </button>
                ))}
                <output className="me-chip">{o.rotation}°</output>
              </div>
            </div>

            <Slider label="Fine angle" value={o.rotation} min={0} max={359} suffix="°" onChange={(v) => set({ rotation: v })} />

            <div className="me-row">
              <span className="me-row-label">Lean</span>
              <div className="me-btns">
                {DIAGONALS.map((d) => (
                  <button
                    key={d.label}
                    type="button"
                    className={o.skew === d.skew ? 'me-icon-btn me-icon-btn-on' : 'me-icon-btn'}
                    onClick={() => set({ skew: d.skew })}
                    title={d.label}
                    aria-label={d.label}
                    aria-pressed={o.skew === d.skew}
                  >
                    <Glyph d={d.d} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="me-group">
            <p className="me-group-title">Colour</p>
            <ColorRow label="Fill" value={o.fill} onChange={(v) => set({ fill: v })} />
            <ColorRow label="Outline" value={o.line} onChange={(v) => set({ line: v })} />
            <Slider label="Outline width" value={o.traceWidth} min={0} max={24} suffix="%" onChange={(v) => set({ traceWidth: v })} />
          </div>

          <div className="me-group">
            <p className="me-group-title">Backing shape</p>
            <div className="me-shapes">
              {BG_SHAPES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={o.bgShape === s.id ? 'me-shape me-shape-on' : 'me-shape'}
                  onClick={() => set({ bgShape: s.id })}
                  title={s.label}
                  aria-label={s.label}
                  aria-pressed={o.bgShape === s.id}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
                    {shapeGlyph(s.id)}
                  </svg>
                </button>
              ))}
            </div>
            {o.bgShape !== 'none' && <ColorRow label="Shape fill" value={o.bgColor} onChange={(v) => set({ bgColor: v })} />}
          </div>
        </div>
      </div>

      <footer className="me-foot">
        <button type="button" className="me-copy" onClick={copySvg}>
          <Glyph d="M9 9V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-4M3 11a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" size={15} />
          {copied ? 'Copied' : 'Copy SVG'}
        </button>

        <div className="me-export-wrap" ref={exportRef}>
          <button type="button" className="me-export" onClick={() => doExport('svg')} disabled={!!busy}>
            <Glyph d="M12 3v12M8 11l4 4 4-4M4 20h16" size={15} />
            {busy ? 'Exporting…' : 'Export SVG'}
          </button>
          <button
            type="button"
            className="me-export-more"
            onClick={() => setExportOpen((v) => !v)}
            aria-label="Other formats"
            aria-expanded={exportOpen}
          >
            <Glyph d="M6 15l6-6 6 6" size={14} />
          </button>

          {exportOpen && (
            <div className="me-export-menu" role="menu">
              {EXPORTS.map((e) => (
                <button key={e.id} type="button" role="menuitem" onClick={() => doExport(e.id)}>
                  <strong>{e.label}</strong>
                  <span>{e.hint}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </footer>
    </section>
  )
}
