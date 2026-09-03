import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import AppShell from './AppShell'
import { useApp } from '../context/AppContext'

export default function Layout() {
  const { currentUser, pendingIntentRedirect, clearPendingIntentRedirect } = useApp()
  const navigate = useNavigate()
  const location = useLocation()

  // Fires once after a brand-new "I'm here to sell" signup completes via the Google
  // redirect flow, where the page that started it has already unmounted.
  useEffect(() => {
    if (pendingIntentRedirect === 'become-creator') {
      clearPendingIntentRedirect()
      navigate('/become-creator')
    }
  }, [pendingIntentRedirect, clearPendingIntentRedirect, navigate])

  // Signed-in users get the app shell (sidebar) across every route.
  if (currentUser) {
    return <AppShell />
  }

  // The signed-out landing page (CinematicHero, via HomeRouter) is a full-bleed,
  // self-contained experience with its own vertical nav — no marketing chrome wrapping it.
  if (location.pathname === '/') {
    return <Outlet />
  }

  // Every other signed-out page gets the marketing site's navbar/footer chrome.
  return (
    <div className="page">
      <Navbar />
      <main className="page-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
