import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { getCreatorByName } from '../../data/creators'
import { squareImageDataUrl } from '../../utils/image'
import { Feedback } from '../../components/settings/SettingsControls'
import { UserIcon, PenIcon } from '../../components/icons'

/** A label + control + hint, stacked — this page reads as a form, not a settings list. */
function StackField({ label, hint, children }) {
  return (
    <label className="settings-stack-field">
      <span className="settings-stack-label">{label}</span>
      {children}
      {hint && <span className="settings-stack-hint">{hint}</span>}
    </label>
  )
}

export default function ProfileSettings() {
  const { currentUser, updateProfile } = useApp()
  const fileRef = useRef(null)
  const menuRef = useRef(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [linkMode, setLinkMode] = useState(false)

  const [form, setForm] = useState({
    name: currentUser.name || '',
    image: currentUser.image || '',
    bio: currentUser.bio || '',
    instagram: currentUser.social?.instagram || '',
    linkedin: currentUser.social?.linkedin || '',
    website: currentUser.social?.website || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const creator = getCreatorByName(currentUser.name)

  const dirty =
    form.name !== (currentUser.name || '') ||
    form.image !== (currentUser.image || '') ||
    form.bio !== (currentUser.bio || '') ||
    form.instagram !== (currentUser.social?.instagram || '') ||
    form.linkedin !== (currentUser.social?.linkedin || '') ||
    form.website !== (currentUser.social?.website || '')

  useEffect(() => {
    if (!menuOpen) return undefined
    function onClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
    setNotice('')
  }

  async function handleFile(event) {
    const file = event.target.files?.[0]
    // Reset immediately so picking the *same* file again still fires onChange.
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('That file is not an image.')
      return
    }
    setError('')
    try {
      set('image', await squareImageDataUrl(file))
      setLinkMode(false)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('A display name is required.')
      return
    }
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await updateProfile({
        name: form.name.trim(),
        image: form.image.trim(),
        bio: form.bio,
        social: { instagram: form.instagram.trim(), linkedin: form.linkedin.trim(), website: form.website.trim() },
      })
      setNotice('Profile saved.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave}>
      <section className="settings-section">
        <div className="settings-section-head settings-section-head-ruled">
          <div>
            <h2>Public profile</h2>
            <p className="settings-section-desc">
              How you appear on your work, in teams, and anywhere you're credited.
            </p>
          </div>
        </div>

        <div className="settings-profile-layout">
          <div className="settings-profile-fields">
            <StackField label="Display name" hint="Shown as the creator credit on anything you upload.">
              <input
                type="text"
                className="settings-input"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                required
              />
            </StackField>

            <StackField label="Email" hint="Used for sign-in, receipts and payout notices. Change it under Sign-in & security.">
              <input type="email" className="settings-input" value={currentUser.email} readOnly />
            </StackField>

            <StackField label="Bio" hint="A couple of sentences on what you make.">
              <textarea
                className="settings-textarea"
                rows={4}
                value={form.bio}
                placeholder="Motion designer working mostly in broadcast and title sequences…"
                onChange={(e) => set('bio', e.target.value)}
              />
            </StackField>

            <StackField label="Website">
              <input
                type="url"
                className="settings-input"
                value={form.website}
                placeholder="https://yourwork.com"
                onChange={(e) => set('website', e.target.value)}
              />
            </StackField>

            <StackField label="Instagram">
              <input
                type="text"
                className="settings-input"
                value={form.instagram}
                placeholder="@handle"
                onChange={(e) => set('instagram', e.target.value)}
              />
            </StackField>

            <StackField label="LinkedIn">
              <input
                type="text"
                className="settings-input"
                value={form.linkedin}
                placeholder="linkedin.com/in/…"
                onChange={(e) => set('linkedin', e.target.value)}
              />
            </StackField>
          </div>

          <div className="settings-profile-picture">
            <p className="settings-stack-label">Profile picture</p>

            <div className="settings-avatar-large-wrap">
              {form.image ? (
                <img src={form.image} alt="Your profile picture" className="settings-avatar-large" />
              ) : (
                <span className="settings-avatar-large settings-avatar-fallback">
                  <UserIcon size={48} color="currentColor" />
                </span>
              )}

              <div className="settings-avatar-edit" ref={menuRef}>
                <button
                  type="button"
                  className="settings-avatar-edit-btn"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                >
                  <PenIcon size={12} color="currentColor" />
                  Edit
                </button>

                {menuOpen && (
                  <div className="settings-avatar-menu" role="menu">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false)
                        fileRef.current?.click()
                      }}
                    >
                      Upload a photo
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false)
                        setLinkMode(true)
                      }}
                    >
                      Use an image link
                    </button>
                    {form.image && (
                      <button
                        type="button"
                        role="menuitem"
                        className="settings-avatar-menu-danger"
                        onClick={() => {
                          setMenuOpen(false)
                          setLinkMode(false)
                          set('image', '')
                        }}
                      >
                        Remove photo
                      </button>
                    )}
                  </div>
                )}
              </div>

              <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />
            </div>

            <p className="settings-stack-hint settings-avatar-hint">
              Cropped square and resized to 256px.
            </p>

            {linkMode && (
              <input
                type="url"
                className="settings-input settings-avatar-link-input"
                value={form.image.startsWith('data:') ? '' : form.image}
                placeholder="https://…"
                autoFocus
                onChange={(e) => set('image', e.target.value)}
              />
            )}
          </div>
        </div>
      </section>

      <Feedback error={error} notice={notice} />

      <div className="settings-actions settings-actions-sticky">
        <button type="submit" className="settings-btn settings-btn-primary" disabled={saving || !dirty}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {creator && (
          <Link to={`/creator/${creator.id}`} className="settings-btn">
            View public profile
          </Link>
        )}
      </div>
    </form>
  )
}
