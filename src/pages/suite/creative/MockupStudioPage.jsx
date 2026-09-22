import { Link } from 'react-router-dom'
import { useCreativeDraft } from '../../../lib/creativeDraft'
import { buildLogoPack } from '../../../lib/logoPack'
import MockupStudio from '../../../components/MockupStudio'
import SuiteCrumb from '../../../components/SuiteCrumb'
import { ImageIcon } from '../../../components/icons'

export default function MockupStudioPage() {
  const [draft] = useCreativeDraft()
  const { trace, name, tagline, palette, font } = draft

  return (
    <>
      <SuiteCrumb label="Mockup Studio" />

      <div className="suite-section-head">
        <div>
          <h2>Mockup Studio</h2>
          <p className="settings-section-desc">
            Drop the mark onto a real photo — a mug, a wall, a shirt, a shopfront — warped to the surface and blended in like it belongs there.
          </p>
        </div>
      </div>

      {!trace ? (
        <div className="page-empty-state">
          <ImageIcon size={26} color="currentColor" />
          <h2>Build a mark first</h2>
          <p>Mockups place an asset from the logo pack, so there&rsquo;s one to build before there&rsquo;s a mark to place.</p>
          <Link to="/suite/creative/logo" className="btn-hero-primary">Go to Logo Maker</Link>
        </div>
      ) : (
        <MockupStudio pack={buildLogoPack({ trace, name, tagline, palette, font })} name={name} />
      )}
    </>
  )
}
