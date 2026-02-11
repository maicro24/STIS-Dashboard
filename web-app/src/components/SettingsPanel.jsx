import { useState, createContext, useContext } from 'react'
import {
    Settings,
    Sliders,
    Gauge,
    Play,
    Pause,
    FastForward,
    Video,
    Save,
    RotateCcw,
    AlertCircle,
    CheckCircle,
    Info,
    Moon,
    Sun,
    Volume2,
    VolumeX,
    Bell,
    BellOff,
    Database,
    Cpu,
    Wifi,
    Shield
} from 'lucide-react'

// Settings Context for sharing settings across components
export const SettingsContext = createContext()

export const useSettings = () => useContext(SettingsContext)

// Default settings
const defaultSettings = {
    congestionThreshold: 80,
    zoneCapacity: 10,
    simulationMode: 'live', // 'live' | 'fastforward'
    updateInterval: 250, // ms
    alertsEnabled: true,
    soundEnabled: true,
    darkMode: true,
    autoOptimize: true,
    greenLightMin: 15,
    greenLightMax: 60,
    yellowLightDuration: 3,
    emergencyPriority: true
}

// Settings Provider Component
export const SettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState(defaultSettings)
    const [hasChanges, setHasChanges] = useState(false)

    const updateSetting = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }))
        setHasChanges(true)
    }

    const resetSettings = () => {
        setSettings(defaultSettings)
        setHasChanges(false)
    }

    const saveSettings = () => {
        // In a real app, this would save to backend/localStorage
        localStorage.setItem('stis_settings', JSON.stringify(settings))
        setHasChanges(false)
    }

    return (
        <SettingsContext.Provider value={{
            settings,
            updateSetting,
            resetSettings,
            saveSettings,
            hasChanges
        }}>
            {children}
        </SettingsContext.Provider>
    )
}

// Slider Component
const SettingsSlider = ({ label, value, onChange, min, max, step = 1, unit = '', description, icon: Icon }) => {
    const percentage = ((value - min) / (max - min)) * 100

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {Icon && <Icon size={18} className="text-[var(--neon-primary)]" />}
                    <span className="font-medium">{label}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-lg font-bold neon-text">{value}</span>
                    {unit && <span className="text-[var(--text-muted)]">{unit}</span>}
                </div>
            </div>
            {description && (
                <p className="text-sm text-[var(--text-muted)]">{description}</p>
            )}
            <div className="relative">
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer"
                    style={{
                        background: `linear-gradient(to right, var(--neon-primary) 0%, var(--neon-secondary) ${percentage}%, rgba(255,255,255,0.1) ${percentage}%)`
                    }}
                />
            </div>
            <div className="flex justify-between text-xs text-[var(--text-muted)]">
                <span>{min}{unit}</span>
                <span>{max}{unit}</span>
            </div>
        </div>
    )
}

