import { useState, useEffect, useCallback, useMemo } from 'react'
import {
    RefreshCw,
    Download,
    Database,
    Filter,
    Clock,
    Cpu,
    Activity,
    ChevronDown,
    AlertCircle,
    Loader2,
    FileSpreadsheet,
    Radio,
    TrendingUp,
    TrendingDown,
    BarChart3,
    Brain,
    FileText,
    PieChart,
    ArrowUpRight,
    ArrowDownRight,
    Minus,
    Zap,
} from 'lucide-react'
import { supabase } from '../config/supabase'
import * as XLSX from 'xlsx'

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const BOX_OPTIONS = [
    { value: 'all', label: 'All Boxes' },
    { value: 'Box-01', label: 'Box-01' },
    { value: 'Box-02', label: 'Box-02' },
    { value: 'Box-03', label: 'Box-03' },
]

/**
 * Deterministic box assignment based on the row id so the simulated
 * value doesn't shuffle every re-render.
 */
const assignBoxId = (id) => {
    if (!id) return 'Box-01'
    const hash = String(id)
        .split('')
        .reduce((acc, c) => acc + c.charCodeAt(0), 0)
    const mod = hash % 3
    if (mod === 0) return 'Box-01'
    if (mod === 1) return 'Box-02'
    return 'Box-03'
}

const formatTimestamp = (iso) => {
    if (!iso) return 'â€”'
    const d = new Date(iso)
    return d.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    })
}

const densityPercent = (val) => {
    if (val == null) return 0
    // density may already be 0â€“1 or 0â€“100
    return val > 1 ? Math.round(val) : Math.round(val * 100)
}

const densityBadge = (pct) => {
    if (pct > 80) return { bg: 'rgba(255,7,58,0.18)', border: 'rgba(255,7,58,0.45)', text: '#ff073a', glow: '0 0 8px rgba(255,7,58,0.3)' }
    if (pct >= 50) return { bg: 'rgba(255,165,0,0.15)', border: 'rgba(255,165,0,0.4)', text: '#ffa500', glow: '0 0 8px rgba(255,165,0,0.25)' }
    return { bg: 'rgba(57,255,20,0.15)', border: 'rgba(57,255,20,0.4)', text: '#39ff14', glow: '0 0 8px rgba(57,255,20,0.25)' }
}

