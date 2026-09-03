function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

const RAW = [
  {
    image: '/images/showcase/solitude.jpg',
    title: 'Solitude',
    creatorName: 'Shawn Garcia',
    specialty: 'Graphic Designer',
    bio: 'Shawn makes cover art and title cards for music and podcast creators — moody, typographic, built to be reused.',
  },
  {
    image: '/images/showcase/modern-ocean.jpg',
    title: 'R&B, Vol. 12',
    creatorName: 'Shawn Garcia',
    specialty: 'Graphic Designer',
    bio: 'Shawn makes cover art and title cards for music and podcast creators — moody, typographic, built to be reused.',
  },
  {
    image: '/images/showcase/song-cover.jpg',
    title: 'Stay Alive — Song Cover',
    creatorName: 'Kim',
    specialty: 'Graphic Designer',
    bio: 'Kim designs single and playlist cover art — clean serif type over full-bleed photography.',
  },
  {
    image: '/images/showcase/weekly-podcast.jpg',
    title: 'Weekly Music Podcast',
    creatorName: 'Daniel Gallego',
    specialty: 'Motion Designer',
    bio: 'Daniel builds recurring show art and title sequences for weekly podcast and video series.',
  },
  {
    image: '/images/showcase/minimalist-movie.jpg',
    title: 'We Become Strangers Again',
    creatorName: 'Harper Russo',
    specialty: 'Motion Designer',
    bio: 'Harper produces and edits short-film title sequences — atmospheric, credit-forward, cinematic.',
  },
  {
    image: '/images/showcase/bold-dreams.jpg',
    title: 'Dream — Dare to Dream Big',
    creatorName: 'Noor Haddad',
    specialty: 'Graphic Designer',
    bio: 'Noor designs bold, type-first motivational and lifestyle thumbnails.',
  },
  {
    image: '/images/showcase/forget-me-not.jpg',
    title: 'Forget Me Not — R&B Playlist',
    creatorName: 'Isla Moreau',
    specialty: 'Graphic Designer',
    bio: 'Isla designs playlist and mood-board cover art with a soft, editorial feel.',
  },
  {
    image: '/images/showcase/cinematic-vlog.jpg',
    title: 'R&B Playlist, Vol. 12',
    creatorName: 'Mateus Alencar',
    specialty: 'Illustrator',
    bio: 'Mateus creates vlog and playlist branding — warm, cinematic, tuned for YouTube.',
  },
  {
    image: '/images/showcase/calm-ocean.jpg',
    title: 'Summer Music — Relaxing Playlist',
    creatorName: 'Theo Marchetti',
    specialty: 'Graphic Designer',
    bio: 'Theo designs calm, photo-led thumbnails for ambient and relaxation channels.',
  },
]

export const SHOWCASE_HERO = RAW.map((item, i) => ({
  id: i + 1,
  creatorId: slugify(item.creatorName),
  ...item,
}))