// Toggle Component
const SettingsToggle = ({ label, value, onChange, description, icon: Icon }) => {
    return (
        <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-glass)] border border-[var(--border-dim)] hover:border-[var(--neon-primary)]/30 transition-all">
            <div className="flex items-center gap-3">
                {Icon && <Icon size={20} className="text-[var(--neon-primary)]" />}
                <div>
                    <p className="font-medium">{label}</p>
                    {description && (
                        <p className="text-sm text-[var(--text-muted)]">{description}</p>
                    )}
                </div>
            </div>
            <button
                onClick={() => onChange(!value)}
                className={`relative w-14 h-7 rounded-full transition-all ${value
                        ? 'bg-gradient-to-r from-[var(--neon-primary)] to-[var(--neon-secondary)]'
                        : 'bg-[var(--bg-dark)]'
                    }`}
            >
                <span
                    className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-lg transition-all ${value ? 'left-8' : 'left-1'
                        }`}
                />
            </button>
        </div>
    )
}

// Number Input Component
const SettingsInput = ({ label, value, onChange, min, max, unit = '', description, icon: Icon }) => {
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                {Icon && <Icon size={18} className="text-[var(--neon-primary)]" />}
                <span className="font-medium">{label}</span>
            </div>
            {description && (
                <p className="text-sm text-[var(--text-muted)]">{description}</p>
            )}
            <div className="flex items-center gap-2">
                <input
                    type="number"
                    min={min}
                    max={max}
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-[var(--bg-glass)] border border-[var(--border-dim)] focus:border-[var(--neon-primary)] focus:outline-none text-[var(--text-primary)] transition-all"
                />
                {unit && <span className="text-[var(--text-muted)]">{unit}</span>}
            </div>
        </div>
    )
}

// Mode Selector Component
const ModeSelector = ({ value, onChange }) => {
    const modes = [
        {
            id: 'live',
            label: 'Live Video Sync',
            description: 'Real-time processing',
            icon: Video
        },
        {
            id: 'fastforward',
            label: 'Fast Forward',
            description: 'Accelerated testing',
            icon: FastForward
        }
    ]

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <Play size={18} className="text-[var(--neon-primary)]" />
                <span className="font-medium">Simulation Mode</span>
            </div>
            <p className="text-sm text-[var(--text-muted)]">
                Choose between real-time video sync or accelerated testing mode
            </p>
            <div className="grid grid-cols-2 gap-3">
                {modes.map(mode => (
                    <button
                        key={mode.id}
                        onClick={() => onChange(mode.id)}
                        className={`p-4 rounded-xl border transition-all ${value === mode.id
                                ? 'bg-gradient-to-br from-[var(--neon-primary)]/20 to-[var(--neon-secondary)]/20 border-[var(--neon-primary)]'
                                : 'bg-[var(--bg-glass)] border-[var(--border-dim)] hover:border-[var(--neon-primary)]/50'
                            }`}
                    >
                        <mode.icon
                            size={24}
                            className={value === mode.id ? 'text-[var(--neon-primary)]' : 'text-[var(--text-secondary)]'}
                        />
                        <p className={`font-medium mt-2 ${value === mode.id ? 'text-[var(--neon-primary)]' : ''}`}>
                            {mode.label}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">{mode.description}</p>
                    </button>
                ))}
            </div>
        </div>
    )
}

const SettingsPanel = () => {
    const { settings, updateSetting, resetSettings, saveSettings, hasChanges } = useSettings()
    const [activeSection, setActiveSection] = useState('traffic')
    const [showSaveToast, setShowSaveToast] = useState(false)

    const handleSave = () => {
        saveSettings()
        setShowSaveToast(true)
        setTimeout(() => setShowSaveToast(false), 3000)
    }

    const sections = [
        { id: 'traffic', label: 'Traffic Control', icon: Gauge },
        { id: 'signals', label: 'Signal Timing', icon: Sliders },
        { id: 'simulation', label: 'Simulation', icon: Play },
        { id: 'system', label: 'System', icon: Settings }
    ]

    return (
        <div className="h-full flex overflow-hidden">
            {/* Sidebar Navigation */}
            <div className="w-56 bg-[var(--bg-card)] border-r border-[var(--border-dim)] p-4 space-y-2">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Settings className="text-[var(--neon-primary)]" />
                    Settings
                </h3>
                {sections.map(section => (
                    <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeSection === section.id
                                ? 'bg-gradient-to-r from-[var(--neon-primary)]/20 to-transparent border border-[var(--neon-primary)]/30 text-[var(--neon-primary)]'
                                : 'hover:bg-[var(--bg-glass)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                    >
                        <section.icon size={18} />
                        <span className="text-sm font-medium">{section.label}</span>
                    </button>
                ))}

                {/* Action Buttons */}
                <div className="pt-4 mt-4 border-t border-[var(--border-dim)] space-y-2">
                    <button
                        onClick={handleSave}
                        disabled={!hasChanges}
                        className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl font-medium transition-all ${hasChanges
                                ? 'bg-gradient-to-r from-[var(--neon-primary)] to-[var(--neon-secondary)] text-[var(--bg-dark)] hover:opacity-90'
                                : 'bg-[var(--bg-glass)] text-[var(--text-muted)] cursor-not-allowed'
                            }`}
                    >
                        <Save size={18} />
                        Save Changes
                    </button>
                    <button
                        onClick={resetSettings}
                        className="w-full flex items-center justify-center gap-2 p-3 rounded-xl text-[var(--text-secondary)] hover:text-[var(--neon-red)] hover:bg-[var(--neon-red)]/10 transition-all"
                    >
                        <RotateCcw size={18} />
                        Reset Defaults
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto p-6">
                {/* Traffic Control Settings */}
                {activeSection === 'traffic' && (
                    <div className="space-y-6 animate-fade-in">
                        <div>
                            <h2 className="text-xl font-bold mb-2">Traffic Control Parameters</h2>
                            <p className="text-[var(--text-muted)]">
                                Adjust thresholds and capacities for traffic analysis
                            </p>
                        </div>

                        <div className="glass-card p-6 space-y-6">
                            <SettingsSlider
                                icon={AlertCircle}
                                label="Congestion Threshold"
                                value={settings.congestionThreshold}
                                onChange={(v) => updateSetting('congestionThreshold', v)}
                                min={50}
                                max={100}
                                unit="%"
                                description="Traffic density level that triggers AI alerts and recommendations"
                            />

                            <div className="border-t border-[var(--border-dim)] pt-6">
                                <SettingsInput
                                    icon={Database}
                                    label="Zone Capacity"
                                    value={settings.zoneCapacity}
                                    onChange={(v) => updateSetting('zoneCapacity', v)}
                                    min={5}
                                    max={50}
                                    unit="vehicles"
                                    description="Maximum vehicle count used for density calculations (calibrate per road size)"
                                />
                            </div>

                            <div className="border-t border-[var(--border-dim)] pt-6">
                                <SettingsToggle
                                    icon={Cpu}
                                    label="Auto-Optimize Signals"
                                    value={settings.autoOptimize}
                                    onChange={(v) => updateSetting('autoOptimize', v)}
                                    description="Automatically apply AI recommendations"
                                />
                            </div>
                        </div>

                        {/* Info Box */}
                        <div className="glass-card p-4 border-l-4 border-[var(--neon-primary)]">
                            <div className="flex items-start gap-3">
                                <Info size={20} className="text-[var(--neon-primary)] flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium">How Congestion Threshold Works</p>
                                    <p className="text-sm text-[var(--text-muted)] mt-1">
                                        When traffic density exceeds this threshold, the AI will automatically
                                        generate alerts and suggest timing adjustments. Lower values trigger
                                        earlier interventions, while higher values allow more traffic buildup
                                        before action.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Signal Timing Settings */}
                {activeSection === 'signals' && (
                    <div className="space-y-6 animate-fade-in">
                        <div>
                            <h2 className="text-xl font-bold mb-2">Signal Timing Configuration</h2>
                            <p className="text-[var(--text-muted)]">
                                Configure traffic light duration limits
                            </p>
                        </div>

                        <div className="glass-card p-6 space-y-6">
                            <SettingsSlider
                                icon={Sliders}
                                label="Minimum Green Light"
                                value={settings.greenLightMin}
                                onChange={(v) => updateSetting('greenLightMin', v)}
                                min={5}
                                max={30}
                                unit="s"
                                description="Minimum duration for green light phase"
                            />

                            <div className="border-t border-[var(--border-dim)] pt-6">
                                <SettingsSlider
                                    icon={Sliders}
                                    label="Maximum Green Light"
                                    value={settings.greenLightMax}
                                    onChange={(v) => updateSetting('greenLightMax', v)}
                                    min={30}
                                    max={120}
                                    unit="s"
                                    description="Maximum duration for green light phase"
                                />
                            </div>

                            <div className="border-t border-[var(--border-dim)] pt-6">
                                <SettingsSlider
                                    icon={AlertCircle}
                                    label="Yellow Light Duration"
                                    value={settings.yellowLightDuration}
                                    onChange={(v) => updateSetting('yellowLightDuration', v)}
                                    min={2}
                                    max={6}
                                    unit="s"
                                    description="Warning phase before red light"
                                />
                            </div>

                            <div className="border-t border-[var(--border-dim)] pt-6">
                                <SettingsToggle
                                    icon={Shield}
                                    label="Emergency Vehicle Priority"
                                    value={settings.emergencyPriority}
                                    onChange={(v) => updateSetting('emergencyPriority', v)}
                                    description="Override signals for emergency vehicles"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Simulation Settings */}
                {activeSection === 'simulation' && (
                    <div className="space-y-6 animate-fade-in">
                        <div>
                            <h2 className="text-xl font-bold mb-2">Simulation Settings</h2>
                            <p className="text-[var(--text-muted)]">
                                Configure simulation and data processing parameters
                            </p>
                        </div>

                        <div className="glass-card p-6 space-y-6">
                            <ModeSelector
                                value={settings.simulationMode}
                                onChange={(v) => updateSetting('simulationMode', v)}
                            />

                            <div className="border-t border-[var(--border-dim)] pt-6">
                                <SettingsSlider
                                    icon={Wifi}
                                    label="Update Interval"
                                    value={settings.updateInterval}
                                    onChange={(v) => updateSetting('updateInterval', v)}
                                    min={100}
                                    max={1000}
                                    step={50}
                                    unit="ms"
                                    description="Data refresh rate for real-time processing"
                                />
                            </div>
                        </div>

                        {/* Mode Description */}
                        <div className="glass-card p-4 border-l-4 border-[var(--neon-secondary)]">
                            <div className="flex items-start gap-3">
                                {settings.simulationMode === 'live' ? (
                                    <Video size={20} className="text-[var(--neon-secondary)] flex-shrink-0 mt-0.5" />
                                ) : (
                                    <FastForward size={20} className="text-[var(--neon-secondary)] flex-shrink-0 mt-0.5" />
                                )}
                                <div>
                                    <p className="font-medium">
                                        {settings.simulationMode === 'live' ? 'Live Video Sync Mode' : 'Fast Forward Mode'}
                                    </p>
                                    <p className="text-sm text-[var(--text-muted)] mt-1">
                                        {settings.simulationMode === 'live'
                                            ? 'Processing video frames in real-time at native speed. Best for production monitoring.'
                                            : 'Processing data at accelerated speed. Useful for testing algorithms and reviewing historical data quickly.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* System Settings */}
                {activeSection === 'system' && (
                    <div className="space-y-6 animate-fade-in">
                        <div>
                            <h2 className="text-xl font-bold mb-2">System Preferences</h2>
                            <p className="text-[var(--text-muted)]">
                                General application settings
                            </p>
                        </div>

                        <div className="glass-card p-6 space-y-4">
                            <SettingsToggle
                                icon={Bell}
                                label="Enable Alerts"
                                value={settings.alertsEnabled}
                                onChange={(v) => updateSetting('alertsEnabled', v)}
                                description="Show notifications for traffic events"
                            />

                            <SettingsToggle
                                icon={settings.soundEnabled ? Volume2 : VolumeX}
                                label="Sound Effects"
                                value={settings.soundEnabled}
                                onChange={(v) => updateSetting('soundEnabled', v)}
                                description="Play audio for critical alerts"
                            />

                            <SettingsToggle
                                icon={settings.darkMode ? Moon : Sun}
                                label="Dark Mode"
                                value={settings.darkMode}
                                onChange={(v) => updateSetting('darkMode', v)}
                                description="Use dark theme (recommended)"
                            />
                        </div>

                        {/* System Status */}
                        <div className="glass-card p-6">
                            <h3 className="font-medium mb-4 flex items-center gap-2">
                                <Cpu size={18} className="text-[var(--neon-primary)]" />
                                System Status
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { label: 'AI Engine', status: 'Active', ok: true },
                                    { label: 'Video Feed', status: 'Connected', ok: true },
                                    { label: 'Database', status: 'Online', ok: true },
                                    { label: 'API Server', status: 'Running', ok: true }
                                ].map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-glass)]">
                                        <span className="text-[var(--text-secondary)]">{item.label}</span>
                                        <div className="flex items-center gap-2">
                                            <span className={item.ok ? 'text-[var(--neon-green)]' : 'text-[var(--neon-red)]'}>
                                                {item.status}
                                            </span>
                                            {item.ok ? (
                                                <CheckCircle size={14} className="text-[var(--neon-green)]" />
                                            ) : (
                                                <AlertCircle size={14} className="text-[var(--neon-red)]" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Save Toast */}
            {showSaveToast && (
                <div className="fixed bottom-6 right-6 glass-card p-4 flex items-center gap-3 animate-fade-in z-50">
                    <CheckCircle size={20} className="text-[var(--neon-green)]" />
                    <span>Settings saved successfully!</span>
                </div>
            )}
        </div>
    )
}

export default SettingsPanel
