import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import * as api from '../../lib/api'
import { downloadBlob } from '../../lib/logoPack'
import { TEMPLATE_KINDS, fillTemplate, embedFont, svgBlobUrl, readAsDataUrl } from '../../lib/templateFill'
import { SparkleIcon, UploadIcon, LockIcon } from '../../components/icons'

const ASPECTS = [
  { id: 'landscape', label: 'Landscape' },
  { id: 'square', label: 'Square' },
  { id: 'portrait', label: 'Portrait' },
  { id: 'wide', label: 'Wide' },
]

const slug = (s) => (s || 'brand').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

/** One filled page drawn to a PNG, at the template's own size times `scale`. */
function pageToPng(url, width, height, scale = 2) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = Math.round((width || img.naturalWidth) * scale)
      canvas.height = Math.round((height || img.naturalHeight) * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Export failed'))), 'image/png')
    }
    img.onerror = () => reject(new Error("That page couldn't be drawn."))
    img.src = url
  })
}

/**
 * Step four of the Creative Suite: drop the brand into a creator's frame.
 *
 * Routicle features a set of templates: blank, designed layouts with named
 * places for a logo, colours and words. Picking one fetches its pages (which
 * counts as a download for its creator, once a day at most) and fills them
 * with the brand from steps one to three. Everything after that happens here
 * in the browser: change a colour or the name and the pages redraw at once.
 *
 * Image generation lives here too, inside a template's photo slot, because
 * that's where a generated picture is actually used.
 */
