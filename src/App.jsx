import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import Layout from './components/Layout'
import IntroReveal from './components/IntroReveal'
import HomeRouter from './components/HomeRouter'
import DesignDetailPage from './pages/DesignDetailPage'
import ExplorePage from './pages/ExplorePage'
import DepartmentsPage from './pages/DepartmentsPage'
import PricingPage from './pages/PricingPage'
import SignUpPage from './pages/SignUpPage'
import SignInPage from './pages/SignInPage'
import AIImageStudioPage from './pages/AIImageStudioPage'
import AIVideoStudioPage from './pages/AIVideoStudioPage'
import BecomeCreatorPage from './pages/BecomeCreatorPage'
import CreatorUploadPage from './pages/CreatorUploadPage'
import CreatorDashboardPage from './pages/CreatorDashboardPage'
import CreatorProfilePage from './pages/CreatorProfilePage'
import SettingsPage from './pages/SettingsPage'
import ProfileSettings from './pages/settings/ProfileSettings'
import SecuritySettings from './pages/settings/SecuritySettings'
import NotificationSettings from './pages/settings/NotificationSettings'
import PlanSettings from './pages/settings/PlanSettings'
import WorkspaceSettings from './pages/settings/WorkspaceSettings'
import AppearanceSettings from './pages/settings/AppearanceSettings'
import BrowsingSettings from './pages/settings/BrowsingSettings'
import StudioSettings from './pages/settings/StudioSettings'
import CreatorSettings from './pages/settings/CreatorSettings'
import PrivacySettings from './pages/settings/PrivacySettings'
import DeveloperSettings from './pages/settings/DeveloperSettings'
import CollectionsPage from './pages/CollectionsPage'
import TeamPage from './pages/TeamPage'
import BillingCallbackPage from './pages/BillingCallbackPage'
import AdminModerationPage from './pages/AdminModerationPage'
import StaticPage from './pages/StaticPage'

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <IntroReveal />
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomeRouter />} />
            <Route path="/design/:id" element={<DesignDetailPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/departments" element={<DepartmentsPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/studio/image" element={<AIImageStudioPage />} />
            <Route path="/studio/video" element={<AIVideoStudioPage />} />
            <Route path="/become-creator" element={<BecomeCreatorPage />} />
            <Route path="/upload" element={<CreatorUploadPage />} />
            <Route path="/dashboard" element={<CreatorDashboardPage />} />
            <Route path="/creator/:id" element={<CreatorProfilePage />} />
            <Route path="/settings" element={<SettingsPage />}>
              <Route index element={<Navigate to="/settings/profile" replace />} />
              <Route path="profile" element={<ProfileSettings />} />
              <Route path="security" element={<SecuritySettings />} />
              <Route path="notifications" element={<NotificationSettings />} />
              <Route path="plan" element={<PlanSettings />} />
              <Route path="workspace" element={<WorkspaceSettings />} />
              <Route path="appearance" element={<AppearanceSettings />} />
              <Route path="browsing" element={<BrowsingSettings />} />
              <Route path="studio" element={<StudioSettings />} />
              <Route path="creator" element={<CreatorSettings />} />
              <Route path="privacy" element={<PrivacySettings />} />
              <Route path="developer" element={<DeveloperSettings />} />
            </Route>
            {/* The old single-panel account screen these replaced. */}
            <Route path="/account" element={<Navigate to="/settings/profile" replace />} />
            <Route path="/collections" element={<CollectionsPage />} />
            <Route path="/team" element={<TeamPage />} />
            <Route path="/billing/callback" element={<BillingCallbackPage />} />
            <Route path="/admin" element={<AdminModerationPage />} />
            <Route path="/about" element={<StaticPage slug="about" />} />
            <Route path="/careers" element={<StaticPage slug="careers" />} />
            <Route path="/brand" element={<StaticPage slug="brand" />} />
            <Route path="/contact" element={<StaticPage slug="contact" />} />
            <Route path="/blog" element={<StaticPage slug="blog" />} />
            <Route path="/help" element={<StaticPage slug="help" />} />
            <Route path="/terms" element={<StaticPage slug="terms" />} />
            <Route path="/privacy" element={<StaticPage slug="privacy" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}
