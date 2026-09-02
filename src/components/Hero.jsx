import { Link } from 'react-router-dom'

const BULLETS = ['Free to browse', 'Real creators, real files', 'Cancel anytime', 'AI Studio included']

const LEFT_CARDS = [
  { image: '/images/t6.jpg', style: { top: '4%', left: '3%', width: '10.5vw', maxWidth: 132, aspectRatio: '4 / 5' } },
  { image: '/images/a2.jpg', style: { top: '2%', left: '17%', width: '8.5vw', maxWidth: 108, aspectRatio: '1 / 1' } },
  { image: '/images/t5.jpg', style: { top: '40%', left: '9%', width: '9vw', maxWidth: 116, aspectRatio: '3 / 4' } },
  { image: '/images/t7.jpg', style: { top: '68%', left: '4%', width: '11vw', maxWidth: 142, aspectRatio: '5 / 4' } },
  { image: '/images/a4.jpg', style: { top: '66%', left: '20%', width: '7.5vw', maxWidth: 96, aspectRatio: '1 / 1' } },
]

const RIGHT_CARDS = [
  { image: '/images/t9.jpg', style: { top: '3%', right: '17%', width: '9vw', maxWidth: 112, aspectRatio: '1 / 1' } },
  { image: '/images/t3.jpg', style: { top: '3%', right: '3%', width: '10.5vw', maxWidth: 132, aspectRatio: '4 / 5' } },
  { image: '/images/a1.jpg', style: { top: '42%', right: '10%', width: '8.5vw', maxWidth: 112, aspectRatio: '1 / 1' } },
  { image: '/images/t8.jpg', style: { top: '68%', right: '18%', width: '9vw', maxWidth: 116, aspectRatio: '4 / 5' } },
  { image: '/images/t4.jpg', style: { top: '66%', right: '3%', width: '11vw', maxWidth: 142, aspectRatio: '5 / 4' } },
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
