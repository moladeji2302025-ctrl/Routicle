import { useApp } from '../../context/AppContext'
import { DEPARTMENTS } from '../../data/departments'
import { LANDING_PAGES } from '../../data/settings'
import { Section, Row, Toggle, Segmented, Chips } from '../../components/settings/SettingsControls'

const SORTS = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'recent', label: 'Most recent' },
  { id: 'appreciated', label: 'Most appreciated' },
]

const AI_DEPARTMENTS = ['ai-images', 'ai-video']

export default function BrowsingSettings() {
  const { settings, updateSettings, resetSettings, contentItems } = useApp()
  const b = settings.browsing

  const hiddenCount = contentItems.filter(
    (item) =>
      b.mutedDepartments.includes(item.department) ||
      (b.hideAiContent && AI_DEPARTMENTS.includes(item.department))
  ).length

  function toggleDepartment(id) {
    const next = b.mutedDepartments.includes(id)
      ? b.mutedDepartments.filter((d) => d !== id)
      : [...b.mutedDepartments, id]
    updateSettings('browsing', { mutedDepartments: next })
  }

  return (
    <>
      <Section
        title="Where you start"
        description="The page Routicle opens on when you come back."
        actions={
          <button type="button" className="settings-btn settings-btn-ghost" onClick={() => resetSettings('browsing')}>
            Reset
          </button>
        }
      >
        <Row title="Landing page" description="Applies to signed-in visits to routicle.app.">
          <Segmented
            name="Landing page"
            options={LANDING_PAGES}
            value={b.landing}
            onChange={(landing) => updateSettings('browsing', { landing })}
          />
        </Row>
        <Row title="Default sort" description="What Explore is sorted by before you touch anything.">
          <Segmented
            name="Default sort"
            options={SORTS}
            value={b.defaultSort}
            onChange={(defaultSort) => updateSettings('browsing', { defaultSort })}
          />
        </Row>
      </Section>

      <Section
        title="What you see"
        description={
          hiddenCount > 0
            ? `${hiddenCount} piece${hiddenCount === 1 ? '' : 's'} in the current library are hidden by these filters.`
            : 'Filters apply to Explore, Departments and your dashboard rails.'
        }
      >
        <Row
          title="Hide AI-generated work"
          description="Keeps AI image and video departments out of every feed."
        >
          <Toggle
            label="Hide AI-generated work"
            checked={b.hideAiContent}
            onChange={(hideAiContent) => updateSettings('browsing', { hideAiContent })}
          />
        </Row>
        <Row
          title="Muted departments"
          description="Tap a department to keep it out of your feeds. Direct links still work."
          stacked
        >
          <Chips options={DEPARTMENTS} selected={b.mutedDepartments} onToggle={toggleDepartment} />
        </Row>
      </Section>
    </>
  )
}
