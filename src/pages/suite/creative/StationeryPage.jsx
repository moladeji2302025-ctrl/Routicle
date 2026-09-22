import { Link } from 'react-router-dom'
import { useCreativeDraft } from '../../../lib/creativeDraft'
import { buildLogoPack } from '../../../lib/logoPack'
import StationeryKit from '../../../components/StationeryKit'
import SuiteCrumb from '../../../components/SuiteCrumb'
import { CardIcon } from '../../../components/icons'

export default function StationeryPage() {
  const [draft, patch] = useCreativeDraft()
  const { trace, name, tagline, palette, font, contact } = draft

  const setContact = (partial) => patch((d) => ({ ...d, contact: { ...d.contact, ...partial } }))

  return (
    <>
      <SuiteCrumb label="Stationery" />

      <div className="suite-section-head">
        <div>
          <h2>Stationery</h2>
          <p className="settings-section-desc">A business card, letterhead and envelope, printed at true physical size.</p>
        </div>
        {trace && (
          <button type="button" className="settings-btn settings-btn-primary dt-screen-only" onClick={() => window.print()}>
            Print / PDF
          </button>
        )}
      </div>

      {!trace ? (
        <div className="page-empty-state">
          <CardIcon size={26} color="currentColor" />
          <h2>Build a mark first</h2>
          <p>Stationery is generated from a logo pack, so there&rsquo;s one to build before there&rsquo;s a card to print.</p>
          <Link to="/suite/creative/logo" className="btn-hero-primary">Go to Logo Maker</Link>
        </div>
      ) : (
        <div className="bg-wrap">
          <div className="cs-panel dt-screen-only" style={{ width: '100%', maxWidth: 720 }}>
            <h3>Contact details</h3>
            <div className="admin-form-row">
              <label className="settings-field">
                <span className="settings-field-label">Name</span>
                <input className="settings-input" value={contact.person} onChange={(e) => setContact({ person: e.target.value })} placeholder="Your name" />
              </label>
              <label className="settings-field">
                <span className="settings-field-label">Title</span>
                <input className="settings-input" value={contact.title} onChange={(e) => setContact({ title: e.target.value })} placeholder="Creative Director" />
              </label>
              <label className="settings-field">
                <span className="settings-field-label">Phone</span>
                <input className="settings-input" value={contact.phone} onChange={(e) => setContact({ phone: e.target.value })} />
              </label>
              <label className="settings-field">
                <span className="settings-field-label">Email</span>
                <input className="settings-input" value={contact.email} onChange={(e) => setContact({ email: e.target.value })} />
              </label>
              <label className="settings-field">
                <span className="settings-field-label">Website</span>
                <input className="settings-input" value={contact.website} onChange={(e) => setContact({ website: e.target.value })} />
              </label>
              <label className="settings-field">
                <span className="settings-field-label">Address</span>
                <input className="settings-input" value={contact.address} onChange={(e) => setContact({ address: e.target.value })} />
              </label>
            </div>
          </div>

          <StationeryKit
            pack={buildLogoPack({ trace, name, tagline, palette, font })}
            name={name}
            tagline={tagline}
            palette={palette}
            font={font}
            contact={contact}
          />
        </div>
      )}
    </>
  )
}
