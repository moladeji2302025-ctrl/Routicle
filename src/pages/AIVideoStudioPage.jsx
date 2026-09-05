import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { SparkleIcon } from '../components/icons'

export default function AIVideoStudioPage() {
  const { currentUser, generateVideo, settings } = useApp()
  const navigate = useNavigate()
  const [prompt, setPrompt] = useState('')
  const [seconds, setSeconds] = useState(settings.studio.defaultVideoSeconds)

  if (!currentUser) {
    return (
      <div className="studio-page studio-gate">
        <h1>Sign in to generate</h1>
        <button type="button" className="btn-hero-primary" onClick={() => navigate('/signup')}>Sign up free</button>
      </div>
    )
  }

  if (currentUser.role !== 'express') {
    return (
      <div className="studio-page studio-gate">
        <h1>AI Video Studio is Express-only</h1>
        <p>Upgrade to Express to get 60 seconds of AI video generation a month.</p>
        <button type="button" className="btn-hero-primary" onClick={() => navigate('/pricing')}>Upgrade to Express</button>
      </div>
    )
  }

  function handleGenerate(event) {
    event.preventDefault()
    if (!prompt.trim()) return
    generateVideo(prompt, seconds)
    setPrompt('')
  }

  return (
    <div className="studio-page">
      <div className="studio-header">
        <h1><SparkleIcon size={22} color="var(--brand-violet)" /> AI Video Studio</h1>
        <div className="studio-credits">
          <strong>{currentUser.credits.video}s</strong> remaining this month
        </div>
      </div>

      {currentUser.credits.video <= 0 && (
        <div className="studio-upsell">
          You're out of video seconds for this cycle. <button type="button" onClick={() => navigate('/pricing')}>Buy more</button>
        </div>
      )}

      <form className="studio-form" onSubmit={handleGenerate}>
        <textarea
          className="studio-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the shot or scene you want…"
          rows={3}
        />
        <div className="studio-controls">
          <label className="auth-field">
            Length
            <select value={seconds} onChange={(e) => setSeconds(Number(e.target.value))}>
              <option value={5}>5 seconds</option>
              <option value={10}>10 seconds</option>
              <option value={15}>15 seconds</option>
            </select>
          </label>
          <button type="submit" className="btn-hero-primary" disabled={currentUser.credits.video < seconds}>
            Generate ({seconds}s)
          </button>
        </div>
      </form>

      <h3 className="studio-history-title">Generation history</h3>
      <div className="studio-history-grid">
        {currentUser.generationHistory.video.length === 0 && (
          <p className="explore-empty">Nothing generated yet — try a prompt above.</p>
        )}
        {currentUser.generationHistory.video.map((gen) => (
          <div key={gen.id} className="studio-result">
            <div className="studio-video-placeholder">{gen.seconds}s clip</div>
            <p>{gen.prompt}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
