import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { FEED_ITEMS } from '../data/feedItems'
import { TIERS } from '../data/pricing'

const STORAGE_KEY = 'routicle_mock_state_v1'

const AppContext = createContext(null)

function loadInitialState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // ignore corrupt/blocked storage, fall through to defaults
  }
  return {
    currentUser: null,
    contentItems: FEED_ITEMS.map((item) => ({ ...item, moderationStatus: 'approved' })),
    pendingSubmissions: [],
  }
}

function makeReferralCode(name) {
  const base = name.split(' ')[0]?.toUpperCase().slice(0, 6) || 'CREATOR'
  return `${base}${Math.floor(100 + Math.random() * 900)}`
}

function newUser({ name, email, intent }) {
  return {
    id: `user-${Date.now()}`,
    name,
    email,
    signupIntent: intent || 'browse',
    role: 'free',
    billingMode: 'monthly',
    billingCadence: 'monthly',
    isCreator: false,
    isAdmin: false,
    credits: { image: 0, video: 0 },
    savedItemIds: [],
    followingCreatorIds: [],
    appreciatedItemIds: [],
    purchasedItemIds: [],
    generationHistory: { image: [], video: [] },
    referralCode: makeReferralCode(name),
    referralCount: 0,
    referralEarnings: 0,
    earningsThisMonth: 0,
    allTimeEarnings: 0,
    payoutHistory: [],
    payoutMethod: null,
    bio: '',
    social: { instagram: '', linkedin: '', website: '' },
  }
}

