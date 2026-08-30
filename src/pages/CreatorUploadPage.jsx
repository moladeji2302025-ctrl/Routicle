import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { DEPARTMENTS } from '../data/departments'
import { TIERS } from '../data/pricing'

const FORMATS = ['PSD', 'AI', 'Canva', 'AEP', 'PPRO', 'Figma']
const EXPRESS_FORMATS = ['AEP', 'PPRO']

export default function CreatorUploadPage() {
  const { currentUser, submitUpload } = useApp()
  const navigate = useNavigate()

  const [formats, setFormats] = useState([])
  const [thumbnailName, setThumbnailName] = useState('')
  const [previewName, setPreviewName] = useState('')
  const [department, setDepartment] = useState(DEPARTMENTS[0].id)
  const [tags, setTags] = useState('')
  const [description, setDescription] = useState('')
  const [behindTheDesign, setBehindTheDesign] = useState('')
  const [rightsConfirmed, setRightsConfirmed] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const needsVideoPreview = formats.some((f) => EXPRESS_FORMATS.includes(f))
  const derivedTier = needsVideoPreview ? TIERS.express : formats.length > 0 ? TIERS.standard : null

  const canSubmit = useMemo(() => {
    return (
      formats.length > 0 &&
      thumbnailName &&
      (!needsVideoPreview || previewName) &&
      description.trim() &&
      rightsConfirmed
    )
  }, [formats, thumbnailName, needsVideoPreview, previewName, description, rightsConfirmed])

  function toggleFormat(format) {
    setFormats((prev) => (prev.includes(format) ? prev.filter((f) => f !== format) : [...prev, format]))
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (!currentUser) {
      navigate('/signup')
      return
    }
    if (!canSubmit) return
    submitUpload({
      title: tags.split(',')[0]?.trim() || 'Untitled upload',
      department,
      fileTypes: formats,
      thumbnail: '/images/t1.jpg',
      description,
      behindTheDesign,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
    })
    setSubmitted(true)
  }

  if (!currentUser?.isCreator) {
    return (
      <div className="upload-page upload-gate">
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
      <div className="upload-page upload-gate">
        <h1>Submitted for review</h1>
        <p>An admin will review your upload before it goes live. You'll see it in your dashboard once approved.</p>
        <button type="button" className="btn-hero-primary" onClick={() => navigate('/dashboard')}>
          Go to your dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="upload-page">
      <h1>Upload work</h1>
      <p className="upload-subtitle">Bundle every format this piece includes — tier is derived automatically.</p>

      <form className="upload-form" onSubmit={handleSubmit}>
        <div className="upload-section">
          <h3>1. File formats included</h3>
          <div className="upload-format-grid">
            {FORMATS.map((format) => (
              <label key={format} className={formats.includes(format) ? 'upload-format-chip checked' : 'upload-format-chip'}>
                <input type="checkbox" checked={formats.includes(format)} onChange={() => toggleFormat(format)} />
                {format}
              </label>
            ))}
          </div>
          {formats.map((format) => (
            <div key={format} className="upload-slot">
              <span>{format} file</span>
              <input type="file" onChange={(e) => e.target.files[0] && setFormats((f) => f)} />
            </div>
          ))}
          {derivedTier && (
            <p className="upload-tier-preview">
              This bundle will require <strong>{derivedTier.label}</strong> tier to download.
            </p>
          )}
        </div>

        <div className="upload-section">
          <h3>2. Thumbnail {needsVideoPreview && '& MP4 preview'}</h3>
          <div className="upload-slot">
            <span>Thumbnail (JPEG/PNG) — required</span>
            <input type="file" accept="image/*" onChange={(e) => setThumbnailName(e.target.files[0]?.name || '')} />
          </div>
          {needsVideoPreview && (
            <div className="upload-slot">
              <span>MP4 preview clip — required for video formats</span>
              <input type="file" accept="video/mp4" onChange={(e) => setPreviewName(e.target.files[0]?.name || '')} />
            </div>
          )}
        </div>

        <div className="upload-section">
          <h3>3. Department &amp; details</h3>
          <label className="auth-field">
            Department
            <select value={department} onChange={(e) => setDepartment(e.target.value)}>
              {DEPARTMENTS.map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>
          </label>
          <label className="auth-field">
            Title &amp; tags (comma-separated, first tag becomes the title)
            <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Brand Deck, pitch, minimal" />
          </label>
          <label className="auth-field">
            Description
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} required />
          </label>
          <label className="auth-field">
            Behind the Design (optional) — what were you going for? What does this piece mean to you?
            <textarea value={behindTheDesign} onChange={(e) => setBehindTheDesign(e.target.value)} rows={3} />
          </label>
        </div>

        <label className="creator-apply-rights">
          <input type="checkbox" checked={rightsConfirmed} onChange={(e) => setRightsConfirmed(e.target.checked)} />
          I confirm I hold full commercial rights to this work and it contains no client-owned trademarks or
          confidential material.
        </label>

        <button type="submit" className="btn-hero-primary auth-submit" disabled={!canSubmit}>
          Submit for review
        </button>
      </form>
    </div>
  )
}
