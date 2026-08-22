const NAV_LINKS = ['Explore', 'Departments', 'Pricing', 'AI Studio', 'Become a Creator', 'FAQ']

export default function Navbar() {
  return (
    <div className="navbar">
      <div className="navbar-row">
        <a href="#" className="logo">
          <img src="/brand/routicle-mark-black.svg" alt="" className="logo-icon" />
          Routicle
        </a>

        <nav className="navbar-links">
          {NAV_LINKS.map((link) => (
            <a key={link} href="#" className="link-muted">{link}</a>
          ))}
        </nav>

        <div className="navbar-spacer" />

        <a href="#" className="btn-solid">Sign up</a>
      </div>
    </div>
  )
}
