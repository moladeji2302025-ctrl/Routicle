import { useEffect, useRef, useState } from 'react'
import { warpToQuad, defaultQuad, rasterizeSvg } from '../lib/perspectiveWarp'
import { downloadBlob } from '../lib/logoPack'
import { UploadIcon, DownloadIcon } from './icons'

const BLEND_MODES = [
  { id: 'multiply', label: 'Multiply', hint: 'Ink sinks into the surface — right for most mockups.' },
  { id: 'source-over', label: 'Normal', hint: 'Flat and opaque, like a printed sticker.' },
  { id: 'overlay', label: 'Overlay', hint: 'Punchier contrast, keeps some of the surface showing through.' },
  { id: 'soft-light', label: 'Soft light', hint: 'A gentle version of Overlay — good on fabric.' },
  { id: 'screen', label: 'Screen', hint: 'Lightens — right for a dark surface and a light mark.' },
]

const ASSET_ORDER = ['primary', 'secondary', 'mark', 'tertiary', 'wordmark']

const MAX_EDGE = 1600

export default function MockupStudio({ pack, name }) {
  const stageRef = useRef(null)
  const canvasRef = useRef(null)
  const sceneImgRef = useRef(null)
  const designCanvasRef = useRef(null)
  const dragRef = useRef(null)

  const [ready, setReady] = useState(false)
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 })
  const [quad, setQuad] = useState(null)
  const [assetId, setAssetId] = useState('primary')
  const [blendMode, setBlendMode] = useState('multiply')
  const [opacity, setOpacity] = useState(0.92)
  const [error, setError] = useState('')

  const assets = ASSET_ORDER.map((id) => pack.find((a) => a.id === id)).filter(Boolean)

  function render() {
    const canvas = canvasRef.current
    const scene = sceneImgRef.current
    if (!canvas || !scene || !quad) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(scene, 0, 0, canvas.width, canvas.height)
    if (designCanvasRef.current) {
      const warped = warpToQuad(designCanvasRef.current, quad, canvas.width, canvas.height)
      ctx.save()
      ctx.globalAlpha = opacity
      ctx.globalCompositeOperation = blendMode
      ctx.drawImage(warped, 0, 0)
      ctx.restore()
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(render, [quad, blendMode, opacity, ready])

  useEffect(() => {
    const asset = pack.find((a) => a.id === assetId)
    if (!asset) return
    rasterizeSvg(asset.svg).then((canvas) => {
      designCanvasRef.current = canvas
      render()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId, pack])

  async function onScene(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Pick a photo — a JPEG or PNG of a real surface.')
      return
    }
    setError('')
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      sceneImgRef.current = img
      canvasRef.current.width = w
      canvasRef.current.height = h
      setCanvasSize({ w, h })
      setQuad(defaultQuad(w, h))
      setReady(true)
    }
    img.onerror = () => setError('That photo could not be read.')
    img.src = url
  }

  function startDrag(e, index) {
    e.preventDefault()
    dragRef.current = index
    window.addEventListener('pointermove', onDrag)
    window.addEventListener('pointerup', endDrag)
  }

  function onDrag(e) {
    const i = dragRef.current
    if (i == null || !stageRef.current) return
    const rect = stageRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * canvasSize.w
    const y = ((e.clientY - rect.top) / rect.height) * canvasSize.h
    setQuad((q) => q.map((p, idx) => (idx === i ? { x: clamp(x, 0, canvasSize.w), y: clamp(y, 0, canvasSize.h) } : p)))
  }

  function endDrag() {
    dragRef.current = null
    window.removeEventListener('pointermove', onDrag)
    window.removeEventListener('pointerup', endDrag)
  }

  function resetQuad() {
    if (canvasSize.w) setQuad(defaultQuad(canvasSize.w, canvasSize.h))
  }

  function download() {
    canvasRef.current?.toBlob((blob) => {
      if (blob) downloadBlob(blob, `${(name || 'brand').toLowerCase().replace(/\s+/g, '-')}-mockup.png`)
    }, 'image/png')
  }

  return (
    <div className="mks">
      {error && <p className="settings-error">{error}</p>}

      <div className="cs-grid">
        <div className="cs-panel">
          <h3>1. A photo of a real surface</h3>
          <button type="button" className="cs-drop" onClick={() => document.getElementById('mks-scene-input')?.click()}>
            <UploadIcon size={22} color="currentColor" />
            <strong>{ready ? 'Use a different photo' : 'Upload a photo'}</strong>
            <span>A mug, a wall, a shirt, a shopfront — anything with a flat-ish surface to place the mark on.</span>
          </button>
          <input id="mks-scene-input" type="file" accept="image/*" hidden onChange={onScene} />

          <span className="settings-stack-label" style={{ marginTop: 14 }}>Which asset</span>
          <div className="mks-assets">
            {assets.map((a) => (
              <button
                key={a.id}
                type="button"
                className={a.id === assetId ? 'mks-asset mks-asset-active' : 'mks-asset'}
                onClick={() => setAssetId(a.id)}
                title={a.label}
              >
                <span dangerouslySetInnerHTML={{ __html: a.svg }} />
              </button>
            ))}
          </div>

          <span className="settings-stack-label" style={{ marginTop: 14 }}>Blend mode</span>
          <select className="settings-input" value={blendMode} onChange={(e) => setBlendMode(e.target.value)}>
            {BLEND_MODES.map((b) => (
              <option key={b.id} value={b.id}>{b.label}</option>
            ))}
          </select>
          <p className="settings-stack-hint">{BLEND_MODES.find((b) => b.id === blendMode)?.hint}</p>

          <label className="settings-stack-field" style={{ marginTop: 10 }}>
            <span className="settings-stack-label">Opacity {Math.round(opacity * 100)}%</span>
            <input type="range" min="0.2" max="1" step="0.02" value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} />
          </label>

          {ready && (
            <div className="settings-inline-actions" style={{ marginTop: 14 }}>
              <button type="button" className="settings-btn" onClick={resetQuad}>Reset corners</button>
              <button type="button" className="settings-btn settings-btn-primary" onClick={download}>
                <DownloadIcon size={15} color="currentColor" />
                Save PNG
              </button>
            </div>
          )}
        </div>

        <div className="cs-panel mks-stage-panel">
          <h3>2. Drag the corners onto the surface</h3>
          {/* The canvas stays mounted even before a photo is chosen, so its ref
              is always valid by the time onScene's image finishes loading. */}
          <div className={ready ? 'mks-stage' : 'mks-stage mks-stage-idle'} ref={stageRef}>
            <canvas ref={canvasRef} />
            {ready && (
              <>
                <svg className="mks-guide" viewBox={`0 0 ${canvasSize.w} ${canvasSize.h}`} preserveAspectRatio="none">
                  <polygon points={quad.map((p) => `${p.x},${p.y}`).join(' ')} />
                </svg>
                {quad.map((p, i) => (
                  <div
                    key={i}
                    className="mks-handle"
                    style={{ left: `${(p.x / canvasSize.w) * 100}%`, top: `${(p.y / canvasSize.h) * 100}%` }}
                    onPointerDown={(e) => startDrag(e, i)}
                  />
                ))}
              </>
            )}
            {!ready && (
              <div className="mks-stage-empty">
                <UploadIcon size={26} color="currentColor" />
                <p>Upload a photo to start placing the mark.</p>
              </div>
            )}
          </div>
          <p className="mks-hint">Drag each corner to trace the surface in the photo — the mark warps to match.</p>
        </div>
      </div>
    </div>
  )
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v))
}
