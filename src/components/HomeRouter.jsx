import { useApp } from '../context/AppContext'
import HomePage from '../pages/HomePage'
import AppHomePage from '../pages/AppHomePage'

/** Signed-out visitors see the marketing homepage; signed-in users land in the app dashboard. */
export default function HomeRouter() {
  const { currentUser } = useApp()
  return currentUser ? <AppHomePage /> : <HomePage />
}
