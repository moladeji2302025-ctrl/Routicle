import { useRef, useState } from 'react'
import { PALETTE_PRESETS, isDark } from '../lib/logoPack'
import { theoryPalette, THEORY_SCHEMES, extractPaletteFromImage, wcagLevels } from '../lib/colorTools'

const TABS = [
  { id: 'presets', label: 'Presets' },
  { id: 'theory', label: 'From a colour' },
  { id: 'photo', label: 'From a photo' },
]

/**
 * Every way the Creative Suite can arrive at a four-colour palette:
 * a preset, one seed colour run through real colour theory, or the
 * dominant tones pulled out of a reference photo. All three hand back
 * the same [ink, accent, soft, paper] shape the rest of the suite expects,
 * so `onChange` never has to know which tab produced it.
 */
export default function PaletteLab({ palette, onChange }) {
  const [tab, setTab] = useState('presets')
  const [seed, setSeed] = useState(palette[1] || '#6750de')
  const [scheme, setScheme] = useState('complementary')
  const [extracting, setExtracting] = useState(false)
  const [extracted, setExtracted] = useState(null)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const preview = tab === 'theory' ? theoryPalette(seed, scheme) : null

  async function onPhoto(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setExtracting(true)
    setError('')
    setExtracted(null)
    try {
      setExtracted(await extractPaletteFromImage(file))
    } catch (err) {
      setError(err.message)
    } finally {
      setExtracting(false)
    }
  }

  const inkOnPaper = wcagLevels(palette[0], palette[palette.length - 1])
  const accentOnPaper = wcagLevels(palette[1], palette[palette.length - 1])

  return (
    <div className="pl">
      <div className="pl-tabs" role="tablist" aria-label="Palette source">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'pl-tab pl-tab-on' : 'pl-tab'} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'presets' && (
        <div className="cs-palettes">
          {PALETTE_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={palette === p.colors ? 'cs-palette cs-palette-on' : 'cs-palette'}
              onClick={() => onChange(p.colors)}
              title={p.label}
            >
              {p.colors.map((c) => (
                <span key={c} style={{ background: c }} />
              ))}
            </button>
          ))}
        </div>
      )}

      {tab === 'theory' && (
        <div className="pl-theory">
          <div className="pl-theory-row">
            <label className="pl-seed">
              <input type="color" value={seed} onChange={(e) => setSeed(e.target.value)} />
              <span>{seed.toUpperCase()}</span>
            </label>
            <select className="adm-select" value={scheme} onChange={(e) => setScheme(e.target.value)}>
              {THEORY_SCHEMES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
          <p className="pl-hint">{THEORY_SCHEMES.find((s) => s.id === scheme)?.blurb}</p>
          {preview && (
            <>
              <div className="pl-preview">
                {preview.map((c, i) => (
                  <span key={i} style={{ background: c }} title={c} />
                ))}
              </div>
              <button type="button" className="settings-btn" onClick={() => onChange(preview)}>Use this palette</button>
            </>
          )}
        </div>
      )}

      {tab === 'photo' && (
        <div className="pl-photo">
          <button type="button" className="settings-btn settings-btn-ghost" onClick={() => fileRef.current?.click()} disabled={extracting}>
            {extracting ? 'Reading colours…' : 'Choose a photo…'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhoto} />
          <p className="pl-hint">Pulls the dominant tones out of any image — a product shot, a mood board, a texture.</p>
          {error && <p className="settings-error">{error}</p>}
          {extracted && (
            <>
              <div className="pl-preview">
                {extracted.map((c, i) => (
                  <span key={i} style={{ background: c }} title={c} />
                ))}
              </div>
              <button type="button" className="settings-btn" onClick={() => onChange(extracted)}>Use this palette</button>
            </>
          )}
        </div>
      )}

      <div className="cs-swatches">
        {palette.map((c, i) => (
          <label key={i} className="cs-swatch" style={{ background: c, color: isDark(c) ? '#fff' : '#16161a' }}>
            {c.toUpperCase()}
            <input type="color" value={c} onChange={(e) => onChange(palette.map((x, xi) => (xi === i ? e.target.value : x)))} />
          </label>
        ))}
      </div>

      <div className="pl-contrast">
        <span className="pl-contrast-label">Contrast on paper</span>
        <span className={inkOnPaper.normal ? 'pl-contrast-pass' : 'pl-contrast-fail'}>
          Ink text: {inkOnPaper.ratio.toFixed(1)}:1 {inkOnPaper.normal ? `— passes WCAG ${inkOnPaper.normal}` : '— fails WCAG AA'}
        </span>
        <span className={accentOnPaper.normal || accentOnPaper.large ? 'pl-contrast-pass' : 'pl-contrast-fail'}>
          Accent text: {accentOnPaper.ratio.toFixed(1)}:1{' '}
          {accentOnPaper.normal
            ? `— passes WCAG ${accentOnPaper.normal}`
            : accentOnPaper.large
              ? '— large text only (WCAG AA)'
              : '— fails WCAG, avoid for text'}
        </span>
      </div>
    </div>
  )
}
