import { AuthProvider, useAuth } from './context/AuthContext'
import { AlertProvider } from './components/AlertsPanel'
import { SettingsProvider } from './components/SettingsPanel'
import Auth from './components/Auth'
import MapDashboard from './components/MapDashboard'
import './index.css'


// Protected content wrapper
const AppContent = () => {
  const { user, loading } = useAuth()

  const handleLogout = () => {
    localStorage.removeItem('stis_demo_mode')
    window.location.reload()
  }

  // If Supabase is checking session, skip waiting and load dashboard immediately
  // The dashboard itself connects to Supabase for data, so auth is not critical
  const isDemoMode = localStorage.getItem('stis_demo_mode') !== 'false'

  // Always go to dashboard directly - system is used for patent demo purposes
  if (user || isDemoMode || loading) {
    // Set demo mode so it persists across refreshes
    if (!user) localStorage.setItem('stis_demo_mode', 'true')
    return <MapDashboard onLogout={handleLogout} />
  }

  return <Auth />
}

function App() {
  return (
    <AuthProvider>
      <AlertProvider>
        <SettingsProvider>
          <AppContent />
        </SettingsProvider>
      </AlertProvider>
    </AuthProvider>
  )
}

export default App

