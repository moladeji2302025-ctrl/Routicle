import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { FEED_ITEMS } from '../data/feedItems'
import { TIERS } from '../data/pricing'
import * as api from '../lib/api'
import { authClient } from '../lib/authClient'

const STORAGE_KEY = 'routicle_mock_state_v1'
const PENDING_INTENT_KEY = 'routicle_pending_signup_intent'
const THEME_KEY = 'routicle_app_theme'

const AppContext = createContext(null)

function loadInitialTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // ignore
  }
  return 'dark'
}

function loadInitialState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { profiles: {}, pendingIntentRedirect: null, ...JSON.parse(raw) }
  } catch {
    // ignore corrupt/blocked storage, fall through to defaults
  }
  return {
    currentUser: null,
    profiles: {},
    pendingIntentRedirect: null,
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
  // Real, server-backed data — fetched fresh from Postgres/Object Storage rather than persisted locally.
  const [liveContentItems, setLiveContentItems] = useState([])
  const [livePendingSubmissions, setLivePendingSubmissions] = useState([])
  const [theme, setTheme] = useState(loadInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // ignore
    }
  }, [theme])

  // Mirrors `state` so stable action callbacks can read the latest currentUser without
  // being recreated every render (actions below intentionally have a narrow dependency list).
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // storage full/blocked — degrade silently, session state still works in-memory
    }
  }, [state])

  const refreshLiveContent = useCallback(() => {
    api.fetchApprovedContent().then(setLiveContentItems).catch((err) => console.error('fetchApprovedContent failed', err))
  }, [])

  const refreshPending = useCallback(() => {
    api
      .fetchPendingSubmissions()
      .then((rows) =>
        setLivePendingSubmissions(
          rows.map((row) => ({
            id: row.id,
            creatorId: row.creator_id,
            creatorName: row.creator_name,
            submittedAt: new Date(row.created_at).getTime(),
            status: row.moderation_status,
            title: row.title,
            department: row.department,
            fileTypes: row.file_types || [],
            behindTheDesign: row.behind_the_design || '',
            thumbnail: row.thumbnail_key,
          }))
        )
      )
      .catch((err) => console.error('fetchPendingSubmissions failed', err))
  }, [])

  useEffect(() => {
    refreshLiveContent()
    refreshPending()
  }, [refreshLiveContent, refreshPending])

  /**
   * Pulls the real Neon Auth session and merges it with this browser's locally-persisted
   * profile for that account (role/credits/saved items/etc. — still client-side prototype
   * state, just now keyed to a real, durable identity instead of a throwaway fake one).
   * Returns the signup intent that applied ('browse'/'sell'), so callers can route on it.
   */
  const hydrateFromSession = useCallback(async (intentOverride) => {
    const result = await authClient.getSession()
    const authUser = result.data?.user
    if (!authUser) return null

    const pendingIntent = intentOverride || sessionStorage.getItem(PENDING_INTENT_KEY) || null
    sessionStorage.removeItem(PENDING_INTENT_KEY)

    let isNewProfile = false
    setState((prev) => {
      const existing = prev.profiles[authUser.id]
      isNewProfile = !existing
      const base =
        existing ||
        newUser({ name: authUser.name || authUser.email.split('@')[0], email: authUser.email, intent: pendingIntent || 'browse' })
      const profile = {
        ...base,
        id: authUser.id,
        name: authUser.name || base.name,
        email: authUser.email || base.email,
        image: authUser.image || base.image || null,
      }
      return {
        ...prev,
        currentUser: profile,
        profiles: { ...prev.profiles, [authUser.id]: profile },
        pendingIntentRedirect: isNewProfile && pendingIntent === 'sell' ? 'become-creator' : prev.pendingIntentRedirect,
      }
    })
    return pendingIntent
  }, [])

  // Pick up an existing session on load, and after redirect-based OAuth flows return here.
  useEffect(() => {
    hydrateFromSession()
  }, [hydrateFromSession])

  const actions = useMemo(() => {
    const updateUser = (updater) => {
      setState((prev) => {
        if (!prev.currentUser) return prev
        const nextUser = updater(prev.currentUser)
        return { ...prev, currentUser: nextUser, profiles: { ...prev.profiles, [nextUser.id]: nextUser } }
      })
    }

    return {
      async signUpWithEmail({ name, email, password, intent }) {
        const result = await authClient.signUp.email({ name, email, password })
        if (result.error) throw new Error(result.error.message || 'Sign up failed')
        return hydrateFromSession(intent)
      },

      async signInWithEmail({ email, password }) {
        const result = await authClient.signIn.email({ email, password })
        if (result.error) throw new Error(result.error.message || 'Sign in failed')
        return hydrateFromSession()
      },

      /** Redirects to Google — the browser navigates away, so there's nothing to await here. */
      async signInWithGoogle(intent) {
        if (intent) sessionStorage.setItem(PENDING_INTENT_KEY, intent)
        await authClient.signIn.social({ provider: 'google', callbackURL: window.location.origin })
      },

      async signOut() {
        await authClient.signOut()
        setState((prev) => ({ ...prev, currentUser: null }))
      },

      clearPendingIntentRedirect() {
        setState((prev) => ({ ...prev, pendingIntentRedirect: null }))
      },

      toggleTheme() {
        setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
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
        let has = false
        setState((prev) => {
          if (!prev.currentUser) return prev
          has = prev.currentUser.appreciatedItemIds.includes(itemId)
          const appreciatedItemIds = has
            ? prev.currentUser.appreciatedItemIds.filter((id) => id !== itemId)
            : [...prev.currentUser.appreciatedItemIds, itemId]
          const contentItems = prev.contentItems.map((item) =>
            item.id === itemId ? { ...item, appreciations: item.appreciations + (has ? -1 : 1) } : item
          )
          return { ...prev, currentUser: { ...prev.currentUser, appreciatedItemIds }, contentItems }
        })
        setLiveContentItems((prev) =>
          prev.map((item) =>
            String(item.id) === String(itemId) ? { ...item, appreciations: item.appreciations + (has ? -1 : 1) } : item
          )
        )
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

      async applyAsCreator(data) {
        updateUser((user) => ({
          ...user,
          isCreator: true,
          bio: data.bio || user.bio,
          social: { ...user.social, ...data.social },
          payoutMethod: data.payoutMethod || user.payoutMethod,
        }))
        const user = stateRef.current.currentUser
        if (!user) return
        await api.upsertCreator({ name: user.name, email: user.email, bio: data.bio, social: data.social })
      },

      /** Uploads real files to Neon Object Storage and records the submission in Postgres. */
      async submitUpload(data) {
        const email = stateRef.current.currentUser?.email
        if (!email) throw new Error('Sign in first')
        await api.submitRealUpload({ creatorEmail: email, ...data })
        refreshPending()
      },

      async moderateSubmission(submissionId, action) {
        await api.moderateSubmission(submissionId, action)
        refreshPending()
        if (action === 'approve') refreshLiveContent()
      },

      markItemFree(itemId, isFree) {
        const isLiveItem = liveContentItems.some((item) => String(item.id) === String(itemId))
        if (isLiveItem) {
          api
            .markItemFreeRemote(itemId, isFree)
            .then(refreshLiveContent)
            .catch((err) => console.error('markItemFreeRemote failed', err))
          return
        }
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
  }, [liveContentItems, refreshLiveContent, refreshPending, hydrateFromSession])

  const mergedContentItems = useMemo(
    () => [...liveContentItems, ...state.contentItems],
    [liveContentItems, state.contentItems]
  )

  const value = useMemo(
    () => ({ ...state, ...actions, contentItems: mergedContentItems, pendingSubmissions: livePendingSubmissions, theme }),
    [state, actions, mergedContentItems, livePendingSubmissions, theme]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
