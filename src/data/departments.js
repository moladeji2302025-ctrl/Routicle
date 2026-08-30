export const DEPARTMENTS = [
  { id: 'graphic-design', label: 'Graphic Design' },
  { id: 'motion-graphics', label: 'Motion Graphics' },
  { id: 'illustration', label: 'Illustration' },
  { id: 'ai-images', label: 'AI-Generated Images' },
  { id: 'ai-video', label: 'AI-Generated Video' },
]

export const departmentLabel = (id) => DEPARTMENTS.find((d) => d.id === id)?.label ?? id
