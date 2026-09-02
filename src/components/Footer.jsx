import { Link } from 'react-router-dom'
import Reveal from './Reveal'

const COLUMNS = [
  {
    heading: 'Product',
    links: [
      { label: 'Explore', to: '/explore' },
      { label: 'AI Studio', to: '/studio/image' },
      { label: 'Pricing', to: '/pricing' },
      { label: 'Become a Creator', to: '/become-creator' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', to: '/about' },
      { label: 'Careers', to: '/careers' },
      { label: 'Brand', to: '/brand' },
      { label: 'Contact', to: '/contact' },
      { label: 'Blog', to: '/blog' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Help Center', to: '/help' },
      { label: 'Terms of Service', to: '/terms' },
      { label: 'Privacy Policy', to: '/privacy' },
      { label: 'Support', to: '/help' },
    ],
  },
  {
    // No real social accounts yet — kept as visible placeholders until there's something to link to.
    heading: 'Connect',
    links: [
      { label: 'X (Twitter)', to: '#' },
      { label: 'Instagram', to: '#' },
      { label: 'LinkedIn', to: '#' },
      { label: 'YouTube', to: '#' },
    ],
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
              {col.links.map((link) =>
                link.to === '#' ? (
                  <a key={link.label} href="#" className="footer-link" onClick={(e) => e.preventDefault()}>
                    {link.label}
                  </a>
                ) : (
                  <Link key={link.label} to={link.to} className="footer-link">{link.label}</Link>
                )
              )}
            </div>
          ))}
        </div>

        <p className="footer-copyright">© 2026 Routicle, Inc. All rights reserved.</p>
      </div>

      <Reveal as="div" className="footer-wordmark" delay={0}>
        <img src="/brand/routicle-wordmark-black.svg" alt="" aria-hidden="true" />
      </Reveal>
    </footer>
  )
}
