import { useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import AppShell from './AppShell'
import { useApp } from '../context/AppContext'

export default function Layout() {
  const { currentUser, pendingIntentRedirect, clearPendingIntentRedirect } = useApp()
  const navigate = useNavigate()
  const location = useLocation()

  // A brand-new account goes through the welcome flow first. The flag is only
  // ever set on a profile created this session, so returning users are never
  // pulled into it.
  useEffect(() => {
    if (currentUser?.needsOnboarding && location.pathname !== '/welcome') {
      navigate('/welcome', { replace: true })
    }
  }, [currentUser?.needsOnboarding, location.pathname, navigate])

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

  // Every signed-out page, including the homepage, gets the marketing site's navbar/footer chrome.
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
