import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { CATEGORIES } from '../data/categories'
import { TIERS } from '../data/pricing'

const FORMATS = [
  { id: 'PSD', name: 'Photoshop', accept: '.psd,.psb' },
  { id: 'AI', name: 'Illustrator', accept: '.ai,.eps,.pdf' },
  { id: 'Canva', name: 'Canva design', accept: '' },
  { id: 'AEP', name: 'After Effects', accept: '.aep,.aet' },
  { id: 'PPRO', name: 'Premiere Pro', accept: '.prproj' },
  { id: 'Figma', name: 'Figma file', accept: '.fig' },
]
const VIDEO_FORMATS = ['AEP', 'PPRO']
const DESCRIPTION_MAX = 600

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let n = bytes
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i++
  }
  return `${n < 10 && i > 0 ? n.toFixed(1) : Math.round(n)} ${units[i]}`
}

const Check = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
)

const Cross = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
)

const Arrow = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />
  </svg>
)

/**
 * A file target you can drop onto or click. Shows the file once chosen, with a
 * way to clear it, instead of the browser's own "Choose File" control.
 */
function DropZone({ label, hint, accept, file, onFile, badge, children, tall = false }) {
  const inputRef = useRef(null)
  const [over, setOver] = useState(false)

  function take(list) {
    const next = list?.[0]
    if (next) onFile(next)
  }

  return (
    <div
      className={['up-drop', over && 'up-drop-over', file && 'up-drop-filled', tall && 'up-drop-tall'].filter(Boolean).join(' ')}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        take(e.dataTransfer.files)
      }}
    >
      {children}

      <div className="up-drop-row">
        {badge && <span className="up-drop-badge">{badge}</span>}

        <div className="up-drop-text">
          {file ? (
            <>
              <strong title={file.name}>{file.name}</strong>
              <span>{formatBytes(file.size)}</span>
            </>
          ) : (
            <>
              <strong>{label}</strong>
              <span>{hint}</span>
            </>
          )}
        </div>

        {file ? (
          <div className="up-drop-actions">
            <button type="button" className="up-link" onClick={() => inputRef.current?.click()}>
              Replace
            </button>
            <button type="button" className="up-icon-btn" onClick={() => onFile(null)} aria-label={`Remove ${file.name}`}>
              <Cross />
            </button>
          </div>
        ) : (
          <button type="button" className="up-browse" onClick={() => inputRef.current?.click()}>
            <Arrow />
            Browse
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept || undefined}
        hidden
        onChange={(e) => {
          take(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )
}

/** An object URL for a File, released when the file changes or the page closes. */
function useObjectUrl(file) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    if (!file) {
      setUrl('')
      return undefined
    }
    const next = URL.createObjectURL(file)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [file])
  return url
}

