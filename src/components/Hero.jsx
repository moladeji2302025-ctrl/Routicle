import { HeartIcon } from './icons'

const BULLETS = ['Free to browse', 'Real creators, real files', 'Cancel anytime', 'AI Studio included']

const PREVIEW_IMAGES = ['/images/t1.jpg', '/images/t2.jpg', '/images/t3.jpg', '/images/t4.jpg']

const LEFT_CARDS = [
  { image: '/images/t6.jpg', appreciations: 88, style: { top: '6%', left: '3%', width: '11vw', maxWidth: 140, aspectRatio: '4 / 5', transform: 'rotate(-3deg)' } },
  { image: '/images/t5.jpg', appreciations: 210, style: { top: '46%', left: '11%', width: '9vw', maxWidth: 118, aspectRatio: '1 / 1', transform: 'rotate(2deg)' } },
  { image: '/images/t7.jpg', appreciations: 156, style: { top: '74%', left: '2%', width: '9.5vw', maxWidth: 122, aspectRatio: '5 / 4', transform: 'rotate(-2deg)' } },
]

const RIGHT_CARDS = [
  { image: '/images/t9.jpg', appreciations: 190, style: { top: '5%', right: '3%', width: '11vw', maxWidth: 140, aspectRatio: '4 / 5', transform: 'rotate(3deg)' } },
  { image: '/images/t3.jpg', appreciations: 302, style: { top: '46%', right: '12%', width: '9vw', maxWidth: 118, aspectRatio: '1 / 1', transform: 'rotate(-2deg)' } },
  { image: '/images/t8.jpg', appreciations: 73, style: { top: '74%', right: '2%', width: '9.5vw', maxWidth: 122, aspectRatio: '5 / 4', transform: 'rotate(2deg)' } },
]

export default function Hero() {
  return (
    <section className="hero">
      <img src="/images/hero-bg.jpg" alt="" className="hero-bg-image" />
      <div className="hero-bg-fade" />

      <div className="hero-cards hero-cards-left">
        {LEFT_CARDS.map((card) => (
          <div key={card.image} className="hero-mini-card" style={card.style}>
            <img src={card.image} alt="" />
            <span className="hero-mini-card-stat">
              <HeartIcon size={10} color="currentColor" />
              {card.appreciations}
            </span>
          </div>
        ))}
      </div>
      <div className="hero-cards hero-cards-right">
        {RIGHT_CARDS.map((card) => (
          <div key={card.image} className="hero-mini-card" style={card.style}>
            <img src={card.image} alt="" />
            <span className="hero-mini-card-stat">
              <HeartIcon size={10} color="currentColor" />
              {card.appreciations}
            </span>
          </div>
        ))}
      </div>

      <div className="hero-content">
        <div className="hero-eyebrow">
          <img src="/brand/routicle-mark-violet.svg" alt="" className="hero-eyebrow-icon" />
          The subscriber-share creative library
        </div>

        <h1 className="hero-title">
          Your Unused Work
          <br />
          <span className="hero-accent">Is Worth Something</span>
        </h1>

        <p className="hero-subtitle">
          Upload finished designs and video you never got to use. Subscribers download the files,
          you get paid every month — non-exclusive, no strings attached.
        </p>

        <a href="#" className="btn-hero-primary">Browse the library</a>

        <p className="hero-bullets">{BULLETS.join(' · ')}</p>

        <div className="hero-app-frame">
          <div className="hero-app-bar">
            <img src="/brand/routicle-mark-black.svg" alt="" className="hero-app-bar-icon" />
            <span>routicle.app</span>
          </div>
          <div className="hero-app-grid">
            {PREVIEW_IMAGES.map((src) => (
              <img key={src} src={src} alt="" className="hero-app-grid-img" />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
