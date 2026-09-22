import { Link } from 'react-router-dom'
import { useCreativeDraft } from '../../../lib/creativeDraft'
import FeaturedTemplates from '../FeaturedTemplates'
import SuiteCrumb from '../../../components/SuiteCrumb'
import { GridIcon } from '../../../components/icons'

export default function FeaturedTemplatesPage() {
  const [draft] = useCreativeDraft()
  const { trace, name, tagline, palette, font } = draft

  return (
    <>
      <SuiteCrumb label="Featured Templates" />

      {!trace ? (
        <>
          <div className="suite-section-head">
            <div>
              <h2>Featured Templates</h2>
              <p className="settings-section-desc">Drop the brand into a creator&rsquo;s frame — social posts, decks, one-pagers.</p>
            </div>
          </div>
          <div className="page-empty-state">
            <GridIcon size={26} color="currentColor" />
            <h2>Build a mark first</h2>
            <p>Templates are filled with the pack from Logo Maker, so there&rsquo;s one to build before there&rsquo;s a brand to drop in.</p>
            <Link to="/suite/creative/logo" className="btn-hero-primary">Go to Logo Maker</Link>
          </div>
        </>
      ) : (
        <FeaturedTemplates trace={trace} name={name} tagline={tagline} palette={palette} font={font} />
      )}
    </>
  )
}
