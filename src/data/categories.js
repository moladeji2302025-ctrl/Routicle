export const CATEGORIES = [
  { id: 'graphic-design', label: 'Graphic Design' },
  { id: 'motion-graphics', label: 'Motion Graphics' },
  { id: 'illustration', label: 'Illustration' },
  { id: 'ai-images', label: 'AI-Generated Images' },
  { id: 'ai-video', label: 'AI-Generated Video' },
]

/** Falls back to the id, then to a blank — never to undefined, which callers
 *  went on to call string methods on. */
export const categoryLabel = (id) => CATEGORIES.find((c) => c.id === id)?.label ?? id ?? ''
