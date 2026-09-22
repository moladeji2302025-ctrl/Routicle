import { Link } from 'react-router-dom'
import { ChevronRightIcon } from './icons'

/** Back to the Creative Suite hub, then the current tool's name. */
export default function SuiteCrumb({ label }) {
  return (
    <div className="suite-crumbs">
      <Link to="/suite/creative">Creative Suite</Link>
      <ChevronRightIcon size={11} color="currentColor" />
      <span>{label}</span>
    </div>
  )
}
