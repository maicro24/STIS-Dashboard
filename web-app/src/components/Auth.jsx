import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, Shield, Zap, Activity } from 'lucide-react'

const Auth = () => {
    const [isLogin, setIsLogin] = useState(true)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const { signIn, signUp } = useAuth()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')
        setLoading(true)

        try {
            if (isLogin) {
                const { error } = await signIn(email, password)
                if (error) throw error
            } else {
                const { error } = await signUp(email, password, fullName)
                if (error) throw error
                setSuccess('Account created! Please check your email for verification.')
            }
        } catch (err) {
            setError(err.message || 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--neon-primary)] opacity-5 rounded-full blur-3xl animate-float" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[var(--neon-secondary)] opacity-5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
            </div>

            <div className="w-full max-w-md relative">
                {/* Logo & Title */}
                <div className="text-center mb-8 animate-slide-up">
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-full overflow-hidden mb-4 shadow-lg animate-pulse-neon border-2 border-[var(--border-glow)]" style={{ boxShadow: '0 0 25px var(--neon-primary-glow)' }}>
                        <img src="/logo.svg" alt="STIS Logo" className="w-full h-full object-cover" />
                    </div>
                    <h1 className="text-4xl font-bold mb-2">
                        <span className="neon-text">STIS</span>
                    </h1>
                    <p className="text-[var(--text-secondary)]">Smart Traffic Intelligence System</p>
                </div>

                {/* Auth Card */}
                <div className="glass-card p-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                    {/* Tab Switcher */}
                    <div className="flex mb-8 bg-[var(--bg-glass)] rounded-lg p-1">
                        <button
                            onClick={() => { setIsLogin(true); setError(''); setSuccess('') }}
                            className={`flex-1 py-3 rounded-md text-sm font-semibold transition-all duration-300 ${isLogin
                                ? 'bg-gradient-to-r from-[var(--neon-primary)] to-[var(--neon-primary-dim)] text-[var(--bg-dark)]'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => { setIsLogin(false); setError(''); setSuccess('') }}
                            className={`flex-1 py-3 rounded-md text-sm font-semibold transition-all duration-300 ${!isLogin
                                ? 'bg-gradient-to-r from-[var(--neon-primary)] to-[var(--neon-primary-dim)] text-[var(--bg-dark)]'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                        >
                            Sign Up
                        </button>
                    </div>

                    {/* Error/Success Messages */}
                    {error && (
                        <div className="mb-6 p-4 rounded-lg bg-[var(--neon-red)]/10 border border-[var(--neon-red)]/30 text-[var(--neon-red)] text-sm animate-fade-in">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="mb-6 p-4 rounded-lg bg-[var(--neon-green)]/10 border border-[var(--neon-green)]/30 text-[var(--neon-green)] text-sm animate-fade-in">
                            {success}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {!isLogin && (
                            <div className="animate-fade-in">
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Enter your full name"
                                    className="input-neon"
                                    required={!isLogin}
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="controller@traffic.gov"
                                className="input-neon"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="input-neon pr-12"
                                    required
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--neon-primary)] transition-colors"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn-neon btn-neon-fill py-4 mt-2 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <div className="spinner w-5 h-5 border-2" />
                            ) : (
                                <>
                                    <Zap size={18} />
                                    {isLogin ? 'Access Dashboard' : 'Create Account'}
                                </>
                            )}
                        </button>
                    </form>

                    {/* Demo Credentials */}
                    <div className="mt-6 pt-6 border-t border-[var(--border-dim)]">
                        <p className="text-center text-xs text-[var(--text-muted)] mb-3">
                            Demo Mode - Skip authentication
                        </p>
                        <button
                            onClick={() => {
                                // For demo purposes, we'll simulate a logged-in state
                                localStorage.setItem('stis_demo_mode', 'true')
                                window.location.reload()
                            }}
                            className="w-full py-3 rounded-lg border border-[var(--border-dim)] text-[var(--text-secondary)] hover:border-[var(--neon-primary)] hover:text-[var(--neon-primary)] transition-all text-sm font-medium"
                        >
                            Enter Demo Mode
                        </button>
                    </div>
                </div>

                {/* Features */}
                <div className="mt-8 grid grid-cols-3 gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                    <div className="text-center p-4 glass-card">
                        <Shield size={24} className="mx-auto mb-2 text-[var(--neon-primary)]" />
                        <p className="text-xs text-[var(--text-muted)]">Secure Access</p>
                    </div>
                    <div className="text-center p-4 glass-card">
                        <Activity size={24} className="mx-auto mb-2 text-[var(--neon-green)]" />
                        <p className="text-xs text-[var(--text-muted)]">Real-time AI</p>
                    </div>
                    <div className="text-center p-4 glass-card">
                        <Zap size={24} className="mx-auto mb-2 text-[var(--neon-secondary)]" />
                        <p className="text-xs text-[var(--text-muted)]">Smart Control</p>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-[var(--text-muted)] mt-8">
                    © 2026 STIS - Smart Traffic Intelligence System
                </p>
            </div>
        </div>
    )
}

export default Auth