export function AppProvider({ children }) {
  const [state, setState] = useState(loadInitialState)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // storage full/blocked — degrade silently, session state still works in-memory
    }
  }, [state])

  const actions = useMemo(() => {
    const updateUser = (updater) => {
      setState((prev) => {
        if (!prev.currentUser) return prev
        return { ...prev, currentUser: updater(prev.currentUser) }
      })
    }

    return {
      signUp({ name, email, intent }) {
        setState((prev) => ({ ...prev, currentUser: newUser({ name, email, intent }) }))
      },

      signIn({ email }) {
        setState((prev) => {
          if (prev.currentUser && prev.currentUser.email === email) return prev
          return { ...prev, currentUser: newUser({ name: email.split('@')[0], email, intent: 'browse' }) }
        })
      },

      signOut() {
        setState((prev) => ({ ...prev, currentUser: null }))
      },

      subscribe({ tier, billingMode, cadence }) {
        const plan = TIERS[tier]
        updateUser((user) => ({
          ...user,
          role: tier,
          billingMode,
          billingCadence: cadence,
          credits:
            billingMode === 'payPerDownload'
              ? user.credits
              : { image: plan.imageCredits || 0, video: plan.videoCredits || 0 },
        }))
      },

      cancelSubscription() {
        updateUser((user) => ({ ...user, role: 'free', billingMode: 'monthly' }))
      },

      toggleAppreciate(itemId) {
        setState((prev) => {
          if (!prev.currentUser) return prev
          const has = prev.currentUser.appreciatedItemIds.includes(itemId)
          const appreciatedItemIds = has
            ? prev.currentUser.appreciatedItemIds.filter((id) => id !== itemId)
            : [...prev.currentUser.appreciatedItemIds, itemId]
          const contentItems = prev.contentItems.map((item) =>
            item.id === itemId ? { ...item, appreciations: item.appreciations + (has ? -1 : 1) } : item
          )
          return { ...prev, currentUser: { ...prev.currentUser, appreciatedItemIds }, contentItems }
        })
      },

      toggleSave(itemId) {
        updateUser((user) => {
          const has = user.savedItemIds.includes(itemId)
          return {
            ...user,
            savedItemIds: has ? user.savedItemIds.filter((id) => id !== itemId) : [...user.savedItemIds, itemId],
          }
        })
      },

      toggleFollow(creatorId) {
        updateUser((user) => {
          const has = user.followingCreatorIds.includes(creatorId)
          return {
            ...user,
            followingCreatorIds: has
              ? user.followingCreatorIds.filter((id) => id !== creatorId)
              : [...user.followingCreatorIds, creatorId],
          }
        })
      },

      purchaseDownload(itemId) {
        updateUser((user) => ({ ...user, purchasedItemIds: [...user.purchasedItemIds, itemId] }))
      },

      generateImage(prompt) {
        let ok = false
        updateUser((user) => {
          if (user.credits.image <= 0) return user
          ok = true
          const result = { id: `gen-${Date.now()}`, prompt, createdAt: Date.now(), type: 'image' }
          return {
            ...user,
            credits: { ...user.credits, image: user.credits.image - 1 },
            generationHistory: { ...user.generationHistory, image: [result, ...user.generationHistory.image] },
          }
        })
        return ok
      },

      upscaleImage(genId) {
        let ok = false
        updateUser((user) => {
          if (user.credits.image <= 0) return user
          ok = true
          return { ...user, credits: { ...user.credits, image: user.credits.image - 1 } }
        })
        return ok
      },

      generateVideo(prompt, seconds = 5) {
        let ok = false
        updateUser((user) => {
          if (user.role !== 'express' || user.credits.video < seconds) return user
          ok = true
          const result = { id: `gen-${Date.now()}`, prompt, seconds, createdAt: Date.now(), type: 'video' }
          return {
            ...user,
            credits: { ...user.credits, video: user.credits.video - seconds },
            generationHistory: { ...user.generationHistory, video: [result, ...user.generationHistory.video] },
          }
        })
        return ok
      },

      applyAsCreator(data) {
        updateUser((user) => ({
          ...user,
          isCreator: true,
          bio: data.bio || user.bio,
          social: { ...user.social, ...data.social },
          payoutMethod: data.payoutMethod || user.payoutMethod,
        }))
      },

      submitUpload(data) {
        setState((prev) => {
          if (!prev.currentUser) return prev
          const submission = {
            id: `pending-${Date.now()}`,
            creatorId: prev.currentUser.id,
            creatorName: prev.currentUser.name,
            submittedAt: Date.now(),
            status: 'pending',
            ...data,
          }
          return { ...prev, pendingSubmissions: [submission, ...prev.pendingSubmissions] }
        })
      },

      moderateSubmission(submissionId, action) {
        setState((prev) => {
          const submission = prev.pendingSubmissions.find((s) => s.id === submissionId)
          if (!submission) return prev
          const pendingSubmissions = prev.pendingSubmissions.filter((s) => s.id !== submissionId)
          if (action !== 'approve') {
            return { ...prev, pendingSubmissions }
          }
          const approvedItem = {
            id: Date.now(),
            image: submission.thumbnail || '/images/t1.jpg',
            avatar: '/images/a1.jpg',
            title: submission.title,
            creator: submission.creatorName,
            department: submission.department,
            appreciations: 0,
            views: 0,
            fileTypes: submission.fileTypes || [],
            free: false,
            hasVideo: (submission.fileTypes || []).some((f) => ['AEP', 'PPRO'].includes(f)),
            moderationStatus: 'approved',
            behindTheDesign: submission.behindTheDesign || '',
          }
          return {
            ...prev,
            pendingSubmissions,
            contentItems: [approvedItem, ...prev.contentItems],
          }
        })
      },

      markItemFree(itemId, isFree) {
        setState((prev) => ({
          ...prev,
          contentItems: prev.contentItems.map((item) => (item.id === itemId ? { ...item, free: isFree } : item)),
        }))
      },

      /** Prototype-only convenience: jump the current session into any role to demo gated screens. */
      devSetUser(partial) {
        updateUser((user) => ({ ...user, ...partial }))
      },
    }
  }, [])

  const value = useMemo(() => ({ ...state, ...actions }), [state, actions])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
