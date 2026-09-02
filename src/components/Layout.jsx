import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import { useApp } from '../context/AppContext'

export default function Layout() {
  const { pendingIntentRedirect, clearPendingIntentRedirect } = useApp()
  const navigate = useNavigate()

  // Fires once after a brand-new "I'm here to sell" signup completes via the Google
  // redirect flow, where the page that started it has already unmounted.
  useEffect(() => {
    if (pendingIntentRedirect === 'become-creator') {
      clearPendingIntentRedirect()
      navigate('/become-creator')
    }
  }, [pendingIntentRedirect, clearPendingIntentRedirect, navigate])

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
