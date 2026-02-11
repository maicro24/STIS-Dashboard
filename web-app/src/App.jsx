import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AlertProvider } from './components/AlertsPanel'
import { SettingsProvider } from './components/SettingsPanel'
import Auth from './components/Auth'
import MapDashboard from './components/MapDashboard'
import './index.css'


// Protected content wrapper
const AppContent = () => {
  const { user, loading } = useAuth()
  const [isDemoMode, setIsDemoMode] = useState(false)

  useEffect(() => {
    // Check for demo mode
    const demoMode = localStorage.getItem('stis_demo_mode')
    if (demoMode === 'true') {
      setIsDemoMode(true)
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('stis_demo_mode')
    setIsDemoMode(false)
  }

  // Show loading spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">Loading STIS...</p>
        </div>
      </div>
    )
  }

  // Show auth or dashboard
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

