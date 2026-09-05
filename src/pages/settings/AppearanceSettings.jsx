import { useApp } from '../../context/AppContext'
import { DENSITIES, THEME_MODES } from '../../data/settings'
import { Section, Row, Toggle, Segmented } from '../../components/settings/SettingsControls'

export default function AppearanceSettings() {
  const { settings, updateSettings, resetSettings, theme } = useApp()
  const a = settings.appearance

  return (
    <>
      <Section
        title="Theme"
        description="Applies to the signed-in app. The public marketing pages are light-only by design."
        actions={
          <button type="button" className="settings-btn settings-btn-ghost" onClick={() => resetSettings('appearance')}>
            Reset
          </button>
        }
      >
        <Row
          title="Colour mode"
          description={a.themeMode === 'system' ? `Following your OS — currently ${theme}.` : 'Fixed regardless of your OS setting.'}
        >
          <Segmented
            name="Colour mode"
            options={THEME_MODES}
            value={a.themeMode}
            onChange={(themeMode) => updateSettings('appearance', { themeMode })}
          />
        </Row>
      </Section>

      <Section title="Layout" description="How much work fits on screen at once.">
        <Row title="Grid density" description={DENSITIES.find((d) => d.id === a.density)?.desc}>
          <Segmented
            name="Grid density"
            options={DENSITIES}
            value={a.density}
            onChange={(density) => updateSettings('appearance', { density })}
          />
        </Row>
      </Section>

      <Section title="Motion" description="Useful on slower machines, or if animation makes you uncomfortable.">
        <Row
          title="Reduce motion"
          description="Strips transitions and scroll reveals across the whole app."
        >
          <Toggle
            label="Reduce motion"
            checked={a.reduceMotion}
            onChange={(reduceMotion) => updateSettings('appearance', { reduceMotion })}
          />
        </Row>
        <Row
          title="Intro animation"
          description="The Routicle mark that plays once when the site first loads."
        >
          <Toggle
            label="Intro animation"
            checked={a.introAnimation && !a.reduceMotion}
            disabled={a.reduceMotion}
            onChange={(introAnimation) => updateSettings('appearance', { introAnimation })}
          />
        </Row>
      </Section>
    </>
  )
}
