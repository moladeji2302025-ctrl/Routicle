import { Link } from 'react-router-dom'
import { useCreativeDraft } from '../../../lib/creativeDraft'
import Mockup3D from '../../../components/Mockup3D'
import SuiteCrumb from '../../../components/SuiteCrumb'
import { CubeIcon } from '../../../components/icons'

export default function Mockup3DPage() {
  const [draft] = useCreativeDraft()
  const { trace, name, palette, font } = draft

  return (
    <>
      <SuiteCrumb label="3D Mockups" />

      <div className="suite-section-head">
        <div>
          <h2>3D Mockups</h2>
          <p className="settings-section-desc">The brand, live on a mug, a tote bag and a package — drag to rotate, save a shot for a pitch deck.</p>
        </div>
      </div>

      {!trace ? (
        <div className="page-empty-state">
          <CubeIcon size={26} color="currentColor" />
          <h2>Build a mark first</h2>
          <p>Mockups are textured from the logo pack, so there&rsquo;s a mark to build before there&rsquo;s a mug to put it on.</p>
          <Link to="/suite/creative/logo" className="btn-hero-primary">Go to Logo Maker</Link>
        </div>
      ) : (
        <Mockup3D trace={trace} name={name} palette={palette} font={font} />
      )}
    </>
  )
}
