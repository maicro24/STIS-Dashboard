import { useState, useEffect, createContext, useContext } from 'react'
import {
    AlertTriangle,
    AlertCircle,
    CheckCircle,
    Info,
    Bell,
    BellOff,
    Trash2,
    Check,
    Clock,
    Filter,
    Search,
    X,
    ChevronDown,
    Zap
} from 'lucide-react'

// Alert Context for sharing alerts across components
export const AlertContext = createContext()

export const useAlerts = () => useContext(AlertContext)

// Alert Provider Component
export const AlertProvider = ({ children }) => {
    const [alerts, setAlerts] = useState([
        {
            id: 1,
            type: 'critical',
            message: 'High congestion detected at STIS Node - Extend green light recommended',
            details: '9 vehicles detected, average speed 3.1 km/h',
            timestamp: new Date(Date.now() - 2 * 60 * 1000),
            acknowledged: false,
            source: 'AI Decision Engine'
        },
        {
            id: 2,
            type: 'warning',
            message: 'Moderate traffic buildup at Place 1er Novembre',
            details: '7 vehicles in queue, signal timing adjustment suggested',
            timestamp: new Date(Date.now() - 15 * 60 * 1000),
            acknowledged: false,
            source: 'Traffic Monitor'
        },
        {
            id: 3,
            type: 'info',
            message: 'System update completed successfully',
            details: 'AI model v2.3.1 deployed',
            timestamp: new Date(Date.now() - 30 * 60 * 1000),
            acknowledged: true,
            source: 'System'
        },
        {
            id: 4,
            type: 'success',
            message: 'Traffic flow optimized at Front de Mer',
            details: 'Green light extension reduced congestion by 40%',
            timestamp: new Date(Date.now() - 45 * 60 * 1000),
            acknowledged: true,
            source: 'AI Decision Engine'
        },
        {
            id: 5,
            type: 'critical',
            message: 'Emergency vehicle detected - Priority routing activated',
            details: 'Ambulance approaching from Es-Senia Road',
            timestamp: new Date(Date.now() - 5 * 60 * 1000),
            acknowledged: false,
            source: 'Emergency System'
        }
    ])

    const addAlert = (alert) => {
        const newAlert = {
            id: Date.now(),
            timestamp: new Date(),
            acknowledged: false,
            ...alert
        }
        setAlerts(prev => [newAlert, ...prev])
    }

    const acknowledgeAlert = (id) => {
        setAlerts(prev => prev.map(alert =>
            alert.id === id ? { ...alert, acknowledged: true } : alert
        ))
    }

    const acknowledgeAll = () => {
        setAlerts(prev => prev.map(alert => ({ ...alert, acknowledged: true })))
    }

    const deleteAlert = (id) => {
        setAlerts(prev => prev.filter(alert => alert.id !== id))
    }

    const clearAll = () => {
        setAlerts([])
    }

    const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length
    const criticalCount = alerts.filter(a => a.type === 'critical' && !a.acknowledged).length

    return (
        <AlertContext.Provider value={{
            alerts,
            addAlert,
            acknowledgeAlert,
            acknowledgeAll,
            deleteAlert,
            clearAll,
            unacknowledgedCount,
            criticalCount
        }}>
            {children}
        </AlertContext.Provider>
    )
}

// Alert type configurations
const alertConfig = {
    critical: {
        icon: AlertTriangle,
        color: 'var(--neon-red)',
        bgColor: 'rgba(255, 7, 58, 0.15)',
        borderColor: 'rgba(255, 7, 58, 0.4)',
        label: 'Critical'
    },
    warning: {
        icon: AlertCircle,
        color: 'var(--neon-orange)',
        bgColor: 'rgba(255, 102, 0, 0.15)',
        borderColor: 'rgba(255, 102, 0, 0.4)',
        label: 'Warning'
    },
    info: {
        icon: Info,
        color: 'var(--neon-primary)',
        bgColor: 'rgba(0, 245, 255, 0.15)',
        borderColor: 'rgba(0, 245, 255, 0.4)',
        label: 'Info'
    },
    success: {
        icon: CheckCircle,
        color: 'var(--neon-green)',
        bgColor: 'rgba(57, 255, 20, 0.15)',
        borderColor: 'rgba(57, 255, 20, 0.4)',
        label: 'Success'
    }
}

// Format timestamp
const formatTime = (date) => {
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes} min ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
}

const formatFullTime = (date) => {
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    })
}

