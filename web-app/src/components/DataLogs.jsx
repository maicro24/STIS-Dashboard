/**
 * DataLogs.jsx — Production-Ready Traffic Data Table
 * ─────────────────────────────────────────────────
 * Features:
 *  ✅ Server-side pagination via Supabase .range() — browser NEVER loads all rows
 *  ✅ CSV export of current page or all fetched data
 *  ✅ Density visual badges (Green/Yellow/Red)
 *  ✅ Newest-first sorted by default
 *  ✅ Real-time subscription (new rows flash on arrival)
 *  ✅ BI-tool-quality table design
 */

import { useState, useEffect, useCallback } from 'react'
import {
    Download, RefreshCw, Database, ChevronLeft, ChevronRight,
    Activity, Radio, AlertCircle, Loader2, FileText, Zap
} from 'lucide-react'
import { supabase } from '../config/supabase'

// ─── Constants ─────────────────────────────────────────────────────
const PAGE_SIZES = [15, 30, 50, 100]

// ─── Helpers ───────────────────────────────────────────────────────
const formatTimestamp = (iso) => {
    if (!iso) return '—'
    const d = new Date(iso)
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    const hh = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    const ss = String(d.getSeconds()).padStart(2, '0')
    return `${dd}/${mm}/${yyyy}  ${hh}:${min}:${ss}`
}

const densityPct = (v) => (v == null ? 0 : v > 1 ? Math.round(v) : Math.round(v * 100))

const densityBadge = (pct) => {
    if (pct > 80) return { bg: '#ff073a18', border: '#ff073a55', color: '#ff073a', label: 'Critical', dot: '#ff073a' }
    if (pct >= 50) return { bg: '#ff660018', border: '#ff660055', color: '#ff9500', label: 'High', dot: '#ff9500' }
    if (pct >= 30) return { bg: '#ffff0018', border: '#ffff0055', color: '#ffff00', label: 'Medium', dot: '#ffff00' }
    return { bg: '#39ff1418', border: '#39ff1455', color: '#39ff14', label: 'Low', dot: '#39ff14' }
}

const lightBadge = (light) => {
    const map = {
        green: { color: '#39ff14', bg: '#39ff1415', label: 'Green' },
        red: { color: '#ff073a', bg: '#ff073a15', label: 'Red' },
        orange: { color: '#ff9500', bg: '#ff950015', label: 'Orange' },
    }
    return map[(light || '').toLowerCase()] || map.orange
}

