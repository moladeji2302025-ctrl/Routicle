import { Navigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { LANDING_PAGES } from '../data/settings'
import HomePage from '../pages/HomePage'
import AppHomePage from '../pages/AppHomePage'

/**
 * Signed-out visitors see the marketing homepage; signed-in users land wherever
 * Settings > Browsing says they should — the dashboard by default.
 */
export default function HomeRouter() {
  const { currentUser, settings } = useApp()
  if (!currentUser) return <HomePage />

  const landing = LANDING_PAGES.find((p) => p.id === settings.browsing.landing)
  if (landing && landing.id !== 'home') return <Navigate to={landing.to} replace />

  return <AppHomePage />
}