const AlertsPanel = () => {
    const {
        alerts,
        acknowledgeAlert,
        acknowledgeAll,
        deleteAlert,
        clearAll,
        unacknowledgedCount
    } = useAlerts()

    const [filter, setFilter] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [showFilters, setShowFilters] = useState(false)

    // Filter alerts
    const filteredAlerts = alerts.filter(alert => {
        const matchesFilter = filter === 'all' ||
            (filter === 'unread' && !alert.acknowledged) ||
            alert.type === filter
        const matchesSearch = alert.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            alert.details?.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesFilter && matchesSearch
    })

    const filterOptions = [
        { value: 'all', label: 'All Alerts', count: alerts.length },
        { value: 'unread', label: 'Unread', count: unacknowledgedCount },
        { value: 'critical', label: 'Critical', count: alerts.filter(a => a.type === 'critical').length },
        { value: 'warning', label: 'Warning', count: alerts.filter(a => a.type === 'warning').length },
        { value: 'info', label: 'Info', count: alerts.filter(a => a.type === 'info').length },
        { value: 'success', label: 'Success', count: alerts.filter(a => a.type === 'success').length }
    ]

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-[var(--border-dim)]">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-3">
                            <Bell className="text-[var(--neon-primary)]" />
                            Notification Center
                            {unacknowledgedCount > 0 && (
                                <span className="px-2.5 py-1 text-sm bg-[var(--neon-red)] text-white rounded-full font-medium animate-pulse">
                                    {unacknowledgedCount} new
                                </span>
                            )}
                        </h2>
                        <p className="text-[var(--text-muted)] text-sm mt-1">
                            AI alerts, system notifications, and traffic events
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={acknowledgeAll}
                            disabled={unacknowledgedCount === 0}
                            className="px-4 py-2 rounded-lg bg-[var(--bg-glass)] hover:bg-[var(--neon-primary)]/20 text-[var(--text-secondary)] hover:text-[var(--neon-primary)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <Check size={16} />
                            Mark All Read
                        </button>
                        <button
                            onClick={clearAll}
                            disabled={alerts.length === 0}
                            className="px-4 py-2 rounded-lg bg-[var(--bg-glass)] hover:bg-[var(--neon-red)]/20 text-[var(--text-secondary)] hover:text-[var(--neon-red)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <Trash2 size={16} />
                            Clear All
                        </button>
                    </div>
                </div>

                {/* Search and Filter */}
                <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                        <input
                            type="text"
                            placeholder="Search alerts..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[var(--bg-glass)] border border-[var(--border-dim)] focus:border-[var(--neon-primary)] focus:outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all ${showFilters || filter !== 'all'
                                ? 'bg-[var(--neon-primary)]/20 text-[var(--neon-primary)] border border-[var(--neon-primary)]/30'
                                : 'bg-[var(--bg-glass)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                    >
                        <Filter size={18} />
                        Filter
                        <ChevronDown size={16} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                    </button>
                </div>

                {/* Filter Pills */}
                {showFilters && (
                    <div className="flex flex-wrap gap-2 mt-4 animate-fade-in">
                        {filterOptions.map(option => (
                            <button
                                key={option.value}
                                onClick={() => setFilter(option.value)}
                                className={`px-3 py-1.5 rounded-full text-sm flex items-center gap-2 transition-all ${filter === option.value
                                        ? 'bg-[var(--neon-primary)] text-[var(--bg-dark)]'
                                        : 'bg-[var(--bg-glass)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                            >
                                {option.label}
                                <span className={`text-xs px-1.5 rounded-full ${filter === option.value
                                        ? 'bg-[var(--bg-dark)]/30'
                                        : 'bg-[var(--bg-dark)]'
                                    }`}>
                                    {option.count}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Alerts List */}
            <div className="flex-1 overflow-auto p-4 space-y-3">
                {filteredAlerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <BellOff size={48} className="text-[var(--text-muted)] mb-4" />
                        <p className="text-lg text-[var(--text-secondary)]">No alerts found</p>
                        <p className="text-sm text-[var(--text-muted)]">
                            {searchQuery ? 'Try a different search term' : 'All caught up!'}
                        </p>
                    </div>
                ) : (
                    filteredAlerts.map(alert => {
                        const config = alertConfig[alert.type]
                        const Icon = config.icon

                        return (
                            <div
                                key={alert.id}
                                className={`glass-card p-4 transition-all hover:scale-[1.01] ${!alert.acknowledged
                                        ? 'border-l-4'
                                        : 'opacity-75'
                                    }`}
                                style={{
                                    borderLeftColor: !alert.acknowledged ? config.color : 'transparent',
                                    background: !alert.acknowledged ? config.bgColor : undefined
                                }}
                            >
                                <div className="flex items-start gap-4">
                                    {/* Icon */}
                                    <div
                                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                        style={{ background: config.bgColor, border: `1px solid ${config.borderColor}` }}
                                    >
                                        <Icon size={20} style={{ color: config.color }} />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className={`font-medium ${!alert.acknowledged ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                                                    {alert.message}
                                                </p>
                                                {alert.details && (
                                                    <p className="text-sm text-[var(--text-muted)] mt-1">
                                                        {alert.details}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                {!alert.acknowledged && (
                                                    <button
                                                        onClick={() => acknowledgeAlert(alert.id)}
                                                        className="p-1.5 rounded-lg hover:bg-[var(--bg-glass)] text-[var(--text-muted)] hover:text-[var(--neon-green)] transition-all"
                                                        title="Mark as read"
                                                    >
                                                        <Check size={16} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => deleteAlert(alert.id)}
                                                    className="p-1.5 rounded-lg hover:bg-[var(--bg-glass)] text-[var(--text-muted)] hover:text-[var(--neon-red)] transition-all"
                                                    title="Delete"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Meta info */}
                                        <div className="flex items-center gap-4 mt-3 text-xs text-[var(--text-muted)]">
                                            <span className="flex items-center gap-1">
                                                <Clock size={12} />
                                                {formatFullTime(alert.timestamp)} ({formatTime(alert.timestamp)})
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Zap size={12} />
                                                {alert.source}
                                            </span>
                                            <span
                                                className="px-2 py-0.5 rounded-full text-xs"
                                                style={{
                                                    background: config.bgColor,
                                                    color: config.color,
                                                    border: `1px solid ${config.borderColor}`
                                                }}
                                            >
                                                {config.label}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}

export default AlertsPanel
