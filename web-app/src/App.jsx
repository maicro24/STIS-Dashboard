import { AuthProvider, useAuth } from './context/AuthContext'
import { AlertProvider } from './components/AlertsPanel'
import { SettingsProvider } from './components/SettingsPanel'
import Auth from './components/Auth'
import MapDashboard from './components/MapDashboard'
import './index.css'


// Protected content wrapper
const AppContent = () => {
  const { user, loading, signOut } = useAuth()

  const handleLogout = async () => {
    localStorage.removeItem('stis_demo_mode')
    if (user) await signOut()
    window.location.reload()
  }

  const isDemoMode = localStorage.getItem('stis_demo_mode') === 'true'

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-dark)]">
        <div className="spinner border-t-[var(--neon-primary)] w-12 h-12"></div>
      </div>
    )
  }

  if (user || isDemoMode) {
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