const congestionStyle = (level) => {
    const l = (level || '').toLowerCase()
    if (l === 'critical') return { color: '#ff073a' }
    if (l === 'high') return { color: '#ff6600' }
    if (l === 'medium') return { color: '#ffff00' }
    return { color: '#39ff14' }
}

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const DataLogs = () => {
    const [rows, setRows] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [boxFilter, setBoxFilter] = useState('all')
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [refreshing, setRefreshing] = useState(false)
    const [lastRefresh, setLastRefresh] = useState(null)
    const [realtimeStatus, setRealtimeStatus] = useState('connecting') // 'connecting' | 'connected' | 'error'
    const [newRowFlash, setNewRowFlash] = useState(null) // id of newly inserted row to flash

    // â”€â”€ Fetch â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const fetchData = useCallback(async () => {
        try {
            setRefreshing(true)
            setError(null)

            const { data, error: sbError } = await supabase
                .from('traffic_logs')
                .select('id, created_at, vehicle_count, average_speed, density, congestion_level, current_light, timer_remaining, ai_suggestion')
                .order('created_at', { ascending: false })
                .limit(500)

            if (sbError) throw sbError

            // Attach simulated box_id
            const enriched = (data || []).map((r) => ({
                ...r,
                box_id: assignBoxId(r.id),
            }))

            setRows(enriched)
            setLastRefresh(new Date())
        } catch (err) {
            console.error('Supabase fetch error:', err)
            setError(err.message || 'Failed to fetch data')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    // â”€â”€ Initial fetch â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    useEffect(() => {
        fetchData()
    }, [fetchData])

    // â”€â”€ Real-time subscription â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    useEffect(() => {
        const channel = supabase
            .channel('traffic_logs_realtime')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'traffic_logs',
                },
                (payload) => {
                    console.log('ðŸ”” New row inserted:', payload.new)
                    const newRow = {
                        ...payload.new,
                        box_id: assignBoxId(payload.new.id),
                    }
                    // Add new row at the top
                    setRows((prev) => [newRow, ...prev])
                    setLastRefresh(new Date())

                    // Flash effect for new row
                    setNewRowFlash(payload.new.id)
                    setTimeout(() => setNewRowFlash(null), 3000)
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'traffic_logs',
                },
                (payload) => {
                    console.log('âœï¸ Row updated:', payload.new)
                    setRows((prev) =>
                        prev.map((r) =>
                            r.id === payload.new.id
                                ? { ...payload.new, box_id: assignBoxId(payload.new.id) }
                                : r
                        )
                    )
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'traffic_logs',
                },
                (payload) => {
                    console.log('ðŸ—‘ï¸ Row deleted:', payload.old)
                    setRows((prev) => prev.filter((r) => r.id !== payload.old.id))
                }
            )
            .subscribe((status) => {
                console.log('ðŸ“¡ Realtime status:', status)
                if (status === 'SUBSCRIBED') {
                    setRealtimeStatus('connected')
                } else if (status === 'CHANNEL_ERROR') {
                    setRealtimeStatus('error')
                }
            })

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    // â”€â”€ Filter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const filtered = useMemo(() => {
        if (boxFilter === 'all') return rows
        return rows.filter((r) => r.box_id.startsWith(boxFilter))
    }, [rows, boxFilter])

    // â”€â”€ Excel export â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const exportToExcel = () => {
        if (filtered.length === 0) return

        const sheetData = filtered.map((r, idx) => ({
            '#': idx + 1,
            'Time': formatTimestamp(r.created_at),
            'Source (Box)': r.box_id,
            'Vehicle Count': r.vehicle_count != null ? Number(r.vehicle_count) : '',
            'Avg Speed (km/h)': r.average_speed != null ? Math.round(Number(r.average_speed) * 10) / 10 : '',
            'Density (%)': r.density != null ? densityPercent(r.density) : '',
            'Congestion Level': r.congestion_level || '',
            'Current Light': r.current_light || '',
            'Timer Remaining (s)': r.timer_remaining != null ? Number(r.timer_remaining) : '',
            'AI Suggestion': r.ai_suggestion || '',
        }))

        const ws = XLSX.utils.json_to_sheet(sheetData)

        // Smart auto-width: measure actual content width
        const headers = Object.keys(sheetData[0])
        const colWidths = headers.map((key) => {
            const maxContentLen = sheetData.reduce((max, row) => {
                const val = String(row[key] ?? '')
                return Math.max(max, val.length)
            }, key.length)
            return { wch: Math.min(maxContentLen + 3, 45) }
        })
        ws['!cols'] = colWidths

        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Traffic Logs')

        const now = new Date()
        const timestamp = now.toISOString().slice(0, 16).replace('T', '_').replace(':', '-')
        const filename = `STIS_Traffic_Logs_${timestamp}.xlsx`
        XLSX.writeFile(wb, filename)
    }

    // â”€â”€ Stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const stats = useMemo(() => {
        const total = filtered.length
        const avgSpeed =
            total > 0
                ? (filtered.reduce((s, r) => s + (Number(r.average_speed) || 0), 0) / total).toFixed(1)
                : '0.0'
        const avgDensity =
            total > 0
                ? densityPercent(filtered.reduce((s, r) => s + (Number(r.density) || 0), 0) / total)
                : 0
        const highCongestion = filtered.filter(
            (r) => (r.congestion_level || '').toLowerCase() === 'high' || (r.congestion_level || '').toLowerCase() === 'critical'
        ).length
        return { total, avgSpeed, avgDensity, highCongestion }
    }, [filtered])

    // â”€â”€ Section toggle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const [activeSection, setActiveSection] = useState('table') // 'table' | 'analytics'

    // â”€â”€ ML Analytics Engine â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const analytics = useMemo(() => {
        if (filtered.length === 0) return null

        const data = filtered

        // 1. Per-Box Statistics
        const boxStats = {}
        data.forEach((r) => {
            if (!boxStats[r.box_id]) {
                boxStats[r.box_id] = { speeds: [], densities: [], vehicles: [], count: 0, congestionCounts: {} }
            }
            const b = boxStats[r.box_id]
            b.count++
            if (r.average_speed != null) b.speeds.push(Number(r.average_speed))
            if (r.density != null) b.densities.push(Number(r.density))
            if (r.vehicle_count != null) b.vehicles.push(Number(r.vehicle_count))
            const cl = (r.congestion_level || 'unknown').toLowerCase()
            b.congestionCounts[cl] = (b.congestionCounts[cl] || 0) + 1
        })

        const boxSummary = Object.entries(boxStats).map(([box, s]) => {
            const avg = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
            const max = (arr) => arr.length > 0 ? Math.max(...arr) : 0
            const min = (arr) => arr.length > 0 ? Math.min(...arr) : 0
            const std = (arr) => {
                if (arr.length < 2) return 0
                const m = avg(arr)
                return Math.sqrt(arr.reduce((sum, v) => sum + (v - m) ** 2, 0) / arr.length)
            }
            return {
                box,
                count: s.count,
                avgSpeed: avg(s.speeds).toFixed(1),
                maxSpeed: max(s.speeds).toFixed(1),
                minSpeed: min(s.speeds).toFixed(1),
                stdSpeed: std(s.speeds).toFixed(2),
                avgDensity: densityPercent(avg(s.densities)),
                maxDensity: densityPercent(max(s.densities)),
                avgVehicles: avg(s.vehicles).toFixed(0),
                maxVehicles: max(s.vehicles),
                dominantCongestion: Object.entries(s.congestionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'â€”',
            }
        })

        // 2. Congestion Distribution
        const congestionDist = {}
        data.forEach((r) => {
            const cl = (r.congestion_level || 'Unknown')
            congestionDist[cl] = (congestionDist[cl] || 0) + 1
        })
        const congestionPcts = Object.entries(congestionDist).map(([level, count]) => ({
            level,
            count,
            pct: ((count / data.length) * 100).toFixed(1),
        })).sort((a, b) => b.count - a.count)

        // 3. Time-based Trends (hourly averages)
        const hourlyData = {}
        data.forEach((r) => {
            if (!r.created_at) return
            const h = new Date(r.created_at).getHours()
            if (!hourlyData[h]) hourlyData[h] = { speeds: [], densities: [], vehicles: [], count: 0 }
            hourlyData[h].count++
            if (r.average_speed != null) hourlyData[h].speeds.push(Number(r.average_speed))
            if (r.density != null) hourlyData[h].densities.push(Number(r.density))
            if (r.vehicle_count != null) hourlyData[h].vehicles.push(Number(r.vehicle_count))
        })
        const hourlyTrends = Object.entries(hourlyData).map(([hour, d]) => ({
            hour: Number(hour),
            label: `${String(hour).padStart(2, '0')}:00`,
            avgSpeed: d.speeds.length > 0 ? (d.speeds.reduce((a, b) => a + b, 0) / d.speeds.length).toFixed(1) : 0,
            avgDensity: d.densities.length > 0 ? densityPercent(d.densities.reduce((a, b) => a + b, 0) / d.densities.length) : 0,
            avgVehicles: d.vehicles.length > 0 ? (d.vehicles.reduce((a, b) => a + b, 0) / d.vehicles.length).toFixed(0) : 0,
            records: d.count,
        })).sort((a, b) => a.hour - b.hour)

        // 4. Peak Hours
        const peakHour = hourlyTrends.length > 0 ? hourlyTrends.reduce((max, h) => Number(h.avgDensity) > Number(max.avgDensity) ? h : max, hourlyTrends[0]) : null
        const quietHour = hourlyTrends.length > 0 ? hourlyTrends.reduce((min, h) => Number(h.avgDensity) < Number(min.avgDensity) ? h : min, hourlyTrends[0]) : null

        // 5. Speed-Density Correlation
        const speeds = data.filter(r => r.average_speed != null && r.density != null)
        let correlation = 0
        if (speeds.length > 2) {
            const avgS = speeds.reduce((s, r) => s + Number(r.average_speed), 0) / speeds.length
            const avgD = speeds.reduce((s, r) => s + Number(r.density), 0) / speeds.length
            let num = 0, denS = 0, denD = 0
            speeds.forEach((r) => {
                const ds = Number(r.average_speed) - avgS
                const dd = Number(r.density) - avgD
                num += ds * dd
                denS += ds * ds
                denD += dd * dd
            })
            correlation = denS > 0 && denD > 0 ? num / Math.sqrt(denS * denD) : 0
        }

        // 6. Anomaly Detection (values > 2 std deviations from mean)
        const allSpeeds = data.filter(r => r.average_speed != null).map(r => Number(r.average_speed))
        const allDensities = data.filter(r => r.density != null).map(r => Number(r.density))
        const meanSpeed = allSpeeds.length > 0 ? allSpeeds.reduce((a, b) => a + b, 0) / allSpeeds.length : 0
        const stdSpeed = allSpeeds.length > 1 ? Math.sqrt(allSpeeds.reduce((s, v) => s + (v - meanSpeed) ** 2, 0) / allSpeeds.length) : 0
        const speedAnomalies = data.filter(r => r.average_speed != null && Math.abs(Number(r.average_speed) - meanSpeed) > 2 * stdSpeed).length
        const meanDensity = allDensities.length > 0 ? allDensities.reduce((a, b) => a + b, 0) / allDensities.length : 0
        const stdDensity = allDensities.length > 1 ? Math.sqrt(allDensities.reduce((s, v) => s + (v - meanDensity) ** 2, 0) / allDensities.length) : 0
        const densityAnomalies = data.filter(r => r.density != null && Math.abs(Number(r.density) - meanDensity) > 2 * stdDensity).length

        // 7. AI Suggestion frequency
        const aiSuggestions = {}
        data.forEach((r) => {
            if (r.ai_suggestion) {
                const key = r.ai_suggestion.length > 50 ? r.ai_suggestion.slice(0, 50) + 'â€¦' : r.ai_suggestion
                aiSuggestions[key] = (aiSuggestions[key] || 0) + 1
            }
        })
        const topSuggestions = Object.entries(aiSuggestions)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([text, count]) => ({ text, count, pct: ((count / data.length) * 100).toFixed(1) }))

        // 8. Traffic Light Distribution
        const lightDist = {}
        data.forEach((r) => {
            const light = (r.current_light || 'unknown').toLowerCase()
            lightDist[light] = (lightDist[light] || 0) + 1
        })

        // 9. Data Quality
        const nullFields = {
            vehicle_count: data.filter(r => r.vehicle_count == null).length,
            average_speed: data.filter(r => r.average_speed == null).length,
            density: data.filter(r => r.density == null).length,
            congestion_level: data.filter(r => !r.congestion_level).length,
            ai_suggestion: data.filter(r => !r.ai_suggestion).length,
        }
        const completeness = ((1 - Object.values(nullFields).reduce((a, b) => a + b, 0) / (data.length * 5)) * 100).toFixed(1)

        return {
            boxSummary,
            congestionPcts,
            hourlyTrends,
            peakHour,
            quietHour,
            correlation: correlation.toFixed(3),
            speedAnomalies,
            densityAnomalies,
            topSuggestions,
            lightDist,
            completeness,
            totalRecords: data.length,
            meanSpeed: meanSpeed.toFixed(1),
            stdSpeed: stdSpeed.toFixed(2),
            meanDensity: (meanDensity > 1 ? meanDensity : meanDensity * 100).toFixed(1),
            stdDensity: stdDensity.toFixed(3),
        }
    }, [filtered])

    // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* â”€â”€ Toolbar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="flex-shrink-0 p-5 border-b border-[var(--border-dim)]">
                {/* Title row */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{
                                background: 'linear-gradient(135deg, var(--neon-primary), var(--neon-secondary))',
                                boxShadow: '0 0 20px var(--neon-primary-glow)',
                            }}>
                            <Database size={20} className="text-[var(--bg-dark)]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                Data Logs
                                <span className="text-xs font-normal px-2 py-0.5 rounded-full flex items-center gap-1.5"
                                    style={{
                                        background: realtimeStatus === 'connected'
                                            ? 'var(--neon-green)'
                                            : realtimeStatus === 'connecting'
                                                ? 'var(--neon-orange)'
                                                : 'var(--neon-red)',
                                        color: 'var(--bg-dark)',
                                        boxShadow: realtimeStatus === 'connected'
                                            ? '0 0 12px rgba(57,255,20,0.5)'
                                            : '0 0 8px var(--neon-primary-glow)',
                                    }}>
                                    <span className="relative flex h-2 w-2">
                                        {realtimeStatus === 'connected' && (
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--bg-dark)] opacity-50"></span>
                                        )}
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--bg-dark)]"></span>
                                    </span>
                                    {realtimeStatus === 'connected' ? 'LIVE' : realtimeStatus === 'connecting' ? 'CONNECTING' : 'OFFLINE'}
                                </span>
                            </h2>
                            <p className="text-xs text-[var(--text-muted)]">
                                {lastRefresh
                                    ? `Last update: ${lastRefresh.toLocaleTimeString()} Â· ${rows.length} records`
                                    : 'Connecting to Supabaseâ€¦'}
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        {/* Box filter dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                                style={{
                                    background: 'var(--bg-glass)',
                                    border: '1px solid var(--border-dim)',
                                    color: 'var(--text-primary)',
                                }}
                            >
                                <Filter size={16} className="text-[var(--neon-primary)]" />
                                {BOX_OPTIONS.find((o) => o.value === boxFilter)?.label}
                                <ChevronDown size={14} className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {dropdownOpen && (
                                <div
                                    className="absolute right-0 mt-2 w-52 rounded-xl overflow-hidden z-50 animate-fade-in"
                                    style={{
                                        background: 'var(--bg-card)',
                                        border: '1px solid var(--border-glow)',
                                        boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 15px var(--neon-primary-glow)',
                                    }}
                                >
                                    {BOX_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => {
                                                setBoxFilter(opt.value)
                                                setDropdownOpen(false)
                                            }}
                                            className="w-full text-left px-4 py-3 text-sm transition-colors flex items-center gap-2"
                                            style={{
                                                color: boxFilter === opt.value ? 'var(--neon-primary)' : 'var(--text-secondary)',
                                                background: boxFilter === opt.value ? 'rgba(0,245,255,0.08)' : 'transparent',
                                            }}
                                            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,245,255,0.06)')}
                                            onMouseLeave={(e) => (e.currentTarget.style.background = boxFilter === opt.value ? 'rgba(0,245,255,0.08)' : 'transparent')}
                                        >
                                            <Radio size={14} style={{ color: boxFilter === opt.value ? 'var(--neon-primary)' : 'var(--text-muted)' }} />
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Refresh */}
                        <button
                            onClick={fetchData}
                            disabled={refreshing}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.03]"
                            style={{
                                background: 'var(--bg-glass)',
                                border: '1px solid var(--border-dim)',
                                color: 'var(--neon-primary)',
                            }}
                        >
                            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                            Refresh
                        </button>

                        {/* Export */}
                        <button
                            onClick={exportToExcel}
                            disabled={filtered.length === 0}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.03]"
                            style={{
                                background: 'linear-gradient(135deg, var(--neon-primary), var(--neon-secondary))',
                                color: 'var(--bg-dark)',
                                boxShadow: '0 4px 20px var(--neon-primary-glow)',
                                opacity: filtered.length === 0 ? 0.5 : 1,
                            }}
                        >
                            <FileSpreadsheet size={16} />
                            Export&nbsp;.xlsx
                        </button>
                    </div>
                </div>

                {/* â”€â”€ Stat cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {[
                        { icon: <Database size={18} />, label: 'Total Records', value: stats.total, accent: 'var(--neon-primary)' },
                        { icon: <Activity size={18} />, label: 'Avg Speed', value: `${stats.avgSpeed} km/h`, accent: 'var(--neon-green)' },
                        { icon: <TrendingUp size={18} />, label: 'Avg Density', value: `${stats.avgDensity}%`, accent: 'var(--neon-orange)' },
                        { icon: <AlertCircle size={18} />, label: 'High Congestion', value: stats.highCongestion, accent: 'var(--neon-red)' },
                    ].map((s, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)' }}>
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${s.accent}15`, color: s.accent, boxShadow: `0 0 12px ${s.accent}25` }}>
                                {s.icon}
                            </div>
                            <div>
                                <p className="text-lg font-bold leading-tight" style={{ color: s.accent }}>{s.value}</p>
                                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-medium">{s.label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* â”€â”€ Section Toggle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                <div className="flex items-center gap-2 mt-1">
                    <button onClick={() => setActiveSection('table')} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all" style={{ background: activeSection === 'table' ? 'linear-gradient(135deg, var(--neon-primary), var(--neon-secondary))' : 'var(--bg-glass)', color: activeSection === 'table' ? 'var(--bg-dark)' : 'var(--text-secondary)', border: activeSection === 'table' ? 'none' : '1px solid var(--border-dim)', boxShadow: activeSection === 'table' ? '0 0 15px var(--neon-primary-glow)' : 'none' }}>
                        <Database size={16} /> Data Table
                    </button>
                    <button onClick={() => setActiveSection('analytics')} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all" style={{ background: activeSection === 'analytics' ? 'linear-gradient(135deg, var(--neon-secondary), var(--neon-primary))' : 'var(--bg-glass)', color: activeSection === 'analytics' ? 'var(--bg-dark)' : 'var(--text-secondary)', border: activeSection === 'analytics' ? 'none' : '1px solid var(--border-dim)', boxShadow: activeSection === 'analytics' ? '0 0 15px rgba(176,38,255,0.4)' : 'none' }}>
                        <Brain size={16} /> ML Analytics
                    </button>
                </div>
            </div>

            {/* â”€â”€ Content Area â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="flex-1 overflow-auto px-5 pb-5">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                        <Loader2 size={36} className="animate-spin text-[var(--neon-primary)]" />
                        <p className="text-sm text-[var(--text-muted)]">Fetching traffic logsâ€¦</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                        <AlertCircle size={40} className="text-[var(--neon-red)]" />
                        <p className="text-sm text-[var(--neon-red)] font-medium">{error}</p>
                        <button onClick={fetchData} className="mt-2 px-4 py-2 rounded-lg text-sm" style={{ border: '1px solid var(--neon-primary)', color: 'var(--neon-primary)' }}>Try Again</button>
                    </div>
                ) : (
                    <>
                        {/* â”€â”€ ML Analytics Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                        {activeSection === 'analytics' && (
                            <div className="space-y-4">
                                {!analytics ? (
                                    <div className="flex flex-col items-center justify-center h-64 gap-3">
                                        <Brain size={48} className="text-[var(--text-muted)]" />
                                        <p className="text-sm text-[var(--text-muted)]">No data to analyze. Add some records first.</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Key ML Insights */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            {[
                                                { icon: <TrendingUp size={18} />, label: 'Correlation', value: analytics.correlation, desc: Number(analytics.correlation) < -0.5 ? 'Strong inverse âœ“' : 'Weak/Positive', accent: Number(analytics.correlation) < -0.5 ? 'var(--neon-green)' : 'var(--neon-orange)' },
                                                { icon: <AlertCircle size={18} />, label: 'Anomalies', value: analytics.speedAnomalies + analytics.densityAnomalies, desc: `Spd: ${analytics.speedAnomalies} / Den: ${analytics.densityAnomalies}`, accent: (analytics.speedAnomalies + analytics.densityAnomalies) > 0 ? 'var(--neon-red)' : 'var(--neon-green)' },
                                                { icon: <PieChart size={18} />, label: 'Completeness', value: `${analytics.completeness}%`, desc: Number(analytics.completeness) >= 90 ? 'Excellent' : 'Has gaps', accent: Number(analytics.completeness) >= 90 ? 'var(--neon-green)' : 'var(--neon-orange)' },
                                                { icon: <Zap size={18} />, label: 'Peak Hour', value: analytics.peakHour?.label || 'â€”', desc: `Density: ${analytics.peakHour?.avgDensity || 0}%`, accent: 'var(--neon-red)' },
                                            ].map((card, i) => (
                                                <div key={i} className="p-4 rounded-xl flex items-center gap-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)' }}>
                                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${card.accent}15`, color: card.accent }}>{card.icon}</div>
                                                    <div>
                                                        <p className="text-xl font-bold" style={{ color: card.accent }}>{card.value}</p>
                                                        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{card.label}</p>
                                                        <p className="text-[10px] mt-0.5" style={{ color: card.accent, opacity: 0.7 }}>{card.desc}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Box Comparison + Congestion */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                            <div className="p-5 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)' }}>
                                                <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><BarChart3 size={16} className="text-[var(--neon-primary)]" /> Per-Box Comparison</h3>
                                                <div className="overflow-auto">
                                                    <table className="w-full text-xs">
                                                        <thead><tr>{['Box', 'Records', 'Avg Speed', 'Max Speed', 'Ïƒ Speed', 'Avg Density', 'Max Vehicles', 'Dominant'].map(h => (<th key={h} className="px-2 py-2 text-left font-semibold uppercase tracking-wider" style={{ color: 'var(--neon-primary)', borderBottom: '1px solid var(--border-dim)' }}>{h}</th>))}</tr></thead>
                                                        <tbody>{analytics.boxSummary.map(b => (<tr key={b.box} className="hover:bg-[rgba(0,245,255,0.03)]"><td className="px-2 py-2 font-bold text-[var(--neon-primary)]">{b.box}</td><td className="px-2 py-2">{b.count}</td><td className="px-2 py-2">{b.avgSpeed} km/h</td><td className="px-2 py-2">{b.maxSpeed} km/h</td><td className="px-2 py-2 text-[var(--text-muted)]">+/-{b.stdSpeed}</td><td className="px-2 py-2">{b.avgDensity}%</td><td className="px-2 py-2">{b.maxVehicles}</td><td className="px-2 py-2 capitalize">{b.dominantCongestion}</td></tr>))}</tbody>
                                                    </table>
                                                </div>
                                            </div>
                                            <div className="p-5 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)' }}>
                                                <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><PieChart size={16} className="text-[var(--neon-secondary)]" /> Congestion Distribution</h3>
                                                <div className="space-y-3">
                                                    {analytics.congestionPcts.map((c) => { const cs = congestionStyle(c.level); return (<div key={c.level}><div className="flex items-center justify-between mb-1"><span className="text-xs font-medium flex items-center gap-1.5"><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: cs.color, boxShadow: `0 0 6px ${cs.color}` }} /><span style={{ color: cs.color }}>{c.level}</span></span><span className="text-xs text-[var(--text-muted)]">{c.count} ({c.pct}%)</span></div><div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-glass)' }}><div className="h-full rounded-full transition-all duration-700" style={{ width: `${c.pct}%`, background: cs.color, boxShadow: `0 0 8px ${cs.color}50` }} /></div></div>) })}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Hourly Trends */}
                                        <div className="p-5 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)' }}>
                                            <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><Clock size={16} className="text-[var(--neon-primary)]" /> Hourly Trends</h3>
                                            {analytics.hourlyTrends.length > 0 ? (
                                                <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12 gap-2">
                                                    {analytics.hourlyTrends.map((h) => { const i = Number(h.avgDensity); const bg = i > 70 ? 'rgba(255,7,58,0.25)' : i > 40 ? 'rgba(255,165,0,0.2)' : 'rgba(57,255,20,0.15)'; const bc = i > 70 ? 'rgba(255,7,58,0.5)' : i > 40 ? 'rgba(255,165,0,0.4)' : 'rgba(57,255,20,0.35)'; const tc = i > 70 ? '#ff073a' : i > 40 ? '#ffa500' : '#39ff14'; return (<div key={h.hour} className="p-2 rounded-lg text-center text-xs" style={{ background: bg, border: `1px solid ${bc}` }}><p className="font-bold" style={{ color: tc }}>{h.label}</p><p className="text-[var(--text-muted)] mt-1">{h.avgDensity}%</p><p className="text-[var(--text-muted)]">{h.avgSpeed} km/h</p><p className="text-[var(--text-muted)]">{h.records} rec</p></div>) })}
                                                </div>
                                            ) : (<p className="text-xs text-[var(--text-muted)]">Not enough data yet.</p>)}
                                        </div>

                                        {/* Stats + AI + Traffic Lights */}
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                            <div className="p-5 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)' }}>
                                                <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><FileText size={16} className="text-[var(--neon-primary)]" /> Statistical Summary</h3>
                                                <div className="space-y-2 text-xs">
                                                    {[{ l: 'Total Records', v: analytics.totalRecords }, { l: 'Mean Speed', v: `${analytics.meanSpeed} km/h` }, { l: 'Ïƒ Speed', v: `Â±${analytics.stdSpeed}` }, { l: 'Mean Density', v: `${analytics.meanDensity}%` }, { l: 'Ïƒ Density', v: `Â±${analytics.stdDensity}` }, { l: 'Correlation r', v: analytics.correlation }, { l: 'Peak Hour', v: analytics.peakHour?.label || 'â€”' }, { l: 'Quiet Hour', v: analytics.quietHour?.label || 'â€”' }].map((r, i) => (<div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-lg" style={{ background: i % 2 === 0 ? 'var(--bg-glass)' : 'transparent' }}><span className="text-[var(--text-muted)]">{r.l}</span><span className="font-bold text-[var(--text-primary)]">{r.v}</span></div>))}
                                                </div>
                                            </div>
                                            <div className="p-5 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)' }}>
                                                <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><Brain size={16} className="text-[var(--neon-secondary)]" /> Top AI Decisions</h3>
                                                {analytics.topSuggestions.length > 0 ? (<div className="space-y-3">{analytics.topSuggestions.map((sg, i) => (<div key={i} className="p-3 rounded-lg" style={{ background: 'var(--bg-glass)' }}><div className="flex items-center justify-between mb-1"><span className="text-xs font-bold text-[var(--neon-secondary)]">#{i + 1}</span><span className="text-[10px] text-[var(--text-muted)]">{sg.count}Ã— ({sg.pct}%)</span></div><p className="text-xs text-[var(--text-secondary)] leading-relaxed">{sg.text}</p></div>))}</div>) : (<p className="text-xs text-[var(--text-muted)]">No AI suggestions.</p>)}
                                            </div>
                                            <div className="p-5 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)' }}>
                                                <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><Activity size={16} className="text-[var(--neon-green)]" /> Traffic Light Phases</h3>
                                                <div className="space-y-3">
                                                    {Object.entries(analytics.lightDist).map(([light, count]) => { const pct = ((count / analytics.totalRecords) * 100).toFixed(1); const color = light === 'green' ? '#39ff14' : light === 'red' ? '#ff073a' : (light === 'orange' || light === 'yellow') ? '#ffa500' : '#888'; return (<div key={light}><div className="flex items-center justify-between mb-1"><span className="text-xs font-medium flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} /><span className="capitalize" style={{ color }}>{light}</span></span><span className="text-xs text-[var(--text-muted)]">{count} ({pct}%)</span></div><div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-glass)' }}><div className="h-full rounded-full" style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}50` }} /></div></div>) })}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Export Report */}
                                        <div className="p-5 rounded-xl flex items-center justify-between" style={{ background: 'linear-gradient(135deg, rgba(176,38,255,0.08), rgba(0,245,255,0.08))', border: '1px solid var(--border-dim)' }}>
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--neon-secondary), var(--neon-primary))', boxShadow: '0 0 20px rgba(176,38,255,0.3)' }}><FileSpreadsheet size={22} className="text-[var(--bg-dark)]" /></div>
                                                <div><h3 className="text-sm font-bold">Export Full Analytics Report</h3><p className="text-xs text-[var(--text-muted)]">Download all data with ML analysis as Excel</p></div>
                                            </div>
                                            <button onClick={exportToExcel} disabled={filtered.length === 0} className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.03]" style={{ background: 'linear-gradient(135deg, var(--neon-secondary), var(--neon-primary))', color: 'var(--bg-dark)', boxShadow: '0 4px 20px rgba(176,38,255,0.3)' }}><span className="flex items-center gap-2"><Download size={16} /> Export .xlsx</span></button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* â”€â”€ Data Table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                        {activeSection === 'table' && (
                            filtered.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full gap-3">
                                    <Database size={40} className="text-[var(--text-muted)]" />
                                    <p className="text-sm text-[var(--text-muted)]">{rows.length === 0 ? 'No traffic logs found.' : 'No records match filter.'}</p>
                                </div>
                            ) : (
                                <div className="mt-1 rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-dim)', boxShadow: '0 0 30px rgba(0,0,0,0.3)' }}>
                                    <div className="overflow-auto max-h-[calc(100vh-360px)]">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr>
                                                    {[{ label: '#', width: '50px' }, { label: 'Time', width: '190px' }, { label: 'Source', width: '120px' }, { label: 'Vehicles', width: '95px' }, { label: 'Speed', width: '95px' }, { label: 'Density', width: '115px' }, { label: 'Congestion', width: '130px' }, { label: 'Traffic Light', width: '120px' }, { label: 'AI Decision', width: 'auto' }].map(col => (<th key={col.label} className="sticky top-0 z-10 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ background: 'var(--bg-card)', color: 'var(--neon-primary)', borderBottom: '2px solid var(--neon-primary)', width: col.width, backdropFilter: 'blur(12px)' }}>{col.label}</th>))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filtered.map((row, idx) => {
                                                    const dp = densityPercent(row.density)
                                                    const badge = densityBadge(dp)
                                                    const cong = congestionStyle(row.congestion_level)
                                                    return (
                                                        <tr key={row.id || idx} className={`transition-all duration-500 group ${newRowFlash === row.id ? 'animate-pulse' : ''}`} style={{ background: newRowFlash === row.id ? 'rgba(57,255,20,0.12)' : idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)', boxShadow: newRowFlash === row.id ? 'inset 0 0 20px rgba(57,255,20,0.1)' : 'none' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,245,255,0.04)')} onMouseLeave={e => (e.currentTarget.style.background = newRowFlash === row.id ? 'rgba(57,255,20,0.12)' : idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)')}>
                                                            <td className="px-4 py-3 text-[var(--text-muted)] font-mono text-xs">{idx + 1}</td>
                                                            <td className="px-4 py-3"><div className="flex items-center gap-2"><Clock size={13} className="text-[var(--neon-primary)] opacity-60" /><span className="text-xs text-[var(--text-secondary)]">{formatTimestamp(row.created_at)}</span></div></td>
                                                            <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: row.box_id === 'Box-01' ? 'rgba(0,245,255,0.12)' : row.box_id === 'Box-02' ? 'rgba(176,38,255,0.12)' : 'rgba(57,255,20,0.12)', color: row.box_id === 'Box-01' ? 'var(--neon-primary)' : row.box_id === 'Box-02' ? 'var(--neon-secondary)' : 'var(--neon-green)', border: `1px solid ${row.box_id === 'Box-01' ? 'rgba(0,245,255,0.3)' : row.box_id === 'Box-02' ? 'rgba(176,38,255,0.3)' : 'rgba(57,255,20,0.3)'}` }}><Radio size={10} /> {row.box_id}</span></td>
                                                            <td className="px-4 py-3 font-semibold">{row.vehicle_count ?? 'â€”'}</td>
                                                            <td className="px-4 py-3">{row.average_speed != null ? `${Number(row.average_speed).toFixed(1)} km/h` : 'â€”'}</td>
                                                            <td className="px-4 py-3"><span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: badge.bg, border: `1px solid ${badge.border}`, color: badge.text, boxShadow: badge.glow }}>{dp}%</span></td>
                                                            <td className="px-4 py-3"><span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: cong.color }}><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: cong.color, boxShadow: `0 0 6px ${cong.color}` }} /> {row.congestion_level || 'â€”'}</span></td>
                                                            <td className="px-4 py-3">{row.current_light ? (<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize" style={{ background: `${row.current_light === 'green' ? '#39ff14' : row.current_light === 'red' ? '#ff073a' : '#ffa500'}15`, color: row.current_light === 'green' ? '#39ff14' : row.current_light === 'red' ? '#ff073a' : '#ffa500', border: `1px solid ${row.current_light === 'green' ? '#39ff14' : row.current_light === 'red' ? '#ff073a' : '#ffa500'}40` }}>â—&nbsp;{row.current_light}</span>) : (<span className="text-[var(--text-muted)] text-xs">â€”</span>)}</td>
                                                            <td className="px-4 py-3">{row.ai_suggestion ? (<div className="flex items-start gap-2 max-w-xs"><Cpu size={14} className="text-[var(--neon-secondary)] mt-0.5 flex-shrink-0" /><span className="text-xs text-[var(--text-secondary)] leading-relaxed">{row.ai_suggestion}</span></div>) : (<span className="text-[var(--text-muted)] text-xs">â€”</span>)}</td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="px-4 py-3 flex items-center justify-between text-xs" style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border-dim)', color: 'var(--text-muted)' }}>
                                        <span>Showing <strong className="text-[var(--text-primary)]">{filtered.length}</strong> of <strong className="text-[var(--text-primary)]">{rows.length}</strong> records</span>
                                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--neon-green)', boxShadow: '0 0 6px var(--neon-green)' }} /> Supabase connected</span>
                                    </div>
                                </div>
                            )
                        )}
                    </>
                )}
            </div>

            {dropdownOpen && (<div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />)}
        </div>
    )
}

export default DataLogs