// ─── CSV Export ─────────────────────────────────────────────────────
const exportCSV = (rows) => {
    const headers = ['Timestamp', 'Box', 'Vehicles', 'Speed (km/h)', 'Density (%)', 'Predicted Density (%)', 'Congestion', 'Light', 'AI Suggestion']
    const csvRows = [
        headers.join(','),
        ...rows.map(r => [
            `"${formatTimestamp(r.created_at)}"`,
            r.box_id || 'Box-01',
            r.vehicle_count ?? '',
            r.average_speed != null ? Number(r.average_speed).toFixed(1) : '',
            densityPct(r.density),
            r.congestion_level || '',
            r.current_light || '',
            `"${(r.ai_suggestion || '').replace(/"/g, "'")}"`,
        ].join(','))
    ]
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `STIS_Traffic_Logs_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
const DataLogs = () => {
    const [rows, setRows] = useState([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState(null)

    // Pagination state
    const [page, setPage] = useState(0)          // zero-based
    const [pageSize, setPageSize] = useState(15)
    const [totalCount, setTotalCount] = useState(0)
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

    // Real-time
    const [realtimeStatus, setRealtimeStatus] = useState('connecting')
    const [newRowId, setNewRowId] = useState(null)
    const [lastRefresh, setLastRefresh] = useState(null)

    // ── Fetch (server-side pagination via .range()) ──────────────────
    const fetchPage = useCallback(async (pg = page, size = pageSize, quiet = false) => {
        try {
            if (!quiet) setLoading(true)
            else setRefreshing(true)
            setError(null)

            /**
             * SERVER-SIDE PAGINATION:
             * .range(from, to) tells PostgreSQL to return only this slice.
             * The browser never loads thousands of rows at once.
             * count: 'exact' returns the total row count in a header.
             */
            const from = pg * size
            const to = from + size - 1

            const { data, error: sbError, count } = await supabase
                .from('traffic_logs')
                .select(
                    'id, created_at, vehicle_count, average_speed, density, congestion_level, current_light, ai_suggestion',
                    { count: 'exact' }
                )
                .order('created_at', { ascending: false })
                .range(from, to)   // ← server-side pagination key

            if (sbError) throw sbError

            setRows((data || []).map(r => ({ ...r, box_id: 'Box-01' })))
            setTotalCount(count || 0)
            setLastRefresh(new Date())
        } catch (err) {
            setError(err.message || 'Failed to fetch data')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [page, pageSize])

    // Initial load
    useEffect(() => { fetchPage(0, pageSize) }, [])

    // Reload when page/pageSize changes
    useEffect(() => { fetchPage(page, pageSize, true) }, [page, pageSize])

    // ── Real-time subscription ───────────────────────────────────────
    useEffect(() => {
        const channel = supabase
            .channel('traffic_logs_live')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'traffic_logs' }, (payload) => {
                if (page === 0) {
                    setRows(prev => {
                        const newRow = { ...payload.new, box_id: 'Box-01' }
                        setNewRowId(newRow.id)
                        setTimeout(() => setNewRowId(null), 2500)
                        return [newRow, ...prev.slice(0, pageSize - 1)]
                    })
                    setTotalCount(c => c + 1)
                }
            })
            .subscribe((status) => {
                setRealtimeStatus(status === 'SUBSCRIBED' ? 'connected' : status === 'CLOSED' ? 'error' : 'connecting')
            })

        return () => { supabase.removeChannel(channel) }
    }, [page, pageSize])

    // ── Pagination handlers ──────────────────────────────────────────
    const goToPage = (pg) => {
        if (pg < 0 || pg >= totalPages) return
        setPage(pg)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    // ── Summary Stats ────────────────────────────────────────────────
    const avgDensity = rows.length > 0
        ? Math.round(rows.reduce((s, r) => s + densityPct(r.density), 0) / rows.length)
        : 0
    const avgSpeed = rows.length > 0
        ? (rows.reduce((s, r) => s + Number(r.average_speed || 0), 0) / rows.length).toFixed(1)
        : '—'

    // ═══════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════
    return (
        <div style={{
            height: '100%', overflowY: 'auto', padding: '24px',
            fontFamily: "'Inter', sans-serif", color: '#f1f5f9',
            background: 'var(--bg-dark, #0d1117)',
        }}>
            {/* ── Header ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>
                        <span style={{ color: '#00f5ff' }}>⚡</span> Traffic Data Logs
                    </h2>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
                        {totalCount.toLocaleString()} total records · Page {page + 1} of {totalPages}
                        {lastRefresh && <> · Updated {lastRefresh.toLocaleTimeString()}</>}
                    </p>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Real-time badge */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                        background: realtimeStatus === 'connected' ? '#39ff1415' : '#ff073a15',
                        border: `1px solid ${realtimeStatus === 'connected' ? '#39ff1440' : '#ff073a40'}`,
                        color: realtimeStatus === 'connected' ? '#39ff14' : '#ff073a',
                    }}>
                        <Radio size={11} />
                        {realtimeStatus === 'connected' ? 'Live' : realtimeStatus === 'connecting' ? 'Connecting…' : 'Offline'}
                    </div>

                    {/* Refresh */}
                    <button onClick={() => fetchPage(page, pageSize, true)}
                        disabled={refreshing}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '7px 14px', borderRadius: 10, border: '1px solid #1e293b',
                            background: '#1e293b', color: '#94a3b8', cursor: 'pointer',
                            fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                        }}>
                        <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                        Refresh
                    </button>

                    {/* Export CSV */}
                    <button onClick={() => exportCSV(rows)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '7px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                            background: 'linear-gradient(135deg, #00f5ff, #0099cc)',
                            color: '#000', fontSize: 13, fontWeight: 700,
                            boxShadow: '0 0 12px #00f5ff30',
                            transition: 'all 0.2s',
                        }}>
                        <Download size={14} />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* ── Summary KPI Bar ── */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                {[
                    { label: 'Records (page)', value: rows.length, color: '#00f5ff' },
                    { label: 'Total in DB', value: totalCount.toLocaleString(), color: '#b026ff' },
                    { label: 'Avg Density', value: `${avgDensity}%`, color: avgDensity > 60 ? '#ff073a' : avgDensity > 30 ? '#ff9500' : '#39ff14' },
                    { label: 'Avg Speed', value: `${avgSpeed} km/h`, color: '#ffaa00' },
                ].map(({ label, value, color }) => (
                    <div key={label} style={{
                        flex: '1 1 120px', padding: '12px 16px', borderRadius: 12,
                        background: 'rgba(255,255,255,0.03)', border: '1px solid #1e293b',
                    }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{label}</div>
                    </div>
                ))}
            </div>

            {/* ── Table ── */}
            {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, gap: 12, color: '#64748b' }}>
                    <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
                    Loading data…
                </div>
            ) : error ? (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px',
                    background: '#ff073a15', border: '1px solid #ff073a40', borderRadius: 12,
                    color: '#ff073a',
                }}>
                    <AlertCircle size={18} />
                    {error}
                </div>
            ) : (
                <div style={{ overflowX: 'auto', borderRadius: 14, border: '1px solid #1e293b' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: '#0f172a', borderBottom: '2px solid #1e293b' }}>
                                {['Timestamp', 'Box', 'Vehicles', 'Speed', 'Density', 'Congestion', 'Traffic Light', 'AI Suggestion'].map(h => (
                                    <th key={h} style={{
                                        padding: '12px 16px', textAlign: 'left',
                                        fontSize: 11, fontWeight: 700,
                                        color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em',
                                        whiteSpace: 'nowrap',
                                    }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={9} style={{ padding: '40px 20px', textAlign: 'center', color: '#334155' }}>
                                        No data available for this page.
                                    </td>
                                </tr>
                            ) : rows.map((row, idx) => {
                                const dp = densityPct(row.density)
                                const badge = densityBadge(dp)
                                const lb = lightBadge(row.current_light)
                                const isNew = row.id === newRowId
                                const isEven = idx % 2 === 0

                                return (
                                    <tr key={row.id} style={{
                                        background: isNew
                                            ? 'rgba(0, 245, 255, 0.06)'
                                            : isEven ? 'rgba(255,255,255,0.01)' : 'transparent',
                                        borderBottom: '1px solid #0f172a',
                                        transition: 'background 0.4s ease',
                                    }}>
                                        {/* Timestamp */}
                                        <td style={{ padding: '11px 16px', whiteSpace: 'nowrap', color: '#94a3b8', fontFamily: 'monospace', fontSize: 12 }}>
                                            {isNew && <span style={{ marginRight: 6, color: '#00f5ff', fontSize: 10, fontWeight: 700 }}>NEW</span>}
                                            {formatTimestamp(row.created_at)}
                                        </td>

                                        {/* Box */}
                                        <td style={{ padding: '11px 16px' }}>
                                            <span style={{
                                                padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                                                background: '#00f5ff15', border: '1px solid #00f5ff30', color: '#00f5ff',
                                            }}>
                                                {row.box_id}
                                            </span>
                                        </td>

                                        {/* Vehicles */}
                                        <td style={{ padding: '11px 16px', fontWeight: 700, color: '#e2e8f0', textAlign: 'center' }}>
                                            {row.vehicle_count ?? '—'}
                                        </td>

                                        {/* Speed */}
                                        <td style={{ padding: '11px 16px', color: '#94a3b8' }}>
                                            {row.average_speed != null ? `${Number(row.average_speed).toFixed(1)} km/h` : '—'}
                                        </td>

                                        {/* Density Badge */}
                                        <td style={{ padding: '11px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{
                                                    width: 48, height: 6, borderRadius: 3,
                                                    background: '#1e293b', overflow: 'hidden',
                                                }}>
                                                    <div style={{
                                                        width: `${dp}%`, height: '100%',
                                                        background: badge.color,
                                                        borderRadius: 3,
                                                        transition: 'width 0.5s ease',
                                                    }} />
                                                </div>
                                                <span style={{
                                                    padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 700,
                                                    background: badge.bg, border: `1px solid ${badge.border}`, color: badge.color,
                                                }}>
                                                    {dp}%
                                                </span>
                                            </div>
                                        </td>

                                        {/* Congestion Level */}
                                        <td style={{ padding: '11px 16px' }}>
                                            <span style={{
                                                display: 'flex', alignItems: 'center', gap: 5,
                                                padding: '3px 8px', borderRadius: 5, fontSize: 11, fontWeight: 700, width: 'fit-content',
                                                ...(() => {
                                                    const lvl = (row.congestion_level || '').toLowerCase()
                                                    if (lvl === 'critical') return { background: '#ff073a18', border: '1px solid #ff073a40', color: '#ff073a' }
                                                    if (lvl === 'high') return { background: '#ff660018', border: '1px solid #ff660040', color: '#ff9500' }
                                                    if (lvl === 'medium') return { background: '#ffff0018', border: '1px solid #ffff0040', color: '#ffff00' }
                                                    return { background: '#39ff1418', border: '1px solid #39ff1440', color: '#39ff14' }
                                                })()
                                            }}>
                                                <span style={{
                                                    width: 6, height: 6, borderRadius: '50%',
                                                    background: 'currentColor', flexShrink: 0,
                                                }} />
                                                {row.congestion_level || 'Low'}
                                            </span>
                                        </td>

                                        {/* Traffic Light */}
                                        <td style={{ padding: '11px 16px' }}>
                                            <span style={{
                                                padding: '3px 8px', borderRadius: 5, fontSize: 11, fontWeight: 700,
                                                background: lb.bg, color: lb.color, border: `1px solid ${lb.color}30`,
                                                textTransform: 'capitalize',
                                            }}>
                                                ● {lb.label}
                                            </span>
                                        </td>

                                        {/* AI Suggestion */}
                                        <td style={{ padding: '11px 16px', color: '#64748b', fontSize: 12, maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {row.ai_suggestion || '—'}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Pagination Controls ── */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginTop: 16, flexWrap: 'wrap', gap: 12,
            }}>
                {/* Page size selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#94a3b8' }}>
                    Rows per page:
                    {PAGE_SIZES.map(s => (
                        <button key={s} onClick={() => { setPageSize(s); setPage(0) }}
                            style={{
                                padding: '4px 10px', borderRadius: 6, border: '1px solid #1e293b',
                                background: pageSize === s ? '#00f5ff' : '#1e293b',
                                color: pageSize === s ? '#000' : '#94a3b8',
                                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            }}>
                            {s}
                        </button>
                    ))}
                </div>

                {/* Page navigation */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button onClick={() => goToPage(0)} disabled={page === 0}
                        style={{ ...navBtnStyle(page === 0) }}>«</button>
                    <button onClick={() => goToPage(page - 1)} disabled={page === 0}
                        style={{ ...navBtnStyle(page === 0) }}>
                        <ChevronLeft size={15} />
                    </button>

                    {/* Page numbers */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let p
                        if (totalPages <= 5) p = i
                        else if (page < 3) p = i
                        else if (page >= totalPages - 3) p = totalPages - 5 + i
                        else p = page - 2 + i
                        return (
                            <button key={p} onClick={() => goToPage(p)}
                                style={{
                                    padding: '5px 10px', borderRadius: 8, border: '1px solid #1e293b',
                                    background: p === page ? '#00f5ff' : '#1e293b',
                                    color: p === page ? '#000' : '#94a3b8',
                                    fontSize: 13, fontWeight: p === page ? 700 : 400, cursor: 'pointer', minWidth: 34,
                                }}>
                                {p + 1}
                            </button>
                        )
                    })}

                    <button onClick={() => goToPage(page + 1)} disabled={page >= totalPages - 1}
                        style={{ ...navBtnStyle(page >= totalPages - 1) }}>
                        <ChevronRight size={15} />
                    </button>
                    <button onClick={() => goToPage(totalPages - 1)} disabled={page >= totalPages - 1}
                        style={{ ...navBtnStyle(page >= totalPages - 1) }}>»</button>
                </div>

                <div style={{ fontSize: 12, color: '#475569' }}>
                    Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalCount)} of {totalCount.toLocaleString()}
                </div>
            </div>
        </div>
    )
}

// ── Button style helper ──────────────────────────────────────────
const navBtnStyle = (disabled) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '5px 8px', borderRadius: 8, border: '1px solid #1e293b',
    background: '#1e293b', color: disabled ? '#334155' : '#94a3b8',
    cursor: disabled ? 'default' : 'pointer', fontSize: 13,
    transition: 'all 0.2s',
})

export default DataLogs
