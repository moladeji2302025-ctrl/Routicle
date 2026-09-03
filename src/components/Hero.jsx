import { Link } from 'react-router-dom'

const BULLETS = ['Free to browse', 'Real creators, real files', 'Cancel anytime', 'AI Studio included']

const LEFT_CARDS = [
  { image: '/images/t6.jpg', style: { top: '8%', left: '6%', width: '12vw', maxWidth: 160, aspectRatio: '4 / 5' } },
  { image: '/images/t5.jpg', style: { top: '58%', left: '2%', width: '10vw', maxWidth: 132, aspectRatio: '1 / 1' } },
]

const RIGHT_CARDS = [
  { image: '/images/t3.jpg', style: { top: '8%', right: '6%', width: '12vw', maxWidth: 160, aspectRatio: '4 / 5' } },
  { image: '/images/t9.jpg', style: { top: '58%', right: '2%', width: '10vw', maxWidth: 132, aspectRatio: '1 / 1' } },
]

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-cards hero-cards-left">
        {LEFT_CARDS.map((card) => (
          <div key={card.image} className="hero-mini-card" style={card.style}>
            <img src={card.image} alt="" />
          </div>
        ))}
      </div>
      <div className="hero-cards hero-cards-right">
        {RIGHT_CARDS.map((card) => (
          <div key={card.image} className="hero-mini-card" style={card.style}>
            <img src={card.image} alt="" />
          </div>
        ))}
      </div>

      <div className="hero-content">
        <h1 className="hero-title">
          Real Creative Work
          <br />
          <span className="hero-accent">Is On Routicle</span>
        </h1>

        <p className="hero-subtitle">
          Upload finished designs and video you never got to use. Subscribers download the files,
          you get paid every month — non-exclusive, no strings attached.
        </p>

        <div className="hero-cta-row">
          <Link to="/explore" className="btn-hero-primary">Browse the library</Link>
          <Link to="/become-creator" className="btn-hero-secondary">Become a Creator</Link>
        </div>

        <p className="hero-bullets">{BULLETS.join(' · ')}</p>
      </div>
    </section>
  )
}
