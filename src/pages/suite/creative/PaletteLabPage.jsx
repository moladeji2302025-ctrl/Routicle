import { Link } from 'react-router-dom'
import { useCreativeDraft } from '../../../lib/creativeDraft'
import PaletteLab from '../../../components/PaletteLab'
import SuiteCrumb from '../../../components/SuiteCrumb'
import { isDark } from '../../../lib/logoPack'

export default function PaletteLabPage() {
  const [draft, patch] = useCreativeDraft()

  return (
    <>
      <SuiteCrumb label="Palette Lab" />

      <div className="suite-section-head">
        <div>
          <h2>Palette Lab</h2>
          <p className="settings-section-desc">
            A preset, real colour theory built from one seed colour, or the dominant tones pulled out of a photo.
            Whatever you land on here is the palette Logo Maker, the Brand Guide and Stationery all use.
          </p>
        </div>
      </div>

      <div className="cs-grid">
        <div className="cs-panel">
          <PaletteLab palette={draft.palette} onChange={(palette) => patch({ palette })} />
        </div>

        <div className="cs-panel">
          <h3>On the brand</h3>
          {draft.trace ? (
            <>
              <div className="pl-brandpreview" style={{ background: draft.palette[draft.palette.length - 1] }}>
                <div
                  className="pl-brandpreview-mark"
                  style={{ color: draft.palette[0] }}
                  dangerouslySetInnerHTML={{ __html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${draft.trace.viewBox}"><path d="${draft.trace.pathData}" fill="currentColor" fill-rule="evenodd"/></svg>` }}
                />
                <strong style={{ color: isDark(draft.palette[draft.palette.length - 1]) ? '#fff' : draft.palette[0] }}>{draft.name || 'Your Brand'}</strong>
              </div>
              <p className="settings-stack-hint">This palette applies everywhere else automatically — nothing else to update.</p>
            </>
          ) : (
            <p className="settings-stack-hint">
              Build a mark in <Link to="/suite/creative/logo">Logo Maker</Link> to preview the palette on the real brand.
            </p>
          )}
        </div>
      </div>
    </>
  )
}
