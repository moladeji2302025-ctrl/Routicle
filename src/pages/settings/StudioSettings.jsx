import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { TIERS } from '../../data/pricing'
import { Section, Row, Toggle, Segmented } from '../../components/settings/SettingsControls'

const VIDEO_LENGTHS = [
  { id: 5, label: '5s' },
  { id: 10, label: '10s' },
  { id: 15, label: '15s' },
]

function Meter({ label, used, total, unit }) {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0
  return (
    <div className="settings-meter">
      <div className="settings-meter-top">
        <span>{label}</span>
        <span>
          {used}
          {unit} of {total}
          {unit} left
        </span>
      </div>
      <div className="settings-meter-track">
        <div className="settings-meter-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function StudioSettings() {
  const { currentUser, subscription, settings, updateSettings, clearGenerationHistory } = useApp()
  const s = settings.studio

  const tier = subscription?.tier || 'free'
  const plan = TIERS[tier]
  const imageMax = plan?.imageCredits || 0
  const videoMax = plan?.videoCredits || 0
  const history = currentUser.generationHistory

  return (
    <>
      <Section
        title="Credits"
        description={
          tier === 'free'
            ? 'AI Studio credits come with a paid plan.'
            : `Included with ${plan.label}, reset each billing cycle.`
        }
        actions={
          tier !== 'express' ? (
            <Link to="/pricing" className="settings-btn settings-btn-ghost">
              {tier === 'free' ? 'Get credits' : 'Upgrade'}
            </Link>
          ) : null
        }
      >
        {imageMax > 0 ? (
          <Meter label="Image generations" used={currentUser.credits.image} total={imageMax} unit="" />
        ) : (
          <p className="settings-row-desc">No image credits on the {plan?.label || 'Free'} plan.</p>
        )}
        {videoMax > 0 ? (
          <Meter label="Video seconds" used={currentUser.credits.video} total={videoMax} unit="s" />
        ) : (
          <p className="settings-row-desc">Video generation is Express-only.</p>
        )}
      </Section>

      <Section title="Defaults" description="What the studios are preset to each time you open them.">
        <Row
          title="Default clip length"
          description={
            tier === 'express'
              ? 'Pre-selected in the AI Video Studio.'
              : 'Takes effect once you have Express.'
          }
        >
          <Segmented
            name="Default clip length"
            options={VIDEO_LENGTHS}
            value={s.defaultVideoSeconds}
            onChange={(defaultVideoSeconds) => updateSettings('studio', { defaultVideoSeconds })}
          />
        </Row>
        <Row
          title="Keep generation history"
          description="Off means prompts aren't stored after generating. Credits are still spent either way."
        >
          <Toggle
            label="Keep generation history"
            checked={s.keepHistory}
            onChange={(keepHistory) => updateSettings('studio', { keepHistory })}
          />
        </Row>
      </Section>

      <Section
        title="History"
        description={`${history.image.length} image · ${history.video.length} video generation${
          history.image.length + history.video.length === 1 ? '' : 's'
        } stored on this device.`}
      >
        <Row title="Clear image history" description="Removes stored image prompts. Credits aren't refunded.">
          <button
            type="button"
            className="settings-btn"
            disabled={history.image.length === 0}
            onClick={() => clearGenerationHistory('image')}
          >
            Clear
          </button>
        </Row>
        <Row title="Clear video history" description="Removes stored video prompts.">
          <button
            type="button"
            className="settings-btn"
            disabled={history.video.length === 0}
            onClick={() => clearGenerationHistory('video')}
          >
            Clear
          </button>
        </Row>
      </Section>
    </>
  )
}
