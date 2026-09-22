import { useRef, useState } from 'react'
import { vectorize } from '../../lib/vectorize'
import { buildLogoPack, svgToRaster, downloadBlob, PALETTE_PRESETS } from '../../lib/logoPack'
import { PenIcon, UploadIcon } from '../../components/icons'
import FontPicker from '../../components/FontPicker'
import MarkEditor from '../../components/MarkEditor'
import PaletteLab from '../../components/PaletteLab'
import BrandGuide from '../../components/BrandGuide'
import StationeryKit from '../../components/StationeryKit'
import FeaturedTemplates from './FeaturedTemplates'

const FORMATS = [
  { ext: 'svg', label: 'SVG', type: null },
  { ext: 'png', label: 'PNG', type: 'image/png' },
  { ext: 'jpg', label: 'JPEG', type: 'image/jpeg' },
]

const slug = (s) => (s || 'brand').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

export default function CreativeSuitePage() {
  const fileRef = useRef(null)
  const [showGuide, setShowGuide] = useState(false)
  const [showStationery, setShowStationery] = useState(false)
  const [contact, setContact] = useState({ person: '', title: '', phone: '', email: '', website: '', address: '' })
  const [preview, setPreview] = useState('')
  const [trace, setTrace] = useState(null)
  const [tracing, setTracing] = useState(false)
  const [error, setError] = useState('')

  const [threshold, setThreshold] = useState(null) // null = choose automatically
  const [invert, setInvert] = useState(false)
  const [detail, setDetail] = useState(1.2)

  const [name, setName] = useState('')
  const [tagline, setTagline] = useState('')
  const [palette, setPalette] = useState(PALETTE_PRESETS[0].colors)
  const [font, setFont] = useState('Inter')
  const [lastFile, setLastFile] = useState(null)

  async function run(file, opts = {}) {
    setTracing(true)
    setError('')
    try {
      const result = await vectorize(file, {
        threshold: opts.threshold !== undefined ? opts.threshold : threshold,
        invert: opts.invert !== undefined ? opts.invert : invert,
        detail: opts.detail !== undefined ? opts.detail : detail,
      })
      if (!result.pathData) {
        setError('Nothing was traced. The image may be too low in contrast, so try inverting it or adjusting the threshold.')
        setTrace(null)
      } else {
        setTrace(result)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setTracing(false)
    }
  }

  async function onFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Pick an image file, like a photo of a sketch, a PNG or a JPEG.')
      return
    }
    setLastFile(file)
    setPreview(URL.createObjectURL(file))
    if (!name) setName(file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '))
    await run(file)
  }

  // Re-tracing uses the original file, so adjustments never compound on an
  // already-thresholded result.
  const retrace = (opts) => lastFile && run(lastFile, opts)

  const pack = trace ? buildLogoPack({ trace, name, tagline, palette, font }) : []

  async function download(asset, format) {
    try {
      if (format.ext === 'svg') {
        downloadBlob(new Blob([asset.svg], { type: 'image/svg+xml' }), `${slug(name)}-${asset.id}.svg`)
        return
      }
      const blob = await svgToRaster(asset.svg, {
        type: format.type,
        scale: 3,
        background: format.type === 'image/jpeg' ? palette[palette.length - 1] : null,
      })
      downloadBlob(blob, `${slug(name)}-${asset.id}.${format.ext}`)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <>
      <div className="suite-section-head">
        <div>
          <h2>Creative Suite</h2>
          <p className="settings-section-desc">
            Upload a sketch or a flat logo image. We'll turn it into vectors, then build a full pack with primary, secondary
            and tertiary lockups, the mark, the wordmark and the palette — and drop the result into a featured template to
            present it.
          </p>
        </div>
      </div>

      {error && <p className="settings-error">{error}</p>}

      <div className="cs-grid">
        {/* ------------------------------------------------ input column */}
        <div className="cs-panel">
          <h3>1. Your mark</h3>
          <button type="button" className="cs-drop" onClick={() => fileRef.current?.click()}>
            {preview ? (
              <img src={preview} alt="" className="cs-preview" />
            ) : (
              <>
                <UploadIcon size={22} color="currentColor" />
                <strong>Upload a logo or sketch</strong>
                <span>A photo of a drawing, or a PSD export. High contrast traces best.</span>
              </>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />

          {lastFile && (
            <div className="cs-controls">
              <label className="settings-stack-field">
                <span className="settings-stack-label">
                  Threshold {threshold == null ? '(automatic)' : threshold}
                </span>
                <input
                  type="range"
                  min="20"
                  max="235"
                  value={threshold ?? trace?.threshold ?? 128}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    setThreshold(v)
                    retrace({ threshold: v })
                  }}
                />
              </label>
              <label className="settings-stack-field">
                <span className="settings-stack-label">Detail {detail.toFixed(1)}</span>
                <input
                  type="range"
                  min="0.4"
                  max="4"
                  step="0.2"
                  value={detail}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    setDetail(v)
                    retrace({ detail: v })
                  }}
                />
              </label>
              <div className="settings-inline-actions">
                <button
                  type="button"
                  className="settings-btn"
                  onClick={() => {
                    setInvert((v) => !v)
                    retrace({ invert: !invert })
                  }}
                >
                  {invert ? 'Trace dark shapes' : 'Invert'}
                </button>
                <button
                  type="button"
                  className="settings-btn settings-btn-ghost"
                  onClick={() => {
                    setThreshold(null)
                    retrace({ threshold: null })
                  }}
                >
                  Auto threshold
                </button>
              </div>
              {trace && (
                <p className="settings-stack-hint">
                  {trace.contourCount} shape{trace.contourCount === 1 ? '' : 's'} traced at {trace.width}×{trace.height}.
                </p>
              )}
            </div>
          )}
        </div>

        {/* ----------------------------------------------- brand column */}
        <div className="cs-panel">
          <h3>2. Brand details</h3>
          <label className="settings-stack-field">
            <span className="settings-stack-label">Brand name</span>
            <input className="settings-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your Brand" />
          </label>
          <label className="settings-stack-field">
            <span className="settings-stack-label">Tagline (optional)</span>
            <input className="settings-input" value={tagline} onChange={(e) => setTagline(e.target.value)} />
          </label>
          <FontPicker value={font} onChange={setFont} />

          <span className="settings-stack-label" style={{ marginTop: 6 }}>Palette</span>
          <PaletteLab palette={palette} onChange={setPalette} />
        </div>
      </div>

      {/* The mark editor works on the traced path directly, so what it shows
          is the artwork that gets exported — there is no render step between
          the two that could drift. */}
      {trace && <MarkEditor trace={trace} name={slug(name)} />}

      {/* ----------------------------------------------------- the pack */}
      <div className="suite-section-head" style={{ marginTop: 10 }}>
        <div>
          <h2>3. Your pack</h2>
          <p className="settings-section-desc">Every asset downloads as SVG, PNG or JPEG.</p>
        </div>
      </div>

      {tracing ? (
        <p className="explore-empty">Tracing…</p>
      ) : !trace ? (
        <div className="page-empty-state">
          <PenIcon size={26} color="currentColor" />
          <h2>Nothing to show yet</h2>
          <p>Upload a mark above and the full pack appears here, generated from it.</p>
        </div>
      ) : (
        <div className="cs-pack">
          {pack.map((asset) => (
            <figure key={asset.id} className="cs-asset">
              <div
                className="cs-asset-art"
                style={{ background: asset.id === 'tertiary' ? palette[palette.length - 1] : 'transparent' }}
                dangerouslySetInnerHTML={{ __html: asset.svg }}
              />
              <figcaption>
                <strong>{asset.label}</strong>
                <span>{asset.blurb}</span>
                <div className="cs-formats">
                  {FORMATS.map((f) => (
                    <button key={f.ext} type="button" className="settings-btn" onClick={() => download(asset, f)}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {/* Step four: the same brand, presented in a creator's frame. */}
      {/* Step four: a real, printable brand guide, built entirely from the
          pack above — nothing here is asked for twice. */}
      {trace && (
        <>
          <div className="suite-section-head" style={{ marginTop: 10 }}>
            <div>
              <h2>4. Brand guide</h2>
              <p className="settings-section-desc">
                A style guide generated from this pack — logo usage, clear space, the palette with real values,
                type and misuse examples. Print it, or save as PDF.
              </p>
            </div>
            <button type="button" className="settings-btn settings-btn-primary" onClick={() => setShowGuide((v) => !v)}>
              {showGuide ? 'Hide brand guide' : 'Generate brand guide'}
            </button>
          </div>

          {showGuide && (
            <div className="bg-wrap">
              <div className="bg-toolbar dt-screen-only">
                <button type="button" className="settings-btn settings-btn-primary" onClick={() => window.print()}>
                  Print / PDF
                </button>
              </div>
              <BrandGuide pack={pack} name={name} tagline={tagline} palette={palette} font={font} />
            </div>
          )}
        </>
      )}

      {/* Step five: a matching business card, letterhead and envelope — same
          pack, same palette, same typeface, printed at real physical size. */}
      {trace && (
        <>
          <div className="suite-section-head" style={{ marginTop: 10 }}>
            <div>
              <h2>5. Stationery</h2>
              <p className="settings-section-desc">A business card, letterhead and envelope, printed at true size.</p>
            </div>
            <button type="button" className="settings-btn settings-btn-primary" onClick={() => setShowStationery((v) => !v)}>
              {showStationery ? 'Hide stationery' : 'Generate stationery'}
            </button>
          </div>

          {showStationery && (
            <div className="bg-wrap">
              <div className="cs-panel dt-screen-only" style={{ width: '100%', maxWidth: 720 }}>
                <h3>Contact details</h3>
                <div className="admin-form-row">
                  <label className="settings-field">
                    <span className="settings-field-label">Name</span>
                    <input className="settings-input" value={contact.person} onChange={(e) => setContact((c) => ({ ...c, person: e.target.value }))} placeholder="Your name" />
                  </label>
                  <label className="settings-field">
                    <span className="settings-field-label">Title</span>
                    <input className="settings-input" value={contact.title} onChange={(e) => setContact((c) => ({ ...c, title: e.target.value }))} placeholder="Creative Director" />
                  </label>
                  <label className="settings-field">
                    <span className="settings-field-label">Phone</span>
                    <input className="settings-input" value={contact.phone} onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))} />
                  </label>
                  <label className="settings-field">
                    <span className="settings-field-label">Email</span>
                    <input className="settings-input" value={contact.email} onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))} />
                  </label>
                  <label className="settings-field">
                    <span className="settings-field-label">Website</span>
                    <input className="settings-input" value={contact.website} onChange={(e) => setContact((c) => ({ ...c, website: e.target.value }))} />
                  </label>
                  <label className="settings-field">
                    <span className="settings-field-label">Address</span>
                    <input className="settings-input" value={contact.address} onChange={(e) => setContact((c) => ({ ...c, address: e.target.value }))} />
                  </label>
                </div>
              </div>
              <div className="bg-toolbar dt-screen-only">
                <button type="button" className="settings-btn settings-btn-primary" onClick={() => window.print()}>
                  Print / PDF
                </button>
              </div>
              <StationeryKit pack={pack} name={name} tagline={tagline} palette={palette} font={font} contact={contact} />
            </div>
          )}
        </>
      )}

      <FeaturedTemplates trace={trace} name={name} tagline={tagline} palette={palette} font={font} />
    </>
  )
}
