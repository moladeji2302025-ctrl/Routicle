import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { departmentLabel } from '../data/departments'

export default function AdminModerationPage() {
  const { currentUser, pendingSubmissions, contentItems, moderateSubmission, markItemFree } = useApp()
  const navigate = useNavigate()

  if (!currentUser?.isAdmin) {
    return (
      <div className="dashboard-page dashboard-gate">
        <h1>Admins only</h1>
        <p>Grant yourself admin from the Account page's demo controls to preview this screen.</p>
        <button type="button" className="btn-hero-secondary" onClick={() => navigate('/account')}>Go to Account</button>
      </div>
    )
  }

  const approved = contentItems.filter((item) => item.moderationStatus === 'approved')

  return (
    <div className="dashboard-page">
      <h1>Moderation queue</h1>
      <p className="dashboard-subtitle">Platform-wide visibility — admin only.</p>

      <div className="dashboard-panel">
        <h3>Pending submissions ({pendingSubmissions.length})</h3>
        {pendingSubmissions.length === 0 && <p className="explore-empty">Nothing waiting on review.</p>}
        {pendingSubmissions.map((submission) => (
          <div key={submission.id} className="admin-row">
            <div>
              <div className="dashboard-piece-title">{submission.title}</div>
              <div className="dashboard-piece-meta">
                {submission.creatorName} · {departmentLabel(submission.department)} · {(submission.fileTypes || []).join(', ') || 'AI-generated'}
              </div>
            </div>
            <div className="admin-actions">
              <button type="button" className="btn-hero-primary" onClick={() => moderateSubmission(submission.id, 'approve')}>Approve</button>
              <button type="button" className="btn-hero-secondary" onClick={() => moderateSubmission(submission.id, 'reject')}>Reject</button>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-panel">
        <h3>Mark items as platform-free</h3>
        {approved.map((item) => (
          <div key={item.id} className="admin-row">
            <div>
              <div className="dashboard-piece-title">{item.title}</div>
              <div className="dashboard-piece-meta">{item.creator}</div>
            </div>
            <label className="explore-checkbox">
              <input type="checkbox" checked={item.free} onChange={(e) => markItemFree(item.id, e.target.checked)} />
              Free download
            </label>
          </div>
        ))}
      </div>
    </div>
  )
}
