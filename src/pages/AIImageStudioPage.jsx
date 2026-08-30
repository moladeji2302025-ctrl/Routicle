import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { SparkleIcon } from '../components/icons'

const SAMPLE_RESULTS = ['/images/t1.jpg', '/images/t3.jpg', '/images/t7.jpg', '/images/t9.jpg']

export default function AIImageStudioPage() {
  const { currentUser, generateImage, upscaleImage } = useApp()
  const navigate = useNavigate()
  const [prompt, setPrompt] = useState('')
  const [style, setStyle] = useState('Photorealistic')
  const [aspect, setAspect] = useState('1:1')

  if (!currentUser) {
    return (
      <div className="studio-page studio-gate">
        <h1>Sign in to generate</h1>
        <button type="button" className="btn-hero-primary" onClick={() => navigate('/signup')}>Sign up free</button>
      </div>
    )
  }

  if (currentUser.role === 'free') {
    return (
      <div className="studio-page studio-gate">
        <h1>AI Image Studio is a Standard+ perk</h1>
        <p>Upgrade to Standard to get 50 image generations a month.</p>
        <button type="button" className="btn-hero-primary" onClick={() => navigate('/pricing')}>See pricing</button>
      </div>
    )
  }

  function handleGenerate(event) {
    event.preventDefault()
    if (!prompt.trim()) return
    generateImage(`${prompt} — ${style}, ${aspect}`)
    setPrompt('')
  }

  return (
    <div className="studio-page">
      <div className="studio-header">
        <h1><SparkleIcon size={22} color="var(--brand-violet)" /> AI Image Studio</h1>
        <div className="studio-credits">
          <strong>{currentUser.credits.image}</strong> generations left this month
        </div>
      </div>

      {currentUser.credits.image <= 0 && (
        <div className="studio-upsell">
          You're out of image credits for this cycle. <button type="button" onClick={() => navigate('/pricing')}>Upgrade or buy more</button>
        </div>
      )}

      <form className="studio-form" onSubmit={handleGenerate}>
        <textarea
          className="studio-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe what you want to generate…"
          rows={3}
        />
        <div className="studio-controls">
          <label className="auth-field">
            Style
            <select value={style} onChange={(e) => setStyle(e.target.value)}>
              <option>Photorealistic</option>
              <option>Minimalist</option>
              <option>Cyberpunk</option>
              <option>Watercolor</option>
              <option>3D Render</option>
            </select>
          </label>
          <label className="auth-field">
            Aspect ratio
            <select value={aspect} onChange={(e) => setAspect(e.target.value)}>
              <option>1:1</option>
              <option>16:9</option>
              <option>9:16</option>
              <option>4:5</option>
            </select>
          </label>
          <button type="submit" className="btn-hero-primary" disabled={currentUser.credits.image <= 0}>
            Generate (1 credit)
          </button>
        </div>
      </form>

      <h3 className="studio-history-title">Generation history</h3>
      <div className="studio-history-grid">
        {currentUser.generationHistory.image.length === 0 && (
          <p className="explore-empty">Nothing generated yet — try a prompt above.</p>
        )}
        {currentUser.generationHistory.image.map((gen, i) => (
          <div key={gen.id} className="studio-result">
            <img src={SAMPLE_RESULTS[i % SAMPLE_RESULTS.length]} alt={gen.prompt} />
            <p>{gen.prompt}</p>
            <button
              type="button"
              className="studio-upscale-btn"
              disabled={currentUser.credits.image <= 0}
              onClick={() => upscaleImage(gen.id)}
            >
              Upscale 2x (1 credit)
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
