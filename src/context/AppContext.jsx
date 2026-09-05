import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { FEED_ITEMS } from '../data/feedItems'
import { TIERS } from '../data/pricing'
import * as api from '../lib/api'
import { authClient } from '../lib/authClient'
import { orgClient } from '../lib/orgClient'

const STORAGE_KEY = 'routicle_mock_state_v1'
const PENDING_INTENT_KEY = 'routicle_pending_signup_intent'
const THEME_KEY = 'routicle_app_theme'
const ACTIVE_TEAM_KEY = 'routicle_active_team_id'
const RECENT_KEY = 'routicle_recently_viewed'
const RECENT_LIMIT = 12

function parseTeamMetadata(raw) {
  try {
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

const AppContext = createContext(null)

function loadInitialTheme() {
  // Dark mode was removed from the homepage/marketing chrome only (see
  // index.css — --surface/--text/etc no longer respond to
  // [data-theme='dark']). The signed-in AppShell keeps its own independent
  // dark mode, so this still reads/persists a real preference for that.
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

  // Teams (shared subscriber workspaces) — backed by Neon Auth's built-in
  // organization/member/invitation tables via orgClient, not the local mock
  // state above. `teams` is this account's memberships; `activeTeamId` (also
  // mirrored to localStorage so it survives a refresh) picks which
  // workspace's collections/downloads/billing are currently in effect.
  const [teams, setTeams] = useState([])
  const [activeTeamId, setActiveTeamIdState] = useState(() => {
    try {
      return localStorage.getItem(ACTIVE_TEAM_KEY) || null
    } catch {
      return null
    }
  })
  const [teamMembers, setTeamMembers] = useState([])
  // Real, server-side billing state for the active scope (personal or team).
  const [subscription, setSubscription] = useState(null)

  // Design detail pages record themselves here so the dashboard can offer a
  // genuine "pick up where you left off" rather than a decorative placeholder.
  const [recentlyViewed, setRecentlyViewed] = useState(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })

  const recordView = useCallback((itemId) => {
    if (itemId == null) return
    setRecentlyViewed((prev) => {
      const id = String(itemId)
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, RECENT_LIMIT)
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next))
      } catch {
        // storage blocked — history just won't persist across reloads
      }
      return next
    })
  }, [])

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

  const setActiveTeamId = useCallback((teamId) => {
    setActiveTeamIdState(teamId)
    try {
      if (teamId) localStorage.setItem(ACTIVE_TEAM_KEY, teamId)
      else localStorage.removeItem(ACTIVE_TEAM_KEY)
    } catch {
      // ignore
    }
  }, [])

  const refreshTeams = useCallback(async () => {
    try {
      const result = await orgClient.organization.list()
      const list = (result.data || []).map((org) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        role: org.members?.[0]?.role,
        ...parseTeamMetadata(org.metadata),
      }))
      setTeams(list)
      // The active team may have been removed/left elsewhere (another tab, another device).
      setActiveTeamIdState((current) => (current && !list.some((t) => t.id === current) ? null : current))
      return list
    } catch (err) {
      console.error('refreshTeams failed', err)
      return []
    }
  }, [])

  const refreshTeamMembers = useCallback(async (teamId) => {
    if (!teamId) {
      setTeamMembers([])
      return
    }
    try {
      const result = await orgClient.organization.listMembers({ query: { organizationId: teamId } })
      setTeamMembers(result.data?.members || [])
    } catch (err) {
      console.error('refreshTeamMembers failed', err)
      setTeamMembers([])
    }
  }, [])

  /** Loads the current collection context (personal, or the active team's shared one) into currentUser.savedItemIds. */
  const refreshSavedItems = useCallback(async (userId, teamId) => {
    if (!userId) return
    try {
      const { items } = await api.fetchSavedItems({ userId, organizationId: teamId || undefined })
      const savedItemIds = items.map((i) => i.contentItemId)
      setState((prev) => {
        if (!prev.currentUser || prev.currentUser.id !== userId) return prev
        return {
          ...prev,
          currentUser: { ...prev.currentUser, savedItemIds },
          profiles: { ...prev.profiles, [userId]: { ...prev.profiles[userId], savedItemIds } },
        }
      })
    } catch (err) {
      console.error('refreshSavedItems failed', err)
    }
  }, [])

  useEffect(() => {
    if (state.currentUser?.id) refreshTeams()
    else {
      setTeams([])
      setTeamMembers([])
    }
  }, [state.currentUser?.id, refreshTeams])

  /**
   * Pulls the subscription actually in force from the server and mirrors its
   * tier onto currentUser.role, so every existing tier gate (evaluateDownload,
   * AI Studio credits, etc.) reads real billing state instead of the local
   * flag the mock subscribe() used to set.
   */
  const refreshSubscription = useCallback(async (userId, teamId) => {
    if (!userId) return
    try {
      const { subscription } = await api.fetchSubscription({ userId, organizationId: teamId || undefined })
      setSubscription(subscription)
      setState((prev) => {
        if (!prev.currentUser || prev.currentUser.id !== userId) return prev
        const role = subscription?.tier || 'free'
        if (prev.currentUser.role === role) return prev
        const nextUser = { ...prev.currentUser, role }
        return { ...prev, currentUser: nextUser, profiles: { ...prev.profiles, [userId]: nextUser } }
      })
    } catch (err) {
      console.error('fetchSubscription failed', err)
    }
  }, [])

  useEffect(() => {
    if (!state.currentUser?.id) return
    refreshSavedItems(state.currentUser.id, activeTeamId)
    refreshTeamMembers(activeTeamId)
    refreshSubscription(state.currentUser.id, activeTeamId)
  }, [state.currentUser?.id, activeTeamId, refreshSavedItems, refreshTeamMembers, refreshSubscription])

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
        setActiveTeamId(null)
      },

      clearPendingIntentRedirect() {
        setState((prev) => ({ ...prev, pendingIntentRedirect: null }))
      },

      toggleTheme() {
        setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
      },

      /**
       * Starts a real Paystack checkout and hands back the hosted payment URL.
       * Nothing about the account changes here — the tier only moves once the
       * payment is verified (see /billing/callback and the webhook), so a
       * closed tab or a declined card can't leave someone on a plan they
       * didn't pay for.
       */
      async startSubscriptionCheckout({ tier, cadence, returnUrl }) {
        const user = stateRef.current.currentUser
        if (!user) throw new Error('Sign in first')
        const { authorizationUrl } = await api.startCheckout({
          userId: user.id,
          email: user.email,
          tier,
          billingCycle: cadence,
          organizationId: activeTeamId || undefined,
          returnUrl,
        })
        return authorizationUrl
      },

      /** Confirms a payment on return from Paystack, then syncs local state. */
      async confirmPayment(reference) {
        const result = await api.verifyPayment(reference)
        const user = stateRef.current.currentUser
        if (user) await refreshSubscription(user.id, activeTeamId)
        return result
      },

      async cancelSubscription() {
        const user = stateRef.current.currentUser
        if (!user) return null
        const result = await api.cancelSubscriptionRemote({
          userId: user.id,
          organizationId: activeTeamId || undefined,
        })
        await refreshSubscription(user.id, activeTeamId)
        return result
      },

      /** Grants the per-cycle AI credits that come with a paid tier. */
      applyPlanCredits(tier) {
        const plan = TIERS[tier]
        if (!plan) return
        updateUser((user) => ({
          ...user,
          credits: { image: plan.imageCredits || 0, video: plan.videoCredits || 0 },
        }))
      },

      /** Creates a team (Neon Auth organization), makes it the active workspace, and returns it. */
      async createTeam(name) {
        const slug = `${name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${Math.random().toString(36).slice(2, 6)}`
        const result = await orgClient.organization.create({ name: name.trim(), slug })
        if (result.error) throw new Error(result.error.message || 'Could not create team')
        await refreshTeams()
        setActiveTeamId(result.data.id)
        return result.data
      },

      async inviteTeamMember(email, role = 'member') {
        if (!activeTeamId) throw new Error('No active team')
        const result = await orgClient.organization.inviteMember({ organizationId: activeTeamId, email: email.trim(), role })
        if (result.error) throw new Error(result.error.message || 'Could not send invite')
        return result.data
      },

      async removeTeamMember(memberIdOrEmail) {
        if (!activeTeamId) throw new Error('No active team')
        const result = await orgClient.organization.removeMember({ organizationId: activeTeamId, memberIdOrEmail })
        if (result.error) throw new Error(result.error.message || 'Could not remove member')
        await refreshTeamMembers(activeTeamId)
      },

      async leaveTeam(teamId) {
        const result = await orgClient.organization.leave({ organizationId: teamId })
        if (result.error) throw new Error(result.error.message || 'Could not leave team')
        if (activeTeamId === teamId) setActiveTeamId(null)
        await refreshTeams()
      },

      /** Sets the team's shared plan — same mock-billing pattern as subscribe() above (no live payment gateway either way). */
      async setTeamTier(teamId, tier) {
        const result = await orgClient.organization.update({ organizationId: teamId, data: { metadata: JSON.stringify({ tier }) } })
        if (result.error) throw new Error(result.error.message || 'Could not update team plan')
        await refreshTeams()
      },

      /** Switches the active workspace: null for "Personal", or a team id for that team's shared collections/downloads/billing. */
      setActiveTeam(teamId) {
        setActiveTeamId(teamId)
        orgClient.organization.setActive({ organizationId: teamId }).catch(() => {})
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

      /**
       * Saves/un-saves an item in the current collection context — personal, or the
       * active team's shared one if a team workspace is active. Optimistic locally,
       * backed by real Postgres (saved_items) rather than the local-only mock every
       * other action here still uses, since a "shared" collection has to actually
       * sync across different people's devices to mean anything.
       */
      toggleSave(itemId) {
        const user = stateRef.current.currentUser
        if (!user) return
        const has = user.savedItemIds.includes(itemId)
        updateUser((u) => ({
          ...u,
          savedItemIds: has ? u.savedItemIds.filter((id) => id !== itemId) : [...u.savedItemIds, itemId],
        }))
        const teamId = activeTeamId || undefined
        const call = has
          ? api.unsaveItemRemote({ userId: user.id, organizationId: teamId, contentItemId: itemId })
          : api.saveItemRemote({ userId: user.id, organizationId: teamId, contentItemId: itemId, savedByUserId: user.id })
        call.catch((err) => {
          console.error('toggleSave sync failed', err)
          // Roll back the optimistic update if the server write failed.
          updateUser((u) => ({
            ...u,
            savedItemIds: has ? [...u.savedItemIds, itemId] : u.savedItemIds.filter((id) => id !== itemId),
          }))
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
  }, [
    liveContentItems,
    refreshLiveContent,
    refreshPending,
    hydrateFromSession,
    activeTeamId,
    setActiveTeamId,
    refreshTeams,
    refreshTeamMembers,
    refreshSubscription,
  ])

  const mergedContentItems = useMemo(
    () => [...liveContentItems, ...state.contentItems],
    [liveContentItems, state.contentItems]
  )

  const activeTeam = useMemo(() => teams.find((t) => t.id === activeTeamId) || null, [teams, activeTeamId])

  const value = useMemo(
    () => ({
      ...state,
      ...actions,
      contentItems: mergedContentItems,
      pendingSubmissions: livePendingSubmissions,
      theme,
      teams,
      activeTeamId,
      activeTeam,
      teamMembers,
      subscription,
      recentlyViewed,
      recordView,
    }),
    [
      state,
      actions,
      mergedContentItems,
      livePendingSubmissions,
      theme,
      teams,
      activeTeamId,
      activeTeam,
      teamMembers,
      subscription,
      recentlyViewed,
      recordView,
    ]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
