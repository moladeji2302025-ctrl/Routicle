import { useEffect, useState } from 'react'
import * as api from '../lib/api'

/**
 * The admin's maintenance-message switch, made real: when it's set, every
 * visitor sees it at the top of the page. Fetched once per load — this is a
 * notice, not something that needs to appear mid-session.
 */
export default function MaintenanceBanner() {
  const [message, setMessage] = useState('')

  useEffect(() => {
    let live = true
    api
      .fetchPublicSettings()
      .then(({ maintenanceMessage }) => live && setMessage(maintenanceMessage || ''))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [])

  if (!message) return null
  return (
    <div className="maint-banner" role="status">
      {message}
    </div>
  )
}
