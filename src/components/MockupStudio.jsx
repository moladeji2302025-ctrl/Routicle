import { useEffect, useRef, useState } from 'react'
import {
  warpMesh, defaultQuad, rasterizeSvg, svgAspect, processDesign, translateQuad, scaleQuad, rotateQuad,
  EDGE_PAIRS, edgeControlPoint, bulgeFromPoint, edgeCurvePoints,
} from '../lib/perspectiveWarp'
import { downloadBlob } from '../lib/logoPack'
import { fetchMockupTemplates } from '../lib/api'
import { UploadIcon, DownloadIcon, CopyIcon, TrashIcon, PlusIcon } from './icons'

const TEMPLATE_CATEGORY_LABEL = {
  mug: 'Mugs', tshirt: 'T-shirts', cap: 'Caps', tote: 'Totes & bags', box: 'Boxes & packages',
  book: 'Books', billboard: 'Billboards', other: 'Other',
}

const BLEND_MODES = [
  { id: 'multiply', label: 'Multiply', hint: 'Ink sinks into the surface — right for most mockups.' },
  { id: 'source-over', label: 'Normal', hint: 'Flat and opaque, like a printed sticker.' },
  { id: 'overlay', label: 'Overlay', hint: 'Punchier contrast, keeps some of the surface showing through.' },
  { id: 'soft-light', label: 'Soft light', hint: 'A gentle version of Overlay — good on fabric.' },
  { id: 'screen', label: 'Screen', hint: 'Lightens — right for a dark surface and a light mark.' },
]

const ASSET_ORDER = ['primary', 'secondary', 'mark', 'tertiary', 'wordmark']
const MAX_EDGE = 1600

const uid = () => Math.random().toString(36).slice(2, 9)

function freshLayer(assetId, quad) {
  return {
    id: uid(),
    assetId,
    quad,
    bulges: [0, 0, 0, 0],
    blendMode: 'multiply',
    opacity: 0.92,
    brightness: 1,
    contrast: 1,
    tint: '',
    flipH: false,
    flipV: false,
  }
}

