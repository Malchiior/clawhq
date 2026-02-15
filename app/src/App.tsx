import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { trackPageView, identifyUser } from './lib/analytics'
import AppLayout from './layouts/AppLayout'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import OnboardingPage from './pages/OnboardingPage'
import DashboardPage from './pages/DashboardPage'
import AgentsPage from './pages/AgentsPage'
import NewAgentPage from './pages/NewAgentPage'
import AgentDetailPage from './pages/AgentDetailPage'
import QuickDeployPage from './pages/QuickDeployPage'
import ChannelsPage from './pages/ChannelsPage'
import BillingPage from './pages/BillingPage'
import SettingsPage from './pages/SettingsPage'
import ApiKeysPage from './pages/ApiKeysPage'
import DocsPage from './pages/DocsPage'
import UsagePage from './pages/UsagePage'
import BrandingPage from './pages/BrandingPage'
import CustomDomainPage from './pages/CustomDomainPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import ProfilePage from './pages/ProfilePage'
import SupportPage from './pages/SupportPage'
import ChatPage from './pages/ChatPage'
import SetupPage from './pages/SetupPage'
import ChatHubPage from './pages/ChatHubPage'
import TasksPage from './pages/TasksPage'
import ProjectsPage from './pages/ProjectsPage'
import NotesPage from './pages/NotesPage'
import CalendarPage from './pages/CalendarPage'
import AutomationsPage from './pages/AutomationsPage'
import IdeasPage from './pages/IdeasPage'
import StrategyPage from './pages/StrategyPage'
import RevenuePage from './pages/RevenuePage'
import FinancesPage from './pages/FinancesPage'
import GalleryPage from './pages/GalleryPage'
import VaultPage from './pages/VaultPage'
import TimelinePage from './pages/TimelinePage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <div className="flex items-center justify-center h-screen bg-navy"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AnalyticsTracker() {
  const location = useLocation()
  const { user } = useAuth()

  useEffect(() => {
    trackPageView(location.pathname)
  }, [location.pathname])

  useEffect(() => {
    if (user?.id) identifyUser(user.id, { email: user.email, plan: user.plan })
  }, [user?.id])

  return null
}

export default function App() {
  return (
    <>
    <AnalyticsTracker />
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
      <Route path="/setup" element={<ProtectedRoute><SetupPage /></ProtectedRoute>} />
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="agents" element={<AgentsPage />} />
        <Route path="agents/new" element={<NewAgentPage />} />
        <Route path="agents/quick-deploy" element={<QuickDeployPage />} />
        <Route path="agents/:id" element={<AgentDetailPage />} />
        <Route path="agents/:agentId/chat" element={<ChatPage />} />
        <Route path="chat" element={<ChatHubPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="notes" element={<NotesPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="automations" element={<AutomationsPage />} />
        <Route path="ideas" element={<IdeasPage />} />
        <Route path="strategy" element={<StrategyPage />} />
        <Route path="revenue" element={<RevenuePage />} />
        <Route path="finances" element={<FinancesPage />} />
        <Route path="gallery" element={<GalleryPage />} />
        <Route path="vault" element={<VaultPage />} />
        <Route path="timeline" element={<TimelinePage />} />
        <Route path="channels" element={<ChannelsPage />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="branding" element={<BrandingPage />} />
        <Route path="domains" element={<CustomDomainPage />} />
        <Route path="usage" element={<UsagePage />} />
        <Route path="api-keys" element={<ApiKeysPage />} />
        <Route path="docs" element={<DocsPage />} />
        <Route path="support" element={<SupportPage />} />
      </Route>
    </Routes>
    </>
  )
}