export default function CreatorUploadPage() {
  const { currentUser, submitUpload } = useApp()
  const navigate = useNavigate()

  const [formats, setFormats] = useState([])
  const [sourceFiles, setSourceFiles] = useState({})
  const [thumbnailFile, setThumbnailFile] = useState(null)
  const [previewVideoFile, setPreviewVideoFile] = useState(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0].id)
  const [description, setDescription] = useState('')
  const [behindTheDesign, setBehindTheDesign] = useState('')
  const [rightsConfirmed, setRightsConfirmed] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const thumbUrl = useObjectUrl(thumbnailFile)
  const videoUrl = useObjectUrl(previewVideoFile)

  const needsVideoPreview = formats.some((f) => VIDEO_FORMATS.includes(f))
  const tier = needsVideoPreview ? TIERS.express : formats.length > 0 ? TIERS.standard : null
  const categoryLabel = CATEGORIES.find((c) => c.id === category)?.label

  // Formats are kept in the catalogue's order, not click order, so the list
  // doesn't reshuffle as you tick things.
  const orderedFormats = FORMATS.filter((f) => formats.includes(f.id))

  const checklist = [
    { done: formats.length > 0, label: 'Choose at least one format' },
    { done: formats.length > 0 && formats.every((f) => sourceFiles[f]), label: 'Attach a file for each format' },
    { done: Boolean(thumbnailFile), label: 'Add a thumbnail' },
    ...(needsVideoPreview ? [{ done: Boolean(previewVideoFile), label: 'Add an MP4 preview' }] : []),
    { done: Boolean(title.trim()), label: 'Give it a title' },
    { done: Boolean(description.trim()), label: 'Write a description' },
    { done: rightsConfirmed, label: 'Confirm you own the rights' },
  ]
  const remaining = checklist.filter((c) => !c.done).length
  const canSubmit = remaining === 0 && !submitting

  function toggleFormat(id) {
    setFormats((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!currentUser) {
      navigate('/signup')
      return
    }
    if (!canSubmit) return
    setSubmitting(true)
    setError('')
    try {
      await submitUpload({
        title: title.trim(),
        category,
        description: description.trim(),
        behindTheDesign: behindTheDesign.trim(),
        isAiGenerated: category.startsWith('ai-'),
        thumbnailFile,
        previewVideoFile: needsVideoPreview ? previewVideoFile : null,
        sourceFiles: orderedFormats.map((f) => ({ label: f.id, file: sourceFiles[f.id] })),
      })
      setSubmitted(true)
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!currentUser?.isCreator) {
    return (
      <div className="up-page up-gate">
        <h1>Become a creator first</h1>
        <p>You'll need to apply as a creator before you can upload.</p>
        <button type="button" className="btn-hero-primary" onClick={() => navigate('/become-creator')}>
          Become a Creator
        </button>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="up-page up-gate">
        <span className="up-gate-mark">
          <Check size={22} />
        </span>
        <h1>Submitted for review</h1>
        <p>
          Your files are saved. An admin will review your submission before it goes live, and you'll see it in
          your dashboard once it's approved.
        </p>
        <button type="button" className="btn-hero-primary" onClick={() => navigate('/dashboard')}>
          Go to your dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="up-page">
      <header className="up-head">
        <h1>Upload work</h1>
        <p>Add the files, a preview and a few details. An admin reviews every piece before it goes live.</p>
      </header>

      <form className="up-layout" onSubmit={handleSubmit}>
        <div className="up-main">
          {/* ------------------------------------------------------------ files */}
          <section className="up-card">
            <div className="up-card-head">
              <span className="up-step">1</span>
              <div>
                <h2>Files</h2>
                <p>Pick every format this piece comes in, then attach each one.</p>
              </div>
            </div>

            <div className="up-formats" role="group" aria-label="Formats included">
              {FORMATS.map((f) => {
                const on = formats.includes(f.id)
                return (
                  <button
                    key={f.id}
                    type="button"
                    className={on ? 'up-format up-format-on' : 'up-format'}
                    aria-pressed={on}
                    onClick={() => toggleFormat(f.id)}
                  >
                    <span className="up-format-tick">{on && <Check size={10} />}</span>
                    <span className="up-format-id">{f.id}</span>
                    <span className="up-format-name">{f.name}</span>
                  </button>
                )
              })}
            </div>

            {orderedFormats.length > 0 && (
              <div className="up-files">
                {orderedFormats.map((f) => (
                  <DropZone
                    key={f.id}
                    badge={f.id}
                    label={`${f.name} file`}
                    hint="Drop it here, or browse"
                    accept={f.accept}
                    file={sourceFiles[f.id]}
                    onFile={(file) => setSourceFiles((prev) => ({ ...prev, [f.id]: file }))}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ---------------------------------------------------------- preview */}
          <section className="up-card">
            <div className="up-card-head">
              <span className="up-step">2</span>
              <div>
                <h2>Preview</h2>
                <p>
                  This is what people see in the library.{' '}
                  {needsVideoPreview ? 'Video formats also need a short MP4 clip.' : 'A clean JPEG or PNG works best.'}
                </p>
              </div>
            </div>

            <div className={needsVideoPreview ? 'up-previews up-previews-two' : 'up-previews'}>
              <DropZone
                tall
                label="Thumbnail"
                hint="JPEG or PNG"
                accept="image/jpeg,image/png"
                file={thumbnailFile}
                onFile={setThumbnailFile}
              >
                {thumbUrl && <img className="up-drop-media" src={thumbUrl} alt="" />}
              </DropZone>

              {needsVideoPreview && (
                <DropZone
                  tall
                  label="Preview clip"
                  hint="MP4, a few seconds"
                  accept="video/mp4"
                  file={previewVideoFile}
                  onFile={setPreviewVideoFile}
                >
                  {videoUrl && <video className="up-drop-media" src={videoUrl} muted loop autoPlay playsInline />}
                </DropZone>
              )}
            </div>
          </section>

          {/* ---------------------------------------------------------- details */}
          <section className="up-card">
            <div className="up-card-head">
              <span className="up-step">3</span>
              <div>
                <h2>Details</h2>
                <p>Help people find the piece and understand what they're getting.</p>
              </div>
            </div>

            <label className="up-field">
              <span className="up-label">Title</span>
              <input
                className="up-input"
                type="text"
                value={title}
                maxLength={90}
                placeholder="Brand Deck: Rivers & Wells"
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>

            <div className="up-field">
              <span className="up-label">Category</span>
              <div className="up-cats" role="radiogroup" aria-label="Category">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={category === c.id}
                    className={category === c.id ? 'up-cat up-cat-on' : 'up-cat'}
                    onClick={() => setCategory(c.id)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="up-field">
              <span className="up-label">
                Description
                <em>
                  {description.length}/{DESCRIPTION_MAX}
                </em>
              </span>
              <textarea
                className="up-input up-textarea"
                value={description}
                rows={4}
                maxLength={DESCRIPTION_MAX}
                placeholder="What's in the file, and what would someone use it for?"
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>

            <label className="up-field">
              <span className="up-label">
                Behind the design <em>Optional</em>
              </span>
              <textarea
                className="up-input up-textarea"
                value={behindTheDesign}
                rows={3}
                placeholder="What were you going for, and what does this piece mean to you?"
                onChange={(e) => setBehindTheDesign(e.target.value)}
              />
            </label>
          </section>
        </div>

        {/* ------------------------------------------------------------ aside */}
        <aside className="up-aside">
          <div className="up-card up-summary">
            <div className="up-preview-card">
              <div className="up-preview-art">
                {thumbUrl ? <img src={thumbUrl} alt="" /> : <span>Your thumbnail</span>}
                {tier && <span className="up-tier">{tier.label}</span>}
              </div>
              <div className="up-preview-meta">
                <strong>{title.trim() || 'Untitled piece'}</strong>
                <span>{categoryLabel}</span>
                {orderedFormats.length > 0 && (
                  <div className="up-preview-formats">
                    {orderedFormats.map((f) => (
                      <span key={f.id}>{f.id}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <ul className="up-checklist">
              {checklist.map((c) => (
                <li key={c.label} className={c.done ? 'up-check-done' : ''}>
                  <span className="up-check-dot">{c.done && <Check size={10} />}</span>
                  {c.label}
                </li>
              ))}
            </ul>

            <label className="up-rights">
              <input
                type="checkbox"
                checked={rightsConfirmed}
                onChange={(e) => setRightsConfirmed(e.target.checked)}
              />
              <span className="up-rights-box">{rightsConfirmed && <Check size={11} />}</span>
              <span>
                I own the full commercial rights to this work, and it doesn't include client trademarks or
                confidential material.
              </span>
            </label>

            {error && <p className="up-error">{error}</p>}

            <button type="submit" className="btn-hero-primary up-submit" disabled={!canSubmit}>
              {submitting ? 'Uploading…' : 'Submit for review'}
            </button>
            <p className="up-remaining">
              {remaining === 0 ? 'Ready to submit.' : `${remaining} ${remaining === 1 ? 'thing' : 'things'} left to do.`}
            </p>
          </div>
        </aside>
      </form>
    </div>
  )
}
