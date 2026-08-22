import Reveal from './Reveal'

const COLUMNS = [
  {
    heading: 'Product',
    links: ['Explore', 'AI Studio', 'Pricing', 'Become a Creator'],
  },
  {
    heading: 'Company',
    links: ['About', 'Careers', 'Brand', 'Contact', 'Blog'],
  },
  {
    heading: 'Resources',
    links: ['Help Center', 'Terms of Service', 'Privacy Policy', 'Support'],
  },
  {
    heading: 'Connect',
    links: ['X (Twitter)', 'Instagram', 'LinkedIn', 'YouTube'],
  },
]

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-content">
        <div className="footer-grid">
          <div className="footer-brand">
            <img src="/brand/routicle-wordmark-black.svg" alt="Routicle" className="footer-logo" />
          </div>

          {COLUMNS.map((col) => (
            <div key={col.heading} className="footer-col">
              <h4 className="footer-col-heading">{col.heading}</h4>
              {col.links.map((link) => (
                <a key={link} href="#" className="footer-link">{link}</a>
              ))}
            </div>
          ))}
        </div>

        <p className="footer-copyright">© 2026 Routicle, Inc. All rights reserved.</p>
      </div>

      <Reveal as="div" className="footer-wordmark" delay={0}>
        <span aria-hidden="true">Routicle</span>
      </Reveal>
    </footer>
  )
}
