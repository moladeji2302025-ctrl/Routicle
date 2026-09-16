import { useApp } from '../../context/AppContext'
import { CATEGORIES } from '../../data/categories'
import { LANDING_PAGES } from '../../data/settings'
import { Section, Row, Toggle, Segmented, Chips } from '../../components/settings/SettingsControls'

const SORTS = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'recent', label: 'Most recent' },
  { id: 'appreciated', label: 'Most appreciated' },
]

const AI_CATEGORIES = ['ai-images', 'ai-video']

export default function BrowsingSettings() {
  const { settings, updateSettings, resetSettings, contentItems } = useApp()
  const b = settings.browsing

  const hiddenCount = contentItems.filter(
    (item) =>
      b.mutedCategories.includes(item.category) ||
      (b.hideAiContent && AI_CATEGORIES.includes(item.category))
  ).length

  function toggleCategory(id) {
    const next = b.mutedCategories.includes(id)
      ? b.mutedCategories.filter((d) => d !== id)
      : [...b.mutedCategories, id]
    updateSettings('browsing', { mutedCategories: next })
  }

  return (
    <>
      <Section
        title="Where you start"
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
      >
        <Row
          title="Hide AI-generated work"
          description="Keeps AI image and video categories out of every feed."
        >
          <Toggle
            label="Hide AI-generated work"
            checked={b.hideAiContent}
            onChange={(hideAiContent) => updateSettings('browsing', { hideAiContent })}
          />
        </Row>
        <Row
          title="Muted categories"
          description="Tap a category to keep it out of your feeds. Direct links still work."
          stacked
        >
          <Chips options={CATEGORIES} selected={b.mutedCategories} onToggle={toggleCategory} />
        </Row>
      </Section>
    </>
  )
}
