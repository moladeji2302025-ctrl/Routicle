import { FEED_ITEMS } from './feedItems'

const LOCATIONS = ['Lagos, Nigeria', 'Abuja, Nigeria', 'Port Harcourt, Nigeria', 'Ibadan, Nigeria', 'Enugu, Nigeria']

const SPECIALTIES = {
  'graphic-design': 'Graphic Designer',
  'motion-graphics': 'Motion Designer',
  illustration: 'Illustrator',
  'ai-images': 'AI Image Artist',
  'ai-video': 'AI Video Artist',
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

const seen = new Map()
FEED_ITEMS.forEach((item) => {
  if (!seen.has(item.creator)) {
    const specialty = SPECIALTIES[item.department] || 'Creative'
    seen.set(item.creator, {
      id: slugify(item.creator),
      name: item.creator,
      avatar: item.avatar,
      specialty,
      location: LOCATIONS[seen.size % LOCATIONS.length],
      bio: `${item.creator.split(' ')[0]} is a ${specialty.toLowerCase()} sharing finished work that never got used, non-exclusively, with subscribers on Routicle.`,
      social: { instagram: '#', linkedin: '#', website: '#' },
    })
  }
})

export const CREATORS = Array.from(seen.values())

export const getCreatorById = (id) => CREATORS.find((c) => c.id === id)
export const getCreatorByName = (name) => CREATORS.find((c) => c.name === name)
