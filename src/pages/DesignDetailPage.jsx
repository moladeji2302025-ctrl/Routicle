import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { getCreatorByName } from '../data/creators'
import { evaluateDownload, requiredTier, TIERS } from '../data/pricing'
import { HeartIcon, EyeIcon, PlayIcon } from '../components/icons'
import { formatCount } from '../utils/format'
import { requestDownload, triggerFileDownload } from '../lib/api'

export default function DesignDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { contentItems, currentUser, toggleAppreciate, purchaseDownload } = useApp()
  const [copied, setCopied] = useState(false)
  const [justDownloaded, setJustDownloaded] = useState(false)

  const item = contentItems.find((it) => String(it.id) === id)

  if (!item) {
    return (
      <div className="detail-page detail-not-found">
        <h1>Design not found</h1>
        <p>This item may have been removed.</p>
        <Link to="/" className="btn-hero-primary">Back to Routicle</Link>
      </div>
    )
  }

  const creator = getCreatorByName(item.creator)
  const tier = requiredTier(item)
  const decision = evaluateDownload(item, currentUser)
  const appreciated = currentUser?.appreciatedItemIds.includes(item.id)

  function handleShare() {
    const url = window.location.href
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => {})
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function deliverRealFiles() {
    if (!item.isLive || !item.sourceObjectKeys?.length) return
    try {
      const { files } = await requestDownload(item.id, currentUser.email)
      files.forEach((file) => triggerFileDownload(file.url, file.label))
    } catch (err) {
      console.error('download failed', err)
    }
  }

  async function handleDownloadClick() {
    if (decision.state === 'signed-out') {
      navigate('/signup')
      return
    }
    if (decision.state === 'paywall' || decision.state === 'upgrade-required') {
      navigate('/pricing')
      return
    }
    if (decision.state === 'pay-per-download') {
      purchaseDownload(item.id)
      setJustDownloaded(true)
      await deliverRealFiles()
      setTimeout(() => setJustDownloaded(false), 2500)
      return
    }
    // free-download, subscriber-download, owned
    setJustDownloaded(true)
    await deliverRealFiles()
    setTimeout(() => setJustDownloaded(false), 2500)
  }

  function downloadLabel() {
    if (justDownloaded) return 'Downloading…'
    switch (decision.state) {
      case 'signed-out':
        return 'Sign up to download'
      case 'paywall':
        return `Unlock with ${TIERS[decision.tier].label}`
      case 'upgrade-required':
        return `Upgrade to ${TIERS[decision.tier].label}`
      case 'pay-per-download':
        return `Download — $${decision.price.toFixed(2)}`
      case 'owned':
        return 'Download again'
      case 'free-download':
      case 'subscriber-download':
      default:
        return 'Download'
    }
  }

  return (
    <div className="detail-page">
      <div className="detail-preview">
        <img src={item.image} alt={item.title} className="detail-preview-image" />
        {!item.free && <div className="detail-watermark" />}
        {item.hasVideo && (
          <div className="detail-play-badge">
            <PlayIcon size={16} color="white" />
          </div>
        )}
      </div>

      <div className="detail-info">
        <div className="detail-tags-row">
          <span className="tag tag-department">{item.department.replace('-', ' ')}</span>
          {item.free && <span className="tag tag-free">Free</span>}
          <span className="tag tag-tier">{TIERS[tier].label} tier</span>
        </div>

        <h1 className="detail-title">{item.title}</h1>

        <Link to={creator ? `/creator/${creator.id}` : '#'} className="detail-creator">
          <img src={item.avatar} alt={item.creator} className="detail-creator-avatar" />
          <div>
            <div className="detail-creator-name">{item.creator}</div>
            {creator && <div className="detail-creator-specialty">{creator.specialty}</div>}
          </div>
        </Link>

        <p className="detail-description">
          A {TIERS[tier].label.toLowerCase()}-tier {item.department.replace('-', ' ')} piece
          {item.fileTypes.length > 0 ? ` — includes ${item.fileTypes.join(', ')} source files.` : '.'}
        </p>

        {item.behindTheDesign && (
          <div className="detail-behind">
            <h3>Behind the Design</h3>
            <p>{item.behindTheDesign}</p>
          </div>
        )}

        <div className="detail-actions">
          <button
            type="button"
            className={appreciated ? 'detail-appreciate detail-appreciate-active' : 'detail-appreciate'}
            onClick={() => (currentUser ? toggleAppreciate(item.id) : navigate('/signup'))}
          >
            <HeartIcon size={15} color="currentColor" />
            {formatCount(item.appreciations)}
          </button>
          <span className="detail-views">
            <EyeIcon size={15} color="currentColor" />
            {formatCount(item.views)}
          </span>
          <button type="button" className="detail-share" onClick={handleShare}>
            {copied ? 'Link copied' : 'Share'}
          </button>
        </div>

        {item.fileTypes.length > 0 && (
          <div className="detail-filetypes">
            {item.fileTypes.map((ft) => (
              <span key={ft} className="filetype-badge">{ft}</span>
            ))}
          </div>
        )}

        <button type="button" className="detail-download-btn" onClick={handleDownloadClick}>
          {downloadLabel()}
        </button>

        <p className="detail-license">
          Non-exclusive license. This creator keeps every right to their work and may sell or post it elsewhere too.
        </p>
      </div>
    </div>
  )
}
