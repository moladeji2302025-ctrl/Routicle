import { useEffect, useRef } from 'react'

/**
 * The in-app cursor: a small dot that morphs into a diamond over anything
 * clickable.
 *
 * The morph keeps the same area rather than the same box. A circle of diameter
 * d has area πd²/4; a square of side s has area s². Setting them equal gives
 * s = d·√(π)/2 ≈ 0.886d, so the square is scaled to 0.886 as it rotates. Left
 * at scale 1 the diamond would carry ~27% more ink than the dot and read as a
 * lurch rather than a morph.
 *
 * Only ever enabled on a fine pointer, and never when the viewer has asked for
 * reduced motion — a cursor that lags its own pointer is the last thing that
 * should ignore that preference. The native cursor is hidden by a class this
 * component adds, so if it never mounts nothing is hidden and the pointer
 * behaves normally.
 */

const CLICKABLE =
  'a[href], button, [role="button"], [role="tab"], [role="menuitem"], summary, label[for], select, ' +
  '.app-nav-item, .resource-card, .app-ws-row, .me-icon-btn, .me-shape, .me-seg-btn, .app-rail-card, ' +
  '.app-tool-tile, .app-dept-card, .workspace-card, .cs-palette, .pricing-card'

// Text entry keeps the native caret: a dot sitting where an I-beam belongs
// hides which character you are about to land on.
const TEXT_INPUT = 'input:not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]), textarea, [contenteditable="true"]'

export default function AppCursor() {
  const dotRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const fine = window.matchMedia('(pointer: fine)')
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (!fine.matches || calm.matches) return

    const dot = dotRef.current
    if (!dot) return

    const root = document.documentElement
    root.classList.add('has-app-cursor')

    // Target is where the pointer is; current is where the dot is drawn. The
    // gap between them is the whole feel of the thing.
    let targetX = window.innerWidth / 2
    let targetY = window.innerHeight / 2
    let x = targetX
    let y = targetY
    let raf = 0
    let seen = false

    function frame() {
      // Critically damped enough to never overshoot the pointer, loose enough
      // to read as weight rather than as lag.
      x += (targetX - x) * 0.34
      y += (targetY - y) * 0.34
      dot.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    function onMove(e) {
      targetX = e.clientX
      targetY = e.clientY
      if (!seen) {
        // Jump to the pointer on the first move instead of gliding in from the
        // middle of the screen.
        seen = true
        x = targetX
        y = targetY
        dot.classList.add('app-cursor-on')
      }
      const el = e.target instanceof Element ? e.target : null
      const clickable = Boolean(el?.closest(CLICKABLE)) && !el?.closest('[disabled],[aria-disabled="true"]')
      const text = Boolean(el?.closest(TEXT_INPUT))
      dot.classList.toggle('app-cursor-diamond', clickable && !text)
      dot.classList.toggle('app-cursor-hidden', text)
      root.classList.toggle('app-cursor-text', text)
    }

    const onDown = () => dot.classList.add('app-cursor-down')
    const onUp = () => dot.classList.remove('app-cursor-down')
    const onLeave = () => dot.classList.remove('app-cursor-on')
    const onEnter = () => seen && dot.classList.add('app-cursor-on')

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })
    document.addEventListener('pointerleave', onLeave)
    document.addEventListener('pointerenter', onEnter)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointerleave', onLeave)
      document.removeEventListener('pointerenter', onEnter)
      root.classList.remove('has-app-cursor', 'app-cursor-text')
    }
  }, [])

  return (
    <div ref={dotRef} className="app-cursor" aria-hidden="true">
      <span className="app-cursor-shape" />
    </div>
  )
}
