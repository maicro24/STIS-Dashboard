import { useState, useEffect, useRef } from 'react'
import {
    X,
    Play,
    Pause,
    Volume2,
    VolumeX,
    CheckCircle2,
    Car,
    Gauge,
    Zap,
    Hand,
    Activity,
    ArrowRight,
    Rocket,
    StopCircle,
    TrendingUp
} from 'lucide-react'
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts'

// Helper functions
const getCongestionLevel = (density) => {
    if (density < 0.3) return { level: 'Low', color: '#39ff14' }
    if (density < 0.5) return { level: 'Medium', color: '#ffff00' }
    if (density < 0.8) return { level: 'High', color: '#ff6600' }
    return { level: 'Critical', color: '#ff073a' }
}

// Smart Intersection AI Recommendation
const getSmartAIRecommendation = (density, vehicleCount, speed, currentLight, crossTrafficDensity) => {
    const roadACongestion = density >= 0.8 ? 'Critical' : density >= 0.5 ? 'High' : density >= 0.3 ? 'Medium' : 'Low'
    const crossTraffic = crossTrafficDensity >= 0.5 ? 'High' : 'Low'

    // Case 2: Priority Mode - Road A high congestion, current red, cross traffic low
    if ((roadACongestion === 'High' || roadACongestion === 'Critical') &&
        currentLight === 'red' &&
        crossTraffic === 'Low') {
        return {
            action: 'GRANT_PRIORITY',
            message: '🚀 Priority Mode: Cross-traffic is clear. Switch to GREEN immediately.',
            urgency: 'critical',
            details: `Road A: ${vehicleCount} vehicles waiting | Cross-traffic: Empty`,
            buttonLabel: 'GRANT PRIORITY',
            buttonStyle: 'priority',
            extension: null
        }
    }

    // Case 3: Hold Red - Road A low, cross traffic high
    if ((roadACongestion === 'Low' || roadACongestion === 'Medium') &&
        crossTraffic === 'High' &&
        currentLight === 'red') {
        return {
            action: 'HOLD_RED',
            message: '🛑 Hold Red: Heavy cross-traffic detected. Wait for clearance.',
            urgency: 'warning',
            details: `Cross-traffic density: ${(crossTrafficDensity * 100).toFixed(0)}% | Estimated wait: 20s`,
            buttonLabel: 'ACKNOWLEDGE',
            buttonStyle: 'hold',
            extension: null
        }
    }

    // Extend Green when congestion is high and light is green
    if ((roadACongestion === 'High' || roadACongestion === 'Critical') && currentLight === 'green') {
        const extensionTime = roadACongestion === 'Critical' ? 30 : 20
        return {
            action: 'EXTEND_GREEN',
            message: `⏱️ Extend Green: ${roadACongestion} congestion on Road A.`,
            urgency: 'warning',
            details: `${vehicleCount} vehicles in queue | Avg speed: ${speed.toFixed(1)} km/h`,
            buttonLabel: `+${extensionTime}s EXTENSION`,
            buttonStyle: 'extend',
            extension: extensionTime
        }
    }

    // Standard timer - normal conditions
    if (roadACongestion === 'Low' && crossTraffic === 'Low') {
        return {
            action: 'OPTIMIZE',
            message: '✅ Optimal: Low traffic on all roads. Consider reducing cycle time.',
            urgency: 'success',
            details: 'System running efficiently | All intersections clear',
            buttonLabel: 'REDUCE CYCLE',
            buttonStyle: 'optimize',
            extension: -10
        }
    }

    // Default monitoring
    return {
        action: 'MONITOR',
        message: '📊 Monitoring: Traffic conditions are stable.',
        urgency: 'info',
        details: 'Continue standard signal timing',
        buttonLabel: 'MAINTAIN',
        buttonStyle: 'monitor',
        extension: null
    }
}

// Determine traffic light state from speed (Reverse Simulation)
// Traffic speed controls the light visualization, not vice versa
const getLightStatusFromSpeed = (speed) => {
    if (speed >= 10) return 'green'   // Flowing traffic
    if (speed < 5) return 'red'       // Stopped/Queueing
    return 'orange'                   // Transition state
}

