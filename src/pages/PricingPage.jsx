import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { TIERS } from '../data/pricing'

export default function PricingPage() {
  const { currentUser, subscribe, cancelSubscription } = useApp()
  const navigate = useNavigate()
  const [cadence, setCadence] = useState('monthly')
  const [billingMode, setBillingMode] = useState('monthly')

  function priceFor(tier) {
    if (tier.id === 'free') return 0
    return cadence === 'annual' ? tier.annual : tier.monthly
  }

  function handleChoose(tierId) {
    if (tierId === 'free') {
      if (currentUser) cancelSubscription()
      else navigate('/signup')
      return
    }
    if (!currentUser) {
      navigate('/signup')
      return
    }
    subscribe({ tier: tierId, billingMode, cadence })
  }

  return (
    <div className="pricing-page">
      <div className="pricing-header">
        <h1 className="pricing-title">Pricing that scales with what you need</h1>
        <p className="pricing-subtitle">
          Browse for free, forever. Subscribe when you need the real files or the AI Studio.
        </p>

        <div className="pricing-toggles">
          <div className="pricing-toggle">
            <button
              type="button"
              className={billingMode === 'monthly' ? 'pricing-toggle-btn active' : 'pricing-toggle-btn'}
              onClick={() => setBillingMode('monthly')}
            >
              Monthly subscription
            </button>
            <button
              type="button"
              className={billingMode === 'payPerDownload' ? 'pricing-toggle-btn active' : 'pricing-toggle-btn'}
              onClick={() => setBillingMode('payPerDownload')}
            >
              Pay-per-download
            </button>
          </div>

          {billingMode === 'monthly' && (
            <div className="pricing-toggle">
              <button
                type="button"
                className={cadence === 'monthly' ? 'pricing-toggle-btn active' : 'pricing-toggle-btn'}
                onClick={() => setCadence('monthly')}
              >
                Billed monthly
              </button>
              <button
                type="button"
                className={cadence === 'annual' ? 'pricing-toggle-btn active' : 'pricing-toggle-btn'}
                onClick={() => setCadence('annual')}
              >
                Billed annually <span className="pricing-discount-badge">25% off</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="pricing-grid">
        <div className="pricing-card">
          <span className="pricing-card-tier">Free</span>
          <div className="pricing-card-price">$0</div>
          <p className="pricing-card-desc">Full feed browsing, save to collections, watermarked previews.</p>
          <ul className="pricing-card-list">
            <li>Browse every upload</li>
            <li>Save designs to collections</li>
            <li>Download platform-marked-free items only</li>
          </ul>
          <button type="button" className="pricing-card-btn" onClick={() => handleChoose('free')}>
            {currentUser && currentUser.role === 'free' ? 'Current plan' : 'Continue free'}
          </button>
        </div>

        <div className="pricing-card pricing-card-featured">
          <span className="pricing-card-tier">Standard</span>
          <div className="pricing-card-price">
            ${priceFor(TIERS.standard)}
            {billingMode === 'monthly' && <span>/mo</span>}
          </div>
          {billingMode === 'payPerDownload' && <p className="pricing-card-ppd">or $1.50 per download</p>}
          <p className="pricing-card-desc">Canva, Illustrator, and Photoshop files, plus the AI Image Studio.</p>
          <ul className="pricing-card-list">
            <li>Everything in Free</li>
            <li>PSD, AI, Canva work files</li>
            <li>50 AI image generations / month</li>
          </ul>
          <button type="button" className="pricing-card-btn pricing-card-btn-primary" onClick={() => handleChoose('standard')}>
            {currentUser?.role === 'standard' ? 'Current plan' : 'Choose Standard'}
          </button>
        </div>

        <div className="pricing-card pricing-card-dark">
          <span className="pricing-card-tier">Express</span>
          <div className="pricing-card-price">
            ${priceFor(TIERS.express)}
            {billingMode === 'monthly' && <span>/mo</span>}
          </div>
          {billingMode === 'payPerDownload' && <p className="pricing-card-ppd">or $3.00 per download</p>}
          <p className="pricing-card-desc">Everything in Standard, plus motion files and the AI Video Studio.</p>
          <ul className="pricing-card-list">
            <li>Everything in Standard</li>
            <li>After Effects &amp; Premiere Pro files</li>
            <li>60 seconds of AI video / month</li>
          </ul>
          <button type="button" className="pricing-card-btn pricing-card-btn-light" onClick={() => handleChoose('express')}>
            {currentUser?.role === 'express' ? 'Current plan' : 'Choose Express'}
          </button>
        </div>
      </div>

      {billingMode === 'payPerDownload' && (
        <p className="pricing-note">AI generation is a subscription-only perk — it isn't available on pay-per-download.</p>
      )}
    </div>
  )
}
