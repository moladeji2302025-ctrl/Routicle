import { useEffect, useState } from 'react'

const OPEN_DELAY = 350
const OPEN_DURATION = 1100
const CLEANUP_DELAY = OPEN_DELAY + OPEN_DURATION + 150

export default function IntroReveal() {
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reducedMotion) {
      setDone(true)
      return undefined
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const openTimer = setTimeout(() => setOpen(true), OPEN_DELAY)
    const doneTimer = setTimeout(() => {
      setDone(true)
      document.body.style.overflow = previousOverflow
    }, CLEANUP_DELAY)

    return () => {
      clearTimeout(openTimer)
      clearTimeout(doneTimer)
      document.body.style.overflow = previousOverflow
    }
  }, [])

  if (done) return null

  return (
    <div className={`intro-overlay${open ? ' intro-overlay-open' : ''}`}>
      <img src="/brand/routicle-mark-white.svg" alt="" className="intro-mark" />
    </div>
  )
}