// Get descriptive label for current traffic state
const getTrafficStateLabel = (speed) => {
    if (speed >= 10) return { label: 'FLOWING', color: '#39ff14' }
    if (speed < 5) return { label: 'STOPPED', color: '#ff073a' }
    return { label: 'SLOWING', color: '#ff9500' }
}

// Traffic Light Component
const TrafficLight = ({ currentLight, isAnimating, speed }) => {
    const lights = [
        { color: 'red', activeColor: '#ff073a', label: 'STOPPED' },
        { color: 'orange', activeColor: '#ff9500', label: 'SLOWING' },
        { color: 'green', activeColor: '#39ff14', label: 'FLOWING' }
    ]

    return (
        <div className="flex flex-col items-center">
            {/* Traffic Light Housing */}
            <div className="relative bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl p-4 shadow-2xl border-2 border-gray-700">
                {/* Top cap */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-gray-800 rounded-full border-2 border-gray-700" />

                {/* Lights */}
                <div className="space-y-3">
                    {lights.map((light) => {
                        const isActive = currentLight === light.color
                        return (
                            <div
                                key={light.color}
                                className="relative"
                            >
                                {/* Light housing */}
                                <div className="w-16 h-16 rounded-full bg-gray-900 border-4 border-gray-700 flex items-center justify-center overflow-hidden">
                                    {/* The light itself */}
                                    <div
                                        className={`w-12 h-12 rounded-full transition-all duration-300 ${isAnimating && isActive ? 'animate-pulse' : ''}`}
                                        style={{
                                            backgroundColor: isActive ? light.activeColor : '#1a1a1a',
                                            boxShadow: isActive
                                                ? `0 0 20px ${light.activeColor}, 0 0 40px ${light.activeColor}, 0 0 60px ${light.activeColor}40, inset 0 0 20px ${light.activeColor}60`
                                                : 'inset 0 2px 10px rgba(0,0,0,0.8)',
                                            opacity: isActive ? 1 : 0.2
                                        }}
                                    />
                                </div>

                                {/* Glow effect for active light */}
                                {isActive && (
                                    <div
                                        className="absolute inset-0 rounded-full animate-ping"
                                        style={{
                                            backgroundColor: light.activeColor,
                                            opacity: 0.3,
                                            animationDuration: '2s'
                                        }}
                                    />
                                )}
                            </div>
                        )
                    })}
                </div>

                {/* Pole attachment */}
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-4 h-8 bg-gradient-to-b from-gray-700 to-gray-800 rounded-b-lg" />
            </div>

            {/* Current State Label */}
            <div
                className="mt-12 px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-wider"
                style={{
                    backgroundColor: lights.find(l => l.color === currentLight)?.activeColor + '20',
                    color: lights.find(l => l.color === currentLight)?.activeColor,
                    border: `2px solid ${lights.find(l => l.color === currentLight)?.activeColor}50`
                }}
            >
                {lights.find(l => l.color === currentLight)?.label}
            </div>
        </div>
    )
}

// Cross Traffic Indicator
const CrossTrafficIndicator = ({ density, direction }) => {
    const isHigh = density >= 0.5
    const Arrow = direction === 'horizontal' ? ArrowRight : ArrowUp

    return (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isHigh
            ? 'bg-[var(--neon-red)]/10 border border-[var(--neon-red)]/30'
            : 'bg-[var(--neon-green)]/10 border border-[var(--neon-green)]/30'
            }`}>
            <Arrow size={16} className={isHigh ? 'text-[var(--neon-red)]' : 'text-[var(--neon-green)]'} />
            <span className={`text-xs font-medium ${isHigh ? 'text-[var(--neon-red)]' : 'text-[var(--neon-green)]'}`}>
                {isHigh ? 'BUSY' : 'CLEAR'}
            </span>
        </div>
    )
}

// Default data
const defaultData = [
    { time_sec: 0, vehicle_count: 2, average_speed_kmh: 20, density: 0.2, congestion_level: 'Low' },
    { time_sec: 1, vehicle_count: 3, average_speed_kmh: 15, density: 0.3, congestion_level: 'Medium' },
    { time_sec: 2, vehicle_count: 4, average_speed_kmh: 12, density: 0.4, congestion_level: 'Medium' },
    { time_sec: 3, vehicle_count: 5, average_speed_kmh: 8, density: 0.5, congestion_level: 'High' },
]

const LiveControlPanel = ({ camera, onClose }) => {
    const videoRef = useRef(null)
    const [isPlaying, setIsPlaying] = useState(true)
    const [isMuted, setIsMuted] = useState(true)
    const [trafficData, setTrafficData] = useState(defaultData)
    const [currentIndex, setCurrentIndex] = useState(0)
    const [actionLog, setActionLog] = useState([])
    const [showSuccess, setShowSuccess] = useState(false)
    const [successMessage, setSuccessMessage] = useState('')
    const [videoLoading, setVideoLoading] = useState(true)
    const [dataLoaded, setDataLoaded] = useState(false)

    // Cross-traffic density state (simulated for demo)
    const [crossTrafficDensity, setCrossTrafficDensity] = useState(0.3)

    // Simulate cross-traffic density changes
    useEffect(() => {
        const interval = setInterval(() => {
            setCrossTrafficDensity(0.2 + Math.random() * 0.6)
        }, 2000)
        return () => clearInterval(interval)
    }, [])

    // Load traffic data
    useEffect(() => {
        fetch('/traffic_data.json')
            .then(res => res.json())
            .then(data => {
                if (data && data.length > 0) {
                    setTrafficData(data)
                    setDataLoaded(true)
                    console.log('✅ Loaded', data.length, 'records')
                }
            })
            .catch(err => {
                console.log('Using default data:', err)
            })
    }, [])

    // Sync with video
    const handleTimeUpdate = () => {
        const video = videoRef.current
        if (!video || trafficData.length === 0) return

        const time = video.currentTime
        let best = 0
        let minDiff = Math.abs(time - trafficData[0].time_sec)
        for (let i = 1; i < trafficData.length; i++) {
            const diff = Math.abs(time - trafficData[i].time_sec)
            if (diff < minDiff) {
                minDiff = diff
                best = i
            }
        }
        setCurrentIndex(best)
    }

    // Current metrics
    const current = trafficData[currentIndex] || defaultData[0]
    const congestion = getCongestionLevel(current.density)

    // 🚦 Derive traffic light state from actual speed data
    // This creates visual sync with the video - light reflects traffic flow
    const currentLight = getLightStatusFromSpeed(current.average_speed_kmh)
    const trafficState = getTrafficStateLabel(current.average_speed_kmh)

    const aiRec = getSmartAIRecommendation(
        current.density,
        current.vehicle_count,
        current.average_speed_kmh,
        currentLight,
        crossTrafficDensity
    )

    // Chart data
    const startIdx = Math.max(0, currentIndex - 19)
    const chartData = trafficData.slice(startIdx, currentIndex + 1)

    const togglePlay = () => {
        const video = videoRef.current
        if (video) {
            if (isPlaying) video.pause()
            else video.play()
            setIsPlaying(!isPlaying)
        }
    }

    const handleAction = (action) => {
        let message = ''
        let type = 'APPROVE'

        switch (action) {
            case 'GRANT_PRIORITY':
                // In real system, this would send signal to traffic controller
                message = '🚀 Priority request sent to traffic controller!'
                type = 'PRIORITY'
                break
            case 'EXTEND_GREEN':
                // In real system, this would extend the green phase
                message = `⏱️ Green extension request: +${aiRec.extension || 20}s`
                type = 'EXTEND'
                break
            case 'HOLD_RED':
                message = '🛑 Hold pattern acknowledged - Monitoring cross-traffic'
                type = 'HOLD'
                break
            case 'OPTIMIZE':
                message = '✅ Optimization mode activated - Reducing cycle time'
                type = 'OPTIMIZE'
                break
            default:
                message = '📊 Continuing standard monitoring'
                type = 'MONITOR'
        }

        setActionLog(prev => [{
            id: Date.now(),
            type,
            message,
            time: new Date().toLocaleTimeString()
        }, ...prev].slice(0, 5))

        setSuccessMessage(message)
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 3000)
    }

    const handleOverride = () => {
        setActionLog(prev => [{
            id: Date.now(),
            type: 'OVERRIDE',
            message: '⚡ Manual override activated',
            time: new Date().toLocaleTimeString()
        }, ...prev].slice(0, 5))
        setSuccessMessage('⚡ Manual control activated!')
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 3000)
    }

    // Get button style based on action type
    const getButtonStyle = (style) => {
        switch (style) {
            case 'priority':
                return 'bg-gradient-to-r from-[var(--neon-green)] to-[#00ff88] text-[var(--bg-dark)] shadow-lg shadow-[var(--neon-green)]/50 hover:shadow-[var(--neon-green)]/80'
            case 'extend':
                return 'bg-gradient-to-r from-[var(--neon-primary)] to-[var(--neon-secondary)] text-[var(--bg-dark)] shadow-lg shadow-[var(--neon-primary)]/50'
            case 'hold':
                return 'bg-[var(--neon-orange)]/20 border-2 border-[var(--neon-orange)] text-[var(--neon-orange)]'
            case 'optimize':
                return 'bg-[var(--neon-green)]/20 border-2 border-[var(--neon-green)] text-[var(--neon-green)]'
            default:
                return 'bg-[var(--bg-glass)] border border-[var(--border-dim)] text-[var(--text-secondary)]'
        }
    }

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-7xl max-h-[95vh] overflow-y-auto bg-[var(--bg-card)] rounded-2xl border border-[var(--border-glow)] shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-[var(--bg-card)] border-b border-[var(--border-dim)] px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center border-2 border-[var(--border-glow)]" style={{ boxShadow: '0 0 15px var(--neon-primary-glow)' }}>
                            <img src="/logo.svg" alt="STIS" className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold neon-text">Live Control Panel</h2>
                            <p className="text-sm text-[var(--text-muted)]">{camera?.name || 'STIS Prototype Node'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--neon-green)]/10 border border-[var(--neon-green)]/30">
                            <div className="w-2 h-2 rounded-full bg-[var(--neon-green)] animate-pulse" />
                            <span className="text-xs font-medium text-[var(--neon-green)]">LIVE</span>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--bg-glass)] text-[var(--text-secondary)]">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Success Toast */}
                {showSuccess && (
                    <div className="absolute top-20 right-6 z-20 p-4 rounded-xl bg-[var(--neon-green)]/20 border border-[var(--neon-green)]/50 text-[var(--neon-green)] flex items-center gap-2 animate-fade-in">
                        <CheckCircle2 size={20} />
                        <span>{successMessage}</span>
                    </div>
                )}

                {/* Main Grid */}
                <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Video + Charts */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Video */}
                        <div className="video-container relative group">
                            {videoLoading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-dark)] z-10">
                                    <div className="spinner" />
                                </div>
                            )}
                            <video
                                ref={videoRef}
                                className="w-full aspect-video object-cover bg-[var(--bg-dark)]"
                                autoPlay
                                loop
                                muted
                                playsInline
                                onLoadedData={() => setVideoLoading(false)}
                                onTimeUpdate={handleTimeUpdate}
                            >
                                <source src="/traffic_dashboard.mp4" type="video/mp4" />
                            </video>
                            <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={togglePlay} className="p-2 rounded-lg bg-black/50 text-white">
                                    {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                                </button>
                                <button onClick={() => setIsMuted(!isMuted)} className="p-2 rounded-lg bg-black/50 text-white">
                                    {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Charts */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="chart-container">
                                <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
                                    <Car size={16} className="text-[var(--neon-primary)]" />
                                    Vehicle Count
                                </h4>
                                <ResponsiveContainer width="100%" height={120}>
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="vGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#00f5ff" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#00f5ff" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                        <XAxis dataKey="time_sec" stroke="rgba(255,255,255,0.3)" tickFormatter={v => `${v}s`} />
                                        <YAxis stroke="rgba(255,255,255,0.3)" />
                                        <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.8)', border: 'none' }} />
                                        <Area type="monotone" dataKey="vehicle_count" stroke="#00f5ff" fill="url(#vGrad)" name="Vehicles" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="chart-container">
                                <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
                                    <Gauge size={16} className="text-[var(--neon-secondary)]" />
                                    Density
                                </h4>
                                <ResponsiveContainer width="100%" height={120}>
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                        <XAxis dataKey="time_sec" stroke="rgba(255,255,255,0.3)" tickFormatter={v => `${v}s`} />
                                        <YAxis stroke="rgba(255,255,255,0.3)" domain={[0, 1]} />
                                        <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.8)', border: 'none' }} />
                                        <Line type="monotone" dataKey="density" stroke="#b026ff" strokeWidth={2} dot={false} name="Actual" />
                                        <Line type="monotone" dataKey="predicted_density" stroke="#ff073a" strokeWidth={2} strokeDasharray="3 3" dot={false} name="Predicted" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Right: Metrics + AI */}
                    <div className="space-y-6">
                        {/* Current Metrics */}
                        <div className="metric-card">
                            <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-4 flex items-center gap-2">
                                <Activity size={16} />
                                Road A - Current Metrics
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-glass)]">
                                    <div className="flex items-center gap-3">
                                        <Car size={20} className="text-[var(--neon-primary)]" />
                                        <span>Vehicles</span>
                                    </div>
                                    <span className="text-2xl font-bold neon-text">{current.vehicle_count}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-glass)]">
                                    <div className="flex items-center gap-3">
                                        <Gauge size={20} className="text-[var(--neon-secondary)]" />
                                        <span>Speed</span>
                                    </div>
                                    <span className="text-2xl font-bold text-[var(--neon-secondary)]">
                                        {current.average_speed_kmh.toFixed(1)} <span className="text-sm">km/h</span>
                                    </span>
                                </div>
                                <div className="p-4 rounded-xl bg-[var(--bg-glass)]">
                                    <div className="flex items-center justify-between mb-2">
                                        <span>Congestion</span>
                                        <span className="px-2 py-0.5 rounded-full text-sm" style={{ backgroundColor: `${congestion.color}20`, color: congestion.color }}>
                                            {congestion.level}
                                        </span>
                                    </div>
                                    <div className="h-2 bg-[var(--bg-dark)] rounded-full overflow-hidden">
                                        <div className="h-full rounded-full transition-all" style={{ width: `${current.density * 100}%`, backgroundColor: congestion.color }} />
                                    </div>
                                </div>
                                <div className="p-4 rounded-xl bg-[rgba(255,165,0,0.05)] border border-[rgba(255,165,0,0.2)]">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-semibold text-[rgba(255,165,0,0.8)] flex items-center gap-1">
                                            <Brain size={12} /> AI DENSITY FORECAST (+3s)
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-[var(--text-muted)]">Current Density</span>
                                            <span className="text-lg font-bold text-[var(--neon-primary)]">{(current.density * 100).toFixed(0)}%</span>
                                        </div>
                                        <div className="text-2xl text-[var(--text-muted)]">→</div>
                                        <div className="flex flex-col text-right">
                                            <span className="text-xs text-[var(--text-muted)]">Predicted Density</span>
                                            <span className="text-lg font-bold text-[rgba(255,165,0,1)]">{((current.predicted_density || current.density) * 100).toFixed(0)}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 🚦 Traffic Light + AI Recommendation Grid */}
                        <div className="metric-card">
                            <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-4 flex items-center gap-2">
                                <Zap size={16} className="text-[var(--neon-primary)]" />
                                Smart Intersection Control
                            </h3>

                            {/* Cross Traffic Status */}
                            <div className="mb-4 p-3 rounded-xl bg-[var(--bg-glass)]">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-[var(--text-muted)]">Cross-Traffic Status (Roads B, C, D)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CrossTrafficIndicator density={crossTrafficDensity} direction="horizontal" />
                                    <div className="flex-1 h-2 bg-[var(--bg-dark)] rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all"
                                            style={{
                                                width: `${crossTrafficDensity * 100}%`,
                                                backgroundColor: crossTrafficDensity >= 0.5 ? '#ff073a' : '#39ff14'
                                            }}
                                        />
                                    </div>
                                    <span className="text-xs text-[var(--text-muted)]">{(crossTrafficDensity * 100).toFixed(0)}%</span>
                                </div>
                            </div>

                            {/* Two Column Layout: Traffic Light + AI Recommendation */}
                            <div className="grid grid-cols-2 gap-4">
                                {/* Col 1: Visual Traffic Light */}
                                <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-[var(--bg-glass)]">
                                    <TrafficLight currentLight={currentLight} isAnimating={true} speed={current.average_speed_kmh} />

                                    {/* Speed-based Traffic State Indicator */}
                                    <div
                                        className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300"
                                        style={{
                                            backgroundColor: `${trafficState.color}20`,
                                            border: `2px solid ${trafficState.color}50`
                                        }}
                                    >
                                        <Gauge size={16} style={{ color: trafficState.color }} />
                                        <span
                                            className="text-lg font-bold font-mono"
                                            style={{ color: trafficState.color }}
                                        >
                                            {current.average_speed_kmh.toFixed(1)} km/h
                                        </span>
                                    </div>
                                </div>

                                {/* Col 2: AI Recommendation */}
                                <div className="flex flex-col">
                                    <div className={`flex-1 p-4 rounded-xl border ${aiRec.urgency === 'critical' ? 'bg-[var(--neon-red)]/10 border-[var(--neon-red)]/30' :
                                        aiRec.urgency === 'warning' ? 'bg-[var(--neon-orange)]/10 border-[var(--neon-orange)]/30' :
                                            aiRec.urgency === 'success' ? 'bg-[var(--neon-green)]/10 border-[var(--neon-green)]/30' :
                                                'bg-[var(--neon-primary)]/10 border-[var(--neon-primary)]/30'
                                        }`}>
                                        <div className="flex items-start gap-2 mb-3">
                                            {aiRec.action === 'GRANT_PRIORITY' && <Rocket size={18} className="text-[var(--neon-green)]" />}
                                            {aiRec.action === 'EXTEND_GREEN' && <TrendingUp size={18} className="text-[var(--neon-primary)]" />}
                                            {aiRec.action === 'HOLD_RED' && <StopCircle size={18} className="text-[var(--neon-orange)]" />}
                                            {aiRec.action === 'OPTIMIZE' && <CheckCircle2 size={18} className="text-[var(--neon-green)]" />}
                                            {aiRec.action === 'MONITOR' && <Activity size={18} className="text-[var(--neon-primary)]" />}
                                        </div>
                                        <p className="text-sm font-medium mb-2">{aiRec.message}</p>
                                        <p className="text-xs text-[var(--text-muted)]">{aiRec.details}</p>
                                    </div>

                                    {/* Action Button */}
                                    <button
                                        onClick={() => handleAction(aiRec.action)}
                                        className={`mt-3 w-full py-3 px-4 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] ${getButtonStyle(aiRec.buttonStyle)}`}
                                    >
                                        {aiRec.buttonLabel}
                                    </button>

                                    {/* Override Button */}
                                    <button
                                        onClick={handleOverride}
                                        className="mt-2 w-full py-2 px-4 rounded-xl text-sm border border-[var(--border-dim)] text-[var(--text-secondary)] hover:bg-[var(--bg-glass)] flex items-center justify-center gap-2"
                                    >
                                        <Hand size={14} />
                                        Manual Override
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Action Log */}
                        {actionLog.length > 0 && (
                            <div className="metric-card">
                                <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">Action Log</h3>
                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                    {actionLog.map(a => (
                                        <div key={a.id} className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-glass)] text-sm">
                                            <span className={
                                                a.type === 'PRIORITY' || a.type === 'APPROVE' ? 'text-[var(--neon-green)]' :
                                                    a.type === 'EXTEND' ? 'text-[var(--neon-primary)]' :
                                                        a.type === 'OVERRIDE' ? 'text-[var(--neon-orange)]' :
                                                            'text-[var(--text-secondary)]'
                                            }>
                                                {a.message}
                                            </span>
                                            <span className="text-[var(--text-muted)] text-xs">{a.time}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Data Status */}
                        <div className="text-center text-xs text-[var(--text-muted)]">
                            {dataLoaded ? `📊 ${trafficData.length} data points loaded` : 'Using sample data'}
                            <br />
                            Time: {current.time_sec.toFixed(2)}s | Index: {currentIndex}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default LiveControlPanel

