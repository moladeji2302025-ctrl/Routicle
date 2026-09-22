import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { renderBrandTexture } from '../lib/mockupTexture'
import { downloadBlob } from '../lib/logoPack'
import { DownloadIcon } from './icons'

const ITEMS = [
  { id: 'mug', label: 'Mug' },
  { id: 'tote', label: 'Tote bag' },
  { id: 'box', label: 'Package' },
]

function buildMug(sideMat, capMat) {
  const group = new THREE.Group()
  const radius = 1.05
  const height = 2.3
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, 72, 1, false),
    [sideMat, capMat, capMat]
  )
  group.add(body)

  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.13, 20, 48, Math.PI * 1.5), capMat)
  handle.rotation.z = Math.PI / 2
  handle.rotation.y = Math.PI / 2
  handle.position.set(radius + 0.02, 0, 0)
  group.add(handle)

  return group
}

function buildTote(frontMat, plainMat) {
  const group = new THREE.Group()
  const w = 2.1
  const h = 2.5
  const d = 0.9
  // BoxGeometry face-group order is [+x, -x, +y, -y, +z, -z] — the texture
  // goes on +z, the panel that faces the camera at the default angle.
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [plainMat, plainMat, plainMat, plainMat, frontMat, plainMat])
  group.add(body)

  // Two compact loops, not one arch spanning the whole width — a torus's
  // half-arc (u:0→PI) already spans 2×(radius+tube) at the base, so keeping
  // that narrow is what keeps the two handles from overlapping in the middle.
  const strapMat = plainMat
  ;[-0.48, 0.48].forEach((x) => {
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.05, 12, 32, Math.PI), strapMat)
    strap.position.set(x, h / 2, 0)
    group.add(strap)
  })

  return group
}

function buildBox(frontMat, plainMat) {
  const group = new THREE.Group()
  const w = 2.2
  const h = 1.6
  const d = 1.5
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [plainMat, plainMat, plainMat, plainMat, frontMat, plainMat])
  group.add(body)

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)),
    new THREE.LineBasicMaterial({ color: 0x000000, opacity: 0.12, transparent: true })
  )
  group.add(edges)

  return group
}

export default function Mockup3D({ trace, name, palette, font }) {
  const mountRef = useRef(null)
  const stateRef = useRef(null)
  const [item, setItem] = useState('mug')
  const [autoRotate, setAutoRotate] = useState(true)

  // Scene setup: once per mount.
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return undefined

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
    camera.position.set(2.6, 1.6, 3.4)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    mount.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.enablePan = false
    controls.minDistance = 2.2
    controls.maxDistance = 6
    controls.autoRotate = true
    controls.autoRotateSpeed = 2.2

    scene.add(new THREE.HemisphereLight(0xffffff, 0x555566, 1.1))
    const key = new THREE.DirectionalLight(0xffffff, 1.4)
    key.position.set(3, 4, 3)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0xffffff, 0.4)
    fill.position.set(-3, 1, -2)
    scene.add(fill)

    const group = new THREE.Group()
    scene.add(group)

    const resize = () => {
      const w = mount.clientWidth
      const h = mount.clientHeight
      if (!w || !h) return
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(mount)

    let raf = 0
    const tick = () => {
      controls.update()
      renderer.render(scene, camera)
      raf = requestAnimationFrame(tick)
    }
    tick()

    stateRef.current = { scene, camera, renderer, controls, group, ro }

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      controls.dispose()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
      stateRef.current = null
    }
  }, [])

  // Rebuild the mesh + texture whenever the brand or the chosen item changes.
  useEffect(() => {
    const s = stateRef.current
    if (!s || !trace) return undefined

    while (s.group.children.length) {
      const child = s.group.children.pop()
      child.traverse?.((o) => {
        o.geometry?.dispose?.()
        if (Array.isArray(o.material)) o.material.forEach((m) => { m.map?.dispose(); m.dispose() })
        else if (o.material) { o.material.map?.dispose(); o.material.dispose() }
      })
    }

    const paper = palette[palette.length - 1]
    const wrapCanvas = renderBrandTexture({ trace, name, palette, font, width: 1024, height: 512, style: item === 'mug' ? 'wrap' : 'center' })
    const texture = new THREE.CanvasTexture(wrapCanvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = THREE.RepeatWrapping
    texture.needsUpdate = true

    const sideMat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.5, metalness: 0.05 })
    const plainMat = new THREE.MeshStandardMaterial({ color: paper, roughness: 0.85, metalness: 0 })

    let mesh
    if (item === 'mug') mesh = buildMug(sideMat, plainMat)
    else if (item === 'tote') mesh = buildTote(sideMat, plainMat)
    else mesh = buildBox(sideMat, plainMat)

    s.group.add(mesh)
    return undefined
  }, [trace, name, palette, font, item])

  useEffect(() => {
    const s = stateRef.current
    if (s) s.controls.autoRotate = autoRotate
  }, [autoRotate])

  const saveSnapshot = () => {
    const s = stateRef.current
    if (!s) return
    s.renderer.render(s.scene, s.camera)
    s.renderer.domElement.toBlob((blob) => {
      if (blob) downloadBlob(blob, `${(name || 'brand').toLowerCase().replace(/\s+/g, '-')}-${item}-mockup.png`)
    }, 'image/png')
  }

  return (
    <div className="mk3d">
      <div className="mk3d-toolbar">
        <div className="suite-tabs mk3d-items">
          {ITEMS.map((i) => (
            <button
              key={i.id}
              type="button"
              className={i.id === item ? 'suite-tab mk3d-item-active' : 'suite-tab'}
              onClick={() => setItem(i.id)}
            >
              {i.label}
            </button>
          ))}
        </div>
        <div className="mk3d-actions">
          <label className="mk3d-spin">
            <input type="checkbox" checked={autoRotate} onChange={(e) => setAutoRotate(e.target.checked)} />
            Spin
          </label>
          <button type="button" className="settings-btn settings-btn-primary" onClick={saveSnapshot}>
            <DownloadIcon size={15} color="currentColor" />
            Save PNG
          </button>
        </div>
      </div>
      <div className="mk3d-stage" ref={mountRef} />
      <p className="mk3d-hint">Drag to rotate, scroll to zoom.</p>
    </div>
  )
}
