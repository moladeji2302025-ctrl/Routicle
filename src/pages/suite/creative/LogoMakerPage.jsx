import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { vectorize } from '../../../lib/vectorize'
import { buildLogoPack, svgToRaster, downloadBlob } from '../../../lib/logoPack'
import { useCreativeDraft } from '../../../lib/creativeDraft'
import { PenIcon, UploadIcon, ChevronRightIcon } from '../../../components/icons'
import FontPicker from '../../../components/FontPicker'
import MarkEditor from '../../../components/MarkEditor'
import PaletteLab from '../../../components/PaletteLab'
import SuiteCrumb from '../../../components/SuiteCrumb'

const FORMATS = [
  { ext: 'svg', label: 'SVG', type: null },
  { ext: 'png', label: 'PNG', type: 'image/png' },
  { ext: 'jpg', label: 'JPEG', type: 'image/jpeg' },
]

const slug = (s) => (s || 'brand').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

export default function LogoMakerPage() {
  const [draft, patch] = useCreativeDraft()
  const fileRef = useRef(null)
  const [preview, setPreview] = useState('')
  const [tracing, setTracing] = useState(false)
  const [error, setError] = useState('')

  const [threshold, setThreshold] = useState(null) // null = choose automatically
  const [invert, setInvert] = useState(false)
  const [detail, setDetail] = useState(1.2)
  const [lastFile, setLastFile] = useState(null)

  const { trace, name, tagline, palette, font } = draft

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
        patch({ trace: null })
      } else {
        patch({ trace: result })
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
    if (!name) patch({ name: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ') })
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
      <SuiteCrumb label="Logo Maker" />

      <div className="suite-section-head">
        <div>
          <h2>Logo Maker</h2>
          <p className="settings-section-desc">
            Upload a sketch or a flat logo image. We&rsquo;ll turn it into vectors, then build a full pack with primary,
            secondary and tertiary lockups, the mark, the wordmark and the palette.
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
            <input className="settings-input" value={name} onChange={(e) => patch({ name: e.target.value })} placeholder="Your Brand" />
          </label>
          <label className="settings-stack-field">
            <span className="settings-stack-label">Tagline (optional)</span>
            <input className="settings-input" value={tagline} onChange={(e) => patch({ tagline: e.target.value })} />
          </label>
          <FontPicker value={font} onChange={(f) => patch({ font: f })} />

          <span className="settings-stack-label" style={{ marginTop: 6 }}>Palette</span>
          <PaletteLab palette={palette} onChange={(p) => patch({ palette: p })} />
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
        <>
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

          <div className="cs-next">
            <span>The pack is saved — jump straight to the other tools.</span>
            <div className="cs-next-links">
              <Link to="/suite/creative/brand-guide" className="settings-btn">Brand Guide <ChevronRightIcon size={13} color="currentColor" /></Link>
              <Link to="/suite/creative/stationery" className="settings-btn">Stationery <ChevronRightIcon size={13} color="currentColor" /></Link>
              <Link to="/suite/creative/templates" className="settings-btn">Featured Templates <ChevronRightIcon size={13} color="currentColor" /></Link>
            </div>
          </div>
        </>
      )}
    </>
  )
}
