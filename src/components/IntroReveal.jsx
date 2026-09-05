import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'

const OPEN_DELAY = 350
const OPEN_DURATION = 1100
const CLEANUP_DELAY = OPEN_DELAY + OPEN_DURATION + 150

export default function IntroReveal() {
  const { settings } = useApp()
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  const { introAnimation, reduceMotion } = settings.appearance

  useEffect(() => {
    const systemReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Settings > Appearance can switch this off outright; reduce-motion (either
    // the app's own setting or the OS's) suppresses it too.
    if (!introAnimation || reduceMotion || systemReducedMotion) {
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
  }, [introAnimation, reduceMotion])

  if (done) return null

  return (
    <div className={`intro-overlay${open ? ' intro-overlay-open' : ''}`}>
      <img src="/brand/routicle-mark-white.svg" alt="" className="intro-mark" />
    </div>
  )
}