export default function FeaturedTemplates({ trace, name, tagline, palette, font }) {
  const { activeTeam } = useApp()
  const [list, setList] = useState(null)
  const [kind, setKind] = useState('')
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [pages, setPages] = useState(null)
  const [opening, setOpening] = useState('')
  const [filled, setFilled] = useState([])
  const [website, setWebsite] = useState('')
  const [photo, setPhoto] = useState(null)
  const [allowance, setAllowance] = useState(null)
  const [prompt, setPrompt] = useState('')
  const [aspect, setAspect] = useState('landscape')
  const [generating, setGenerating] = useState(false)
  const [imageError, setImageError] = useState('')
  const photoRef = useRef(null)
  const outRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    api
      .fetchFeaturedTemplates(activeTeam?.id)
      .then((r) => !cancelled && setList(r.templates || []))
      .catch((err) => {
        if (cancelled) return
        setList([])
        setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [activeTeam?.id])

  const shown = useMemo(() => (list || []).filter((t) => !kind || t.kind === kind), [list, kind])

  async function open(t) {
    setSelected(t)
    setPages(null)
    setError('')
    if (!t.canUse) return
    setOpening(t.id)
    try {
      const r = await api.useTemplate(t.id, activeTeam?.id)
      setPages(r.pages)
      if (t.slots?.image && allowance === null) {
        api.fetchImageAllowance().then(setAllowance).catch(() => setAllowance({ enabled: false, used: 0, limit: 0 }))
      }
      setTimeout(() => outRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
    } catch (err) {
      setError(err.message)
    } finally {
      setOpening('')
    }
  }

  // Redraw whenever the brand changes. Debounced a touch so dragging a colour
  // picker doesn't redraw every page on every frame.
  useEffect(() => {
    if (!pages) return undefined
    let cancelled = false
    const t = setTimeout(async () => {
      const fontCss = await embedFont(font)
      if (cancelled) return
      try {
        const next = pages.map((p, i) => {
          const svg = fillTemplate(p.svg, { trace, name, tagline, website, palette, font, fontCss, photo })
          const size = selected?.pageSizes?.[i] || {}
          return { svg, url: svgBlobUrl(svg), width: size.width, height: size.height }
        })
        setFilled((prev) => {
          prev.forEach((f) => URL.revokeObjectURL(f.url))
          return next
        })
      } catch (err) {
        setError(err.message)
      }
    }, 140)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [pages, trace, name, tagline, website, palette, font, photo, selected])

  useEffect(() => () => filled.forEach((f) => URL.revokeObjectURL(f.url)), []) // eslint-disable-line react-hooks/exhaustive-deps

  async function onPhoto(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setImageError('Use a JPEG, PNG or WebP photo.')
      return
    }
    setImageError('')
    setPhoto(await readAsDataUrl(file))
  }

  async function generate(e) {
    e.preventDefault()
    if (!prompt.trim() || generating) return
    setGenerating(true)
    setImageError('')
    try {
      const r = await api.generateTemplateImage({ prompt: prompt.trim(), aspect })
      setPhoto(r.image)
      setAllowance((a) => ({ ...(a || {}), used: r.used, limit: r.limit, enabled: true }))
    } catch (err) {
      setImageError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  const base = `${slug(name)}-${slug(selected?.title)}`

  async function downloadPng(i) {
    try {
      const f = filled[i]
      downloadBlob(await pageToPng(f.url, f.width, f.height), `${base}-${i + 1}.png`)
    } catch (err) {
      setError(err.message)
    }
  }

  async function downloadAll() {
    for (let i = 0; i < filled.length; i += 1) {
      // One at a time: browsers drop a burst of simultaneous downloads.
      await downloadPng(i)
    }
  }

  function print() {
    document.body.classList.add('tpl-printing')
    const done = () => {
      document.body.classList.remove('tpl-printing')
      window.removeEventListener('afterprint', done)
    }
    window.addEventListener('afterprint', done)
    window.print()
  }

  return (
    <section className="tpl">
      <div className="suite-section-head" style={{ marginTop: 10 }}>
        <div>
          <h2>4. Present it in a featured template</h2>
          <p className="settings-section-desc">
            Frames designed by Routicle creators, picked by us. Your logo, colours and name drop straight in. Using one pays
            its creator, the same as a download.
          </p>
        </div>
      </div>

      <div className="explore-chip-row tpl-kinds" style={{ padding: 0 }}>
        <button type="button" className={!kind ? 'explore-chip explore-chip-active' : 'explore-chip'} onClick={() => setKind('')}>
          All
        </button>
        {TEMPLATE_KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            className={kind === k.id ? 'explore-chip explore-chip-active' : 'explore-chip'}
            onClick={() => setKind(k.id)}
          >
            {k.label}
          </button>
        ))}
      </div>

      {error && <p className="settings-error">{error}</p>}

      {list === null ? (
        <p className="explore-empty">Loading templates…</p>
      ) : shown.length === 0 ? (
        <div className="page-empty-state tpl-empty">
          <SparkleIcon size={24} color="currentColor" />
          <h2>No featured templates {kind ? 'of this kind ' : ''}yet</h2>
          <p>
            Routicle features templates here as creators upload them and we approve them. Make templates yourself?{' '}
            <Link to="/upload?type=template">Upload one</Link>.
          </p>
        </div>
      ) : (
        <div className="tpl-grid">
          {shown.map((t) => (
            <button
              key={t.id}
              type="button"
              className={selected?.id === t.id ? 'tpl-card tpl-card-on' : 'tpl-card'}
              onClick={() => open(t)}
              disabled={opening === t.id}
            >
              <span className="tpl-card-art">
                {t.image ? (
                  <picture>
                    {t.imageWebp && <source srcSet={t.imageWebp} type="image/webp" />}
                    <img src={t.image} alt="" loading="lazy" />
                  </picture>
                ) : (
                  <span className="tpl-card-blank" />
                )}
                {!t.canUse && (
                  <span className="tpl-lock">
                    <LockIcon size={12} color="currentColor" /> {t.requiredTier === 'express' ? 'Express' : 'Standard'}
                  </span>
                )}
                {t.free && <span className="tpl-free">Free</span>}
              </span>
              <span className="tpl-card-meta">
                <strong>{opening === t.id ? 'Opening…' : t.title}</strong>
                <span>
                  {TEMPLATE_KINDS.find((k) => k.id === t.kind)?.label} · {t.slots?.pages || 1} page
                  {(t.slots?.pages || 1) === 1 ? '' : 's'} · by {t.creator.name}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {selected && !selected.canUse && (
        <div className="tpl-upsell">
          <div>
            <strong>{selected.title} is part of the {selected.requiredTier === 'express' ? 'Express' : 'Standard'} plan.</strong>
            <span>Featured templates come with every paid plan, and each one you use pays the creator who made it.</span>
          </div>
          <Link to="/pricing" className="settings-btn settings-btn-primary">See plans</Link>
        </div>
      )}

      {selected?.canUse && pages && (
        <div className="tpl-work" ref={outRef}>
          <div className="tpl-work-head">
            <div>
              <h3>{selected.title}</h3>
              <p className="settings-row-desc">
                by <Link to={`/creator/${selected.creator.id}`}>{selected.creator.name}</Link>.
                {!trace && ' Upload your mark in step 1 and it appears in the logo spots.'}
              </p>
            </div>
            <div className="settings-inline-actions">
              <button type="button" className="settings-btn" onClick={downloadAll} disabled={!filled.length}>
                Download PNGs
              </button>
              <button type="button" className="settings-btn settings-btn-primary" onClick={print} disabled={!filled.length}>
                Print / PDF
              </button>
            </div>
          </div>

          {(selected.slots?.text?.includes('website') || selected.slots?.image > 0) && (
            <div className="tpl-extras">
              {selected.slots?.text?.includes('website') && (
                <label className="settings-stack-field">
                  <span className="settings-stack-label">Website</span>
                  <input className="settings-input" value={website} placeholder="yourbrand.com" onChange={(e) => setWebsite(e.target.value)} />
                </label>
              )}

              {selected.slots?.image > 0 && (
                <div className="tpl-photo">
                  <span className="settings-stack-label">Photo for this template</span>
                  <div className="tpl-photo-row">
                    {photo ? <img src={photo} alt="" className="tpl-photo-thumb" /> : <span className="tpl-photo-thumb tpl-photo-empty" />}
                    <div className="tpl-photo-actions">
                      <button type="button" className="settings-btn" onClick={() => photoRef.current?.click()}>
                        <UploadIcon size={14} color="currentColor" /> Upload a photo
                      </button>
                      {photo && (
                        <button type="button" className="settings-btn settings-btn-ghost" onClick={() => setPhoto(null)}>
                          Use the template's
                        </button>
                      )}
                    </div>
                    <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onPhoto} />
                  </div>

                  <form className="tpl-ai" onSubmit={generate}>
                    <span className="tpl-ai-label">
                      <SparkleIcon size={14} color="var(--brand-violet)" /> Or generate one
                      {allowance?.enabled && allowance.limit > 0 && (
                        <em>
                          {Math.max(0, allowance.limit - allowance.used)} of {allowance.limit} left this month
                        </em>
                      )}
                    </span>
                    <textarea
                      className="settings-input"
                      rows={2}
                      value={prompt}
                      maxLength={800}
                      placeholder="A sunlit bakery counter with fresh bread, shallow depth of field"
                      onChange={(e) => setPrompt(e.target.value)}
                    />
                    <div className="tpl-ai-row">
                      <select className="settings-input" value={aspect} onChange={(e) => setAspect(e.target.value)} aria-label="Shape">
                        {ASPECTS.map((a) => (
                          <option key={a.id} value={a.id}>{a.label}</option>
                        ))}
                      </select>
                      <button type="submit" className="settings-btn settings-btn-primary" disabled={generating || prompt.trim().length < 3}>
                        {generating ? 'Generating…' : 'Generate'}
                      </button>
                    </div>
                    {allowance && !allowance.enabled && (
                      <p className="settings-row-desc">AI images aren't switched on yet. Upload a photo for now.</p>
                    )}
                    {imageError && <p className="settings-error">{imageError}</p>}
                  </form>
                </div>
              )}
            </div>
          )}

          <div className="tpl-pages">
            {filled.map((f, i) => (
              <figure key={i} className="tpl-page">
                <img src={f.url} alt={`${selected.title}, page ${i + 1}`} style={f.width && f.height ? { aspectRatio: `${f.width} / ${f.height}` } : undefined} />
                <figcaption>
                  <span>Page {i + 1}</span>
                  <button type="button" className="settings-btn" onClick={() => downloadPng(i)}>PNG</button>
                  <button
                    type="button"
                    className="settings-btn"
                    onClick={() => downloadBlob(new Blob([f.svg], { type: 'image/svg+xml' }), `${base}-${i + 1}.svg`)}
                  >
                    SVG
                  </button>
                </figcaption>
              </figure>
            ))}
          </div>

          {/* Only shown while printing: one filled page per sheet. */}
          <div className="tpl-print" aria-hidden="true">
            {filled.map((f, i) => (
              <img key={i} src={f.url} alt="" />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
