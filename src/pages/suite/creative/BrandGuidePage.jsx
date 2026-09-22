import { Link } from 'react-router-dom'
import { useCreativeDraft } from '../../../lib/creativeDraft'
import { buildLogoPack } from '../../../lib/logoPack'
import BrandGuide from '../../../components/BrandGuide'
import SuiteCrumb from '../../../components/SuiteCrumb'
import { BookmarkIcon } from '../../../components/icons'

export default function BrandGuidePage() {
  const [draft] = useCreativeDraft()
  const { trace, name, tagline, palette, font } = draft

  return (
    <>
      <SuiteCrumb label="Brand Guide" />

      <div className="suite-section-head">
        <div>
          <h2>Brand Guide</h2>
          <p className="settings-section-desc">
            A printable style guide, generated entirely from the pack in Logo Maker — logo usage, clear space, the
            palette with real values, type and six illustrated misuse examples.
          </p>
        </div>
        {trace && (
          <button type="button" className="settings-btn settings-btn-primary dt-screen-only" onClick={() => window.print()}>
            Print / PDF
          </button>
        )}
      </div>

      {!trace ? (
        <div className="page-empty-state">
          <BookmarkIcon size={26} color="currentColor" />
          <h2>Build a mark first</h2>
          <p>The brand guide is generated from a logo pack, so there&rsquo;s one to build before there&rsquo;s a guide to print.</p>
          <Link to="/suite/creative/logo" className="btn-hero-primary">Go to Logo Maker</Link>
        </div>
      ) : (
        <div className="bg-wrap">
          <BrandGuide pack={buildLogoPack({ trace, name, tagline, palette, font })} name={name} tagline={tagline} palette={palette} font={font} />
        </div>
      )}
    </>
  )
}
