import { useApp } from '../context/AppContext'
import CinematicHero from './CinematicHero'
import AppHomePage from '../pages/AppHomePage'

/** Signed-out visitors see the cinematic showcase; signed-in users land in the app dashboard. */
export default function HomeRouter() {
  const { currentUser } = useApp()
  return currentUser ? <AppHomePage /> : <CinematicHero />
}