export default function MockupStudio({ pack, name }) {
  const stageRef = useRef(null)
  const canvasRef = useRef(null)
  const sceneImgRef = useRef(null)
  const rawCacheRef = useRef(new Map()) // assetId -> rasterised canvas
  const dragRef = useRef(null)

  const [ready, setReady] = useState(false)
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 })
  const [layers, setLayers] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [error, setError] = useState('')
  const [templates, setTemplates] = useState(null)

  useEffect(() => {
    fetchMockupTemplates()
      .then(({ templates: rows }) => setTemplates(rows))
      .catch(() => setTemplates([]))
  }, [])

  const assets = ASSET_ORDER.map((id) => pack.find((a) => a.id === id)).filter(Boolean)
  const selected = layers.find((l) => l.id === selectedId) || null

  function render() {
    const canvas = canvasRef.current
    const scene = sceneImgRef.current
    if (!canvas || !scene) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(scene, 0, 0, canvas.width, canvas.height)
    for (const layer of layers) {
      const raw = rawCacheRef.current.get(layer.assetId)
      if (!raw) continue
      const processed = processDesign(raw, layer)
      const warped = warpMesh(processed, layer.quad, layer.bulges, canvas.width, canvas.height)
      ctx.save()
      ctx.globalAlpha = layer.opacity
      ctx.globalCompositeOperation = layer.blendMode
      ctx.drawImage(warped, 0, 0)
      ctx.restore()
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(render, [layers, ready])

  // Rasterising an SVG needs an image load, so it's cached per asset id and
  // kept off the synchronous render path — every layer sharing an asset
  // reuses the same source canvas.
  useEffect(() => {
    const wanted = [...new Set(layers.map((l) => l.assetId))].filter((id) => !rawCacheRef.current.has(id))
    if (!wanted.length) return
    Promise.all(
      wanted.map(async (id) => {
        const asset = pack.find((a) => a.id === id)
        if (!asset) return
        const canvas = await rasterizeSvg(asset.svg)
        rawCacheRef.current.set(id, canvas)
      })
    ).then(render)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers.map((l) => l.assetId).join(','), pack])

  // If the selected layer was deleted, fall back to whatever's left.
  useEffect(() => {
    if (layers.length && !layers.find((l) => l.id === selectedId)) setSelectedId(layers[0].id)
  }, [layers, selectedId])

  function updateSelected(patch) {
    if (!selectedId) return
    setLayers((ls) => ls.map((l) => (l.id === selectedId ? { ...l, ...(typeof patch === 'function' ? patch(l) : patch) } : l)))
  }

  function aspectOf(assetId) {
    const asset = pack.find((a) => a.id === assetId)
    return asset ? svgAspect(asset.svg) : 1
  }

  function applyScene(img) {
    const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
    const w = Math.round(img.width * scale)
    const h = Math.round(img.height * scale)
    sceneImgRef.current = img
    canvasRef.current.width = w
    canvasRef.current.height = h
    setCanvasSize({ w, h })
    const assetId = assets[0]?.id || 'primary'
    const layer = freshLayer(assetId, defaultQuad(w, h, aspectOf(assetId)))
    setLayers([layer])
    setSelectedId(layer.id)
    setReady(true)
  }

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
    img.onload = () => applyScene(img)
    img.onerror = () => setError('That photo could not be read.')
    img.src = url
  }

  function chooseTemplate(t) {
    setError('')
    const img = new Image()
    // The templates bucket is on a different host, so this needs an explicit
    // CORS request — without it the canvas taints and Save PNG throws.
    img.crossOrigin = 'anonymous'
    img.onload = () => applyScene(img)
    img.onerror = () => setError('That template photo could not be loaded.')
    img.src = t.image
  }

  function toCanvasPoint(e) {
    const rect = stageRef.current.getBoundingClientRect()
    return {
      x: clamp(((e.clientX - rect.left) / rect.width) * canvasSize.w, 0, canvasSize.w),
      y: clamp(((e.clientY - rect.top) / rect.height) * canvasSize.h, 0, canvasSize.h),
    }
  }

  function startCornerDrag(e, index) {
    e.preventDefault()
    e.stopPropagation()
    dragRef.current = { mode: 'corner', index }
    window.addEventListener('pointermove', onDrag)
    window.addEventListener('pointerup', endDrag)
  }

  function startEdgeDrag(e, index) {
    e.preventDefault()
    e.stopPropagation()
    dragRef.current = { mode: 'edge', index }
    window.addEventListener('pointermove', onDrag)
    window.addEventListener('pointerup', endDrag)
  }

  // The SVG guide sits visually above the canvas but, in some browsers,
  // pointer events don't reliably hit-test through its `pointer-events: none`
  // root even when a child opts back in — so "click inside the shape to move
  // it" is decided here instead, against the stage's own pointer events
  // (which are known-reliable, since the corner handles already rely on them).
  function startStageDrag(e) {
    if (!selected) return
    const p = toCanvasPoint(e)
    if (!pointInQuad(p, shapeOutline(selected.quad, selected.bulges))) return
    e.preventDefault()
    dragRef.current = { mode: 'move', last: p }
    window.addEventListener('pointermove', onDrag)
    window.addEventListener('pointerup', endDrag)
  }

  function onDrag(e) {
    const d = dragRef.current
    if (!d) return
    const p = toCanvasPoint(e)
    if (d.mode === 'corner') {
      updateSelected((l) => ({ quad: l.quad.map((pt, idx) => (idx === d.index ? p : pt)) }))
    } else if (d.mode === 'edge') {
      const [a, b] = EDGE_PAIRS[d.index]
      updateSelected((l) => ({
        bulges: l.bulges.map((bulge, idx) => (idx === d.index ? bulgeFromPoint(l.quad[a], l.quad[b], p) : bulge)),
      }))
    } else {
      const dx = p.x - d.last.x
      const dy = p.y - d.last.y
      d.last = p
      updateSelected((l) => ({ quad: translateQuad(l.quad, dx, dy) }))
    }
  }

  function endDrag() {
    dragRef.current = null
    window.removeEventListener('pointermove', onDrag)
    window.removeEventListener('pointerup', endDrag)
  }

  function autoFit() {
    if (!canvasSize.w) return
    updateSelected((l) => ({ quad: defaultQuad(canvasSize.w, canvasSize.h, aspectOf(l.assetId)), bulges: [0, 0, 0, 0] }))
  }

  function straightenEdges() {
    updateSelected({ bulges: [0, 0, 0, 0] })
  }

  function setAsset(assetId) {
    updateSelected((l) => ({
      assetId,
      quad: canvasSize.w ? defaultQuad(canvasSize.w, canvasSize.h, aspectOf(assetId)) : l.quad,
      bulges: [0, 0, 0, 0],
    }))
  }

  function nudgeScale(factor) {
    updateSelected((l) => ({ quad: scaleQuad(l.quad, factor) }))
  }

  function nudgeRotate(deg) {
    updateSelected((l) => ({ quad: rotateQuad(l.quad, deg) }))
  }

  function addLayer() {
    if (!canvasSize.w) return
    const assetId = assets[0]?.id || 'primary'
    const layer = freshLayer(assetId, defaultQuad(canvasSize.w, canvasSize.h, aspectOf(assetId)))
    setLayers((ls) => [...ls, layer])
    setSelectedId(layer.id)
  }

  function duplicateLayer(id) {
    const src = layers.find((l) => l.id === id)
    if (!src) return
    const copy = { ...src, id: uid(), quad: translateQuad(src.quad, 28, 28) }
    setLayers((ls) => [...ls, copy])
    setSelectedId(copy.id)
  }

  function deleteLayer(id) {
    setLayers((ls) => (ls.length > 1 ? ls.filter((l) => l.id !== id) : ls))
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

          {templates && templates.length > 0 && (
            <>
              <span className="settings-stack-label" style={{ marginTop: 14 }}>Or pick a template</span>
              <div className="mks-templates">
                {Object.entries(
                  templates.reduce((by, t) => {
                    ;(by[t.category] ||= []).push(t)
                    return by
                  }, {})
                ).map(([cat, rows]) => (
                  <div key={cat} className="mks-template-group">
                    <span>{TEMPLATE_CATEGORY_LABEL[cat] || cat}</span>
                    <div className="mks-template-row">
                      {rows.map((t) => (
                        <button key={t.id} type="button" className="mks-template" onClick={() => chooseTemplate(t)} title={t.title}>
                          {/* crossOrigin here has to match chooseTemplate's Image() below — loading
                              the same URL once without it and once with it makes the browser serve
                              a cached non-CORS response for the second request, which then fails. */}
                          <img src={t.image} alt="" loading="lazy" crossOrigin="anonymous" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {ready && (
            <>
              <span className="settings-stack-label" style={{ marginTop: 16 }}>Layers</span>
              <div className="mks-layers">
                {layers.map((l, i) => {
                  const asset = pack.find((a) => a.id === l.assetId)
                  return (
                    <div
                      key={l.id}
                      className={l.id === selectedId ? 'mks-layer mks-layer-active' : 'mks-layer'}
                      onClick={() => setSelectedId(l.id)}
                    >
                      <span className="mks-layer-name">{i + 1}. {asset?.label || 'Layer'}</span>
                      <span className="mks-layer-actions">
                        <button type="button" title="Duplicate" onClick={(e) => { e.stopPropagation(); duplicateLayer(l.id) }}>
                          <CopyIcon size={14} color="currentColor" />
                        </button>
                        {layers.length > 1 && (
                          <button type="button" title="Delete" onClick={(e) => { e.stopPropagation(); deleteLayer(l.id) }}>
                            <TrashIcon size={14} color="currentColor" />
                          </button>
                        )}
                      </span>
                    </div>
                  )
                })}
                <button type="button" className="mks-layer-add" onClick={addLayer}>
                  <PlusIcon size={14} color="currentColor" />
                  Add another layer
                </button>
              </div>
            </>
          )}

          {ready && selected && (
            <>
              <span className="settings-stack-label" style={{ marginTop: 16 }}>This layer's asset</span>
              <div className="mks-assets">
                {assets.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className={a.id === selected.assetId ? 'mks-asset mks-asset-active' : 'mks-asset'}
                    onClick={() => setAsset(a.id)}
                    title={a.label}
                  >
                    <span dangerouslySetInnerHTML={{ __html: a.svg }} />
                  </button>
                ))}
              </div>

              <span className="settings-stack-label" style={{ marginTop: 16 }}>Placement</span>
              <div className="mks-transform-row">
                <button type="button" className="settings-btn" onClick={autoFit}>Auto-fit</button>
                <div className="mks-stepper">
                  <span>Size</span>
                  <button type="button" onClick={() => nudgeScale(0.94)}>−</button>
                  <button type="button" onClick={() => nudgeScale(1.06)}>+</button>
                </div>
                <div className="mks-stepper">
                  <span>Rotate</span>
                  <button type="button" onClick={() => nudgeRotate(-5)}>⟲</button>
                  <button type="button" onClick={() => nudgeRotate(5)}>⟳</button>
                </div>
              </div>
              <div className="mks-transform-row">
                <button
                  type="button"
                  className={selected.flipH ? 'settings-btn mks-toggle-on' : 'settings-btn'}
                  onClick={() => updateSelected((l) => ({ flipH: !l.flipH }))}
                >
                  Flip ↔
                </button>
                <button
                  type="button"
                  className={selected.flipV ? 'settings-btn mks-toggle-on' : 'settings-btn'}
                  onClick={() => updateSelected((l) => ({ flipV: !l.flipV }))}
                >
                  Flip ↕
                </button>
                <button type="button" className="settings-btn" onClick={straightenEdges}>Straighten edges</button>
              </div>
              <p className="mks-hint" style={{ margin: '4px 0 0' }}>
                Drag inside the outline to move it, its corners to warp it, or the diamond on each
                edge to bend that side — for a curved surface like a mug or a bottle.
              </p>

              <span className="settings-stack-label" style={{ marginTop: 16 }}>Look</span>
              <select className="settings-input" value={selected.blendMode} onChange={(e) => updateSelected({ blendMode: e.target.value })}>
                {BLEND_MODES.map((b) => (
                  <option key={b.id} value={b.id}>{b.label}</option>
                ))}
              </select>
              <p className="settings-stack-hint">{BLEND_MODES.find((b) => b.id === selected.blendMode)?.hint}</p>

              <label className="settings-stack-field" style={{ marginTop: 10 }}>
                <span className="settings-stack-label">Opacity {Math.round(selected.opacity * 100)}%</span>
                <input type="range" min="0.2" max="1" step="0.02" value={selected.opacity} onChange={(e) => updateSelected({ opacity: Number(e.target.value) })} />
              </label>
              <label className="settings-stack-field" style={{ marginTop: 8 }}>
                <span className="settings-stack-label">Brightness {Math.round(selected.brightness * 100)}%</span>
                <input type="range" min="0.4" max="1.6" step="0.02" value={selected.brightness} onChange={(e) => updateSelected({ brightness: Number(e.target.value) })} />
              </label>
              <label className="settings-stack-field" style={{ marginTop: 8 }}>
                <span className="settings-stack-label">Contrast {Math.round(selected.contrast * 100)}%</span>
                <input type="range" min="0.4" max="1.6" step="0.02" value={selected.contrast} onChange={(e) => updateSelected({ contrast: Number(e.target.value) })} />
              </label>

              <label className="mks-tint-row">
                <input
                  type="checkbox"
                  checked={Boolean(selected.tint)}
                  onChange={(e) => updateSelected({ tint: e.target.checked ? '#ffffff' : '' })}
                />
                <span>Recolour to a flat colour</span>
                <input
                  type="color"
                  value={selected.tint || '#ffffff'}
                  disabled={!selected.tint}
                  onChange={(e) => updateSelected({ tint: e.target.value })}
                />
              </label>

              <div className="settings-inline-actions" style={{ marginTop: 16 }}>
                <button type="button" className="settings-btn settings-btn-primary" onClick={download}>
                  <DownloadIcon size={15} color="currentColor" />
                  Save PNG
                </button>
              </div>
            </>
          )}
        </div>

        <div className="cs-panel mks-stage-panel">
          <h3>2. The mockup</h3>
          {/* The canvas stays mounted even before a photo is chosen, so its ref
              is always valid by the time onScene's image finishes loading. */}
          <div
            className={ready ? 'mks-stage' : 'mks-stage mks-stage-idle'}
            ref={stageRef}
            onPointerDown={startStageDrag}
          >
            <canvas ref={canvasRef} />
            {ready && selected && (
              <>
                <svg className="mks-guide" viewBox={`0 0 ${canvasSize.w} ${canvasSize.h}`} preserveAspectRatio="none">
                  <polygon points={shapeOutline(selected.quad, selected.bulges).map((p) => `${p.x},${p.y}`).join(' ')} />
                </svg>
                {EDGE_PAIRS.map(([a, b], i) => {
                  const p = edgeControlPoint(selected.quad[a], selected.quad[b], selected.bulges[i])
                  return (
                    <div
                      key={i}
                      className="mks-handle mks-handle-curve"
                      style={{ left: `${(p.x / canvasSize.w) * 100}%`, top: `${(p.y / canvasSize.h) * 100}%` }}
                      onPointerDown={(e) => startEdgeDrag(e, i)}
                    />
                  )
                })}
                {selected.quad.map((p, i) => (
                  <div
                    key={i}
                    className="mks-handle"
                    style={{ left: `${(p.x / canvasSize.w) * 100}%`, top: `${(p.y / canvasSize.h) * 100}%` }}
                    onPointerDown={(e) => startCornerDrag(e, i)}
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
          <p className="mks-hint">The selected layer's outline is shown — pick a layer on the left to edit it.</p>
        </div>
      </div>
    </div>
  )
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v))
}

function shapeOutline(quad, bulges) {
  const [p0, p1, p2, p3] = quad
  const top = edgeCurvePoints(p0, p1, bulges[0])
  const right = edgeCurvePoints(p1, p2, bulges[1])
  const bottom = edgeCurvePoints(p3, p2, bulges[2]).reverse()
  const left = edgeCurvePoints(p0, p3, bulges[3]).reverse()
  return [...top, ...right.slice(1), ...bottom.slice(1), ...left.slice(1)]
}

function pointInQuad(pt, quad) {
  let inside = false
  for (let i = 0, j = quad.length - 1; i < quad.length; j = i, i += 1) {
    const a = quad[i]
    const b = quad[j]
    const crosses = a.y > pt.y !== b.y > pt.y
    if (crosses && pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}
