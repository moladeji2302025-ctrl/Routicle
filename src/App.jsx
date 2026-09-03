import { BrowserRouter, Routes, Route } from 'react-router-dom'
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
import AccountPage from './pages/AccountPage'
import CollectionsPage from './pages/CollectionsPage'
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
            <Route path="/account" element={<AccountPage />} />
            <Route path="/collections" element={<CollectionsPage />} />
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
