export const SOFTWARE = [
  { name: 'Photoshop', icon: '/software/photoshop.svg' },
  { name: 'Illustrator', icon: '/software/illustrator.svg' },
  { name: 'Premiere Pro', icon: '/software/premiere-pro.svg' },
  { name: 'After Effects', icon: '/software/after-effects.svg' },
  { name: 'Canva', icon: '/software/canva.svg' },
  { name: 'Figma', icon: '/software/figma.svg' },
  { name: 'Blender', icon: '/software/blender.svg' },
  { name: 'Procreate', icon: '/software/procreate.svg' },
]

// Maps a software name to the fileType token used to filter the library (see CreatorUploadPage's
// FORMATS list). Blender/Procreate have no matching format in the data yet.
export const FILE_TYPE_BY_SOFTWARE = {
  Photoshop: 'PSD',
  Illustrator: 'AI',
  'Premiere Pro': 'PPRO',
  'After Effects': 'AEP',
  Canva: 'Canva',
  Figma: 'Figma',
}

export const ART_STYLES = [
  { name: 'Minimalist', image: '/images/t2.jpg' },
  { name: 'Retro', image: '/images/t8.jpg' },
  { name: 'Cyberpunk', image: '/images/t3.jpg' },
  { name: 'Watercolor', image: '/images/t4.jpg' },
  { name: '3D Render', image: '/images/t9.jpg' },
  { name: 'Flat Design', image: '/images/t1.jpg' },
  { name: 'Hand-drawn', image: '/images/t6.jpg' },
  { name: 'Photorealistic', image: '/images/t5.jpg' },
]
