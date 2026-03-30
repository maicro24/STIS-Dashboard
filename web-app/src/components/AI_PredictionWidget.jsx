import { useState, useEffect } from 'react'
import { supabase } from '../config/supabase'
import { Brain, Clock, AlertCircle, Loader2 } from 'lucide-react'

// ─── Helpers ───────────────────────────────────────────────────────
const getColorCode = (density) => {
    if (density < 50) return '#39ff14' // Green
    if (density < 75) return '#ffaa00' // Yellow
    return '#ff073a' // Red
}

const getBgColor = (density) => {
    if (density < 50) return 'rgba(57, 255, 20, 0.15)'
    if (density < 75) return 'rgba(255, 170, 0, 0.15)'
    return 'rgba(255, 7, 58, 0.15)'
}

const formatCustomTime = (isoString) => {
    if (!isoString) return 'Never'
    const date = new Date(isoString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// ═══════════════════════════════════════════════════════════════════
// UI COMPONENT
// ═══════════════════════════════════════════════════════════════════
const AI_PredictionWidget = () => {
    const [prediction, setPrediction] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Fetch the single most recent traffic log row as our "prediction"
    const fetchLatestPrediction = async () => {
        try {
            const { data, error } = await supabase
                .from('traffic_logs')
                .select('density, congestion_level, created_at')
                .order('created_at', { ascending: false })
                .limit(1)
                .single()

            if (error) {
                // Ignore "no rows" error for fresh deployments
                if (error.code === 'PGRST116') {
                    setPrediction(null)
                } else {
                    throw error
                }
            } else if (data) {
                // Map traffic_logs fields to what the widget expects
                setPrediction({
                    predicted_density: Math.round((data.density || 0) * 100),
                    status: data.congestion_level || 'OK',
                    target_date: data.created_at
                })
            }
        } catch (err) {
            console.error('Prediction Fetch Error:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // Polling every 10s to stay in sync with live uploads
    useEffect(() => {
        fetchLatestPrediction()
        const interval = setInterval(fetchLatestPrediction, 10000)
        return () => clearInterval(interval)
    }, [])


    if (loading && !prediction) {
        return (
            <div className="flex flex-col items-center justify-center p-6 bg-[var(--bg-dark,#0d1117)] border border-slate-800 rounded-2xl h-64 text-slate-400">
                <Loader2 size={32} className="animate-spin mb-4 text-[#00f5ff]" />
                <p className="text-sm font-semibold tracking-wide uppercase">Connecting to AI Core...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-6 bg-red-500/10 border border-red-500/30 rounded-2xl h-64 text-red-500">
                <AlertCircle size={32} className="mb-4" />
                <p className="text-sm font-semibold text-center leading-relaxed">
                    ML Worker Unavailable<br/>
                    <span className="text-xs opacity-70">Check backend logs</span>
                </p>
            </div>
        )
    }

    if (!prediction) {
        return (
            <div className="flex flex-col items-center justify-center p-6 bg-[var(--bg-dark,#0d1117)] border border-slate-800 rounded-2xl h-64 text-slate-500">
                <Brain size={32} className="mb-4 opacity-50" />
                <p className="text-sm font-semibold text-center">
                    Awaiting ML Predictions...<br/>
                    <span className="text-xs opacity-70 font-normal">Start the Python worker to see data here.</span>
                </p>
            </div>
        )
    }

    const value = prediction.predicted_density || 0
    const color = getColorCode(value)
    const bgColor = getBgColor(value)
    const radius = 64
    const circumference = 2 * Math.PI * radius
    const strokeDashoffset = circumference - (value / 100) * circumference

    return (
        <div className="relative p-6 bg-[var(--bg-dark,#0d1117)] border border-slate-800 rounded-2xl overflow-hidden group hover:border-[#00f5ff]/50 transition-colors duration-500">
            {/* Background Glow */}
            <div 
                className="absolute inset-0 opacity-10 blur-3xl pointer-events-none transition-colors duration-1000"
                style={{ backgroundColor: color }}
            />

            {/* Header */}
            <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-3 text-slate-200">
                    <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/30">
                        <Brain size={18} className="text-[#00f5ff]" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider">AI Forecast</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Upcoming Traffic Density</p>
                    </div>
                </div>
                
                {/* Status Badge */}
                <div 
                    className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border backdrop-blur-md transition-colors duration-500"
                    style={{ backgroundColor: bgColor, borderColor: `${color}40`, color: color }}
                >
                    {prediction.status || 'Calculating'}
                </div>
            </div>

            {/* Circular Gauge */}
            <div className="flex justify-center items-center mb-6 relative z-10 scale-110">
                <div className="relative flex items-center justify-center w-40 h-40">
                    <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                        {/* Background Track */}
                        <circle
                            cx="80" cy="80" r={radius}
                            stroke="currentColor" strokeWidth="10"
                            fill="transparent"
                            className="text-slate-800"
                        />
                        {/* Progress Arc */}
                        <circle
                            cx="80" cy="80" r={radius}
                            stroke={color} strokeWidth="10"
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-out z-10 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                            style={{ 
                                filter: `drop-shadow(0 0 12px ${color}80)` 
                            }}
                        />
                    </svg>

                    {/* Center Content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                        <span 
                            className="text-4xl font-black tracking-tighter"
                            style={{ 
                                color: color,
                                textShadow: `0 0 20px ${color}50`
                            }}
                        >
                            {Math.round(value)}<span className="text-lg opacity-60 ml-0.5">%</span>
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mt-2">
                            Predicted
                        </span>
                    </div>
                </div>
            </div>

            {/* Footer / Timestamp */}
            <div className="flex items-center justify-center gap-2 pt-4 border-t border-slate-800/50 text-xs text-slate-500 relative z-10">
                <Clock size={12} />
                <span>Updated: <strong className="text-slate-400 font-mono tracking-tight">{formatCustomTime(prediction.target_date)}</strong></span>
            </div>
        </div>
    )
}

export default AI_PredictionWidget
