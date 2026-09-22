import { useState } from 'react'
import { PALETTE_PRESETS } from './logoPack'

/**
 * The Creative Suite is now several pages — Logo Maker, Palette Lab, Brand
 * Guide, Stationery, Featured Templates — rather than one long scroll, so
 * the brand someone is working on (the traced mark, its name, palette,
 * typeface, contact details) has to survive a route change between them.
 * Kept in localStorage rather than route state or a context: it's exactly
 * the kind of per-browser draft recentlyViewed and the sidebar's collapsed
 * state already use that mechanism for elsewhere in the app, and it means
 * leaving the suite and coming back doesn't lose the work either.
 *
 * The trace itself is small (a path string and a viewBox, not the source
 * image), so this stays well inside localStorage's size limits.
 */
const KEY = 'routicle_creative_draft'

const DEFAULT_DRAFT = {
  trace: null,
  name: '',
  tagline: '',
  palette: PALETTE_PRESETS[0].colors,
  font: 'Inter',
  contact: { person: '', title: '', phone: '', email: '', website: '', address: '' },
}

function read() {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || '{}')
    return { ...DEFAULT_DRAFT, ...stored, contact: { ...DEFAULT_DRAFT.contact, ...stored.contact } }
  } catch {
    return DEFAULT_DRAFT
  }
}

function write(draft) {
  try {
    localStorage.setItem(KEY, JSON.stringify(draft))
  } catch {
    // storage blocked or full: the page still works, it just won't carry
    // over to the next one
  }
}

/** [draft, patch] — patch(partial) merges into the draft and persists it, like setState. */
export function useCreativeDraft() {
  const [draft, setDraft] = useState(read)
  const patch = (partial) =>
    setDraft((prev) => {
      const next = typeof partial === 'function' ? partial(prev) : { ...prev, ...partial }
      write(next)
      return next
    })
  return [draft, patch]
}
