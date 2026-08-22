const BULLETS = ['Free to browse', 'Real creators, real files', 'Cancel anytime', 'AI Studio included']

const PREVIEW_IMAGES = ['/images/t1.jpg', '/images/t2.jpg', '/images/t3.jpg', '/images/t4.jpg']

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-bg-dark" />
      <div className="hero-bg-wave" />
      <div className="hero-bg-fade" />

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
