import { useState, useEffect } from 'react'
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell
} from 'recharts'
import {
    TrendingUp,
    TrendingDown,
    Activity,
    Clock,
    Car,
    Gauge,
    Calendar,
    Download
} from 'lucide-react'
import { sampleTrafficData } from '../data/trafficData'

// Generate hourly traffic data
const generateHourlyData = () => {
    const hours = []
    for (let i = 0; i < 24; i++) {
        const isPeakMorning = i >= 7 && i <= 9
        const isPeakEvening = i >= 17 && i <= 19
        const isNight = i >= 22 || i <= 5

        let baseCount = 50
        if (isPeakMorning) baseCount = 180 + Math.random() * 40
        else if (isPeakEvening) baseCount = 200 + Math.random() * 50
        else if (isNight) baseCount = 20 + Math.random() * 15
        else baseCount = 80 + Math.random() * 40

        hours.push({
            hour: `${i.toString().padStart(2, '0')}:00`,
            vehicles: Math.round(baseCount),
            avgSpeed: Math.round(isNight ? 45 : (isPeakMorning || isPeakEvening ? 15 : 30) + Math.random() * 10),
            congestion: isPeakMorning || isPeakEvening ? 'High' : isNight ? 'Low' : 'Medium'
        })
    }
    return hours
}

// Generate efficiency data comparing congestion vs green light duration
const generateEfficiencyData = () => {
    const data = []
    for (let i = 0; i < 12; i++) {
        const congestion = 30 + Math.random() * 60
        const greenLight = 100 - congestion + Math.random() * 20
        data.push({
            time: `${(i * 2).toString().padStart(2, '0')}:00`,
            congestionLevel: Math.round(congestion),
            greenLightEfficiency: Math.round(Math.min(100, greenLight)),
            vehicleFlow: Math.round(50 + Math.random() * 100)
        })
    }
    return data
}

// Generate weekly trend data
const generateWeeklyData = () => {
    const days = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri']
    return days.map(day => ({
        day,
        totalVehicles: Math.round(2000 + Math.random() * 3000),
        avgCongestion: Math.round(40 + Math.random() * 35),
        incidents: Math.round(Math.random() * 5)
    }))
}

// Congestion distribution data
const congestionDistribution = [
    { name: 'Low', value: 35, color: '#39ff14' },
    { name: 'Medium', value: 30, color: '#ffff00' },
    { name: 'High', value: 25, color: '#ff6600' },
    { name: 'Critical', value: 10, color: '#ff073a' }
]

const AnalyticsDashboard = () => {
    const [hourlyData] = useState(generateHourlyData())
    const [efficiencyData] = useState(generateEfficiencyData())
    const [weeklyData] = useState(generateWeeklyData())
    const [selectedPeriod, setSelectedPeriod] = useState('today')

    // Calculate summary stats
    const totalVehicles = hourlyData.reduce((sum, h) => sum + h.vehicles, 0)
    const avgSpeed = Math.round(hourlyData.reduce((sum, h) => sum + h.avgSpeed, 0) / hourlyData.length)
    const peakHour = hourlyData.reduce((max, h) => h.vehicles > max.vehicles ? h : max, hourlyData[0])

    const stats = [
        {
            label: 'Total Vehicles Today',
            value: totalVehicles.toLocaleString(),
            change: '+12%',
            positive: true,
            icon: Car
        },
        {
            label: 'Average Speed',
            value: `${avgSpeed} km/h`,
            change: '-5%',
            positive: false,
            icon: Gauge
        },
        {
            label: 'Peak Hour',
            value: peakHour.hour,
            change: `${peakHour.vehicles} vehicles`,
            positive: null,
            icon: Clock
        },
        {
            label: 'AI Interventions',
            value: '24',
            change: '+8',
            positive: true,
            icon: Activity
        }
    ]

    return (
        <div className="h-full overflow-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Traffic Analytics</h2>
                    <p className="text-[var(--text-muted)] text-sm">Real-time insights and historical trends</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex gap-2">
                        {['today', 'week', 'month'].map(period => (
                            <button
                                key={period}
                                onClick={() => setSelectedPeriod(period)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedPeriod === period
                                        ? 'bg-[var(--neon-primary)] text-[var(--bg-dark)]'
                                        : 'bg-[var(--bg-glass)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                            >
                                {period.charAt(0).toUpperCase() + period.slice(1)}
                            </button>
                        ))}
                    </div>
                    <button className="p-2 rounded-lg bg-[var(--bg-glass)] hover:bg-[var(--bg-card)] text-[var(--text-secondary)] transition-all">
                        <Download size={20} />
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, idx) => (
                    <div key={idx} className="glass-card p-4 hover:border-[var(--neon-primary)]/50 transition-all">
                        <div className="flex items-start justify-between mb-3">
                            <div className="w-10 h-10 rounded-lg bg-[var(--neon-primary)]/20 flex items-center justify-center">
                                <stat.icon size={20} className="text-[var(--neon-primary)]" />
                            </div>
                            {stat.positive !== null && (
                                <div className={`flex items-center gap-1 text-sm ${stat.positive ? 'text-[var(--neon-green)]' : 'text-[var(--neon-red)]'
                                    }`}>
                                    {stat.positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                    <span>{stat.change}</span>
                                </div>
                            )}
                        </div>
                        <p className="text-2xl font-bold mb-1">{stat.value}</p>
                        <p className="text-sm text-[var(--text-muted)]">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Peak Hour Chart */}
                <div className="glass-card p-5">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Clock size={18} className="text-[var(--neon-primary)]" />
                        Hourly Vehicle Count
                    </h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={hourlyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis
                                dataKey="hour"
                                stroke="rgba(255,255,255,0.5)"
                                fontSize={10}
                                interval={2}
                            />
                            <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
                            <Tooltip
                                contentStyle={{
                                    background: 'rgba(15, 23, 42, 0.95)',
                                    border: '1px solid rgba(0, 245, 255, 0.3)',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 20px rgba(0, 245, 255, 0.2)'
                                }}
                                labelStyle={{ color: '#00f5ff' }}
                            />
                            <Bar
                                dataKey="vehicles"
                                fill="url(#barGradient)"
                                radius={[4, 4, 0, 0]}
                            />
                            <defs>
                                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#00f5ff" />
                                    <stop offset="100%" stopColor="#b026ff" />
                                </linearGradient>
                            </defs>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Efficiency Graph */}
                <div className="glass-card p-5">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Activity size={18} className="text-[var(--neon-secondary)]" />
                        Congestion vs Green Light Efficiency
                    </h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={efficiencyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="time" stroke="rgba(255,255,255,0.5)" fontSize={12} />
                            <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
                            <Tooltip
                                contentStyle={{
                                    background: 'rgba(15, 23, 42, 0.95)',
                                    border: '1px solid rgba(176, 38, 255, 0.3)',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 20px rgba(176, 38, 255, 0.2)'
                                }}
                            />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="congestionLevel"
                                stroke="#ff6600"
                                strokeWidth={2}
                                dot={{ fill: '#ff6600', r: 3 }}
                                name="Congestion %"
                            />
                            <Line
                                type="monotone"
                                dataKey="greenLightEfficiency"
                                stroke="#39ff14"
                                strokeWidth={2}
                                dot={{ fill: '#39ff14', r: 3 }}
                                name="Green Light Efficiency %"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Weekly Trend */}
                <div className="glass-card p-5 lg:col-span-2">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Calendar size={18} className="text-[var(--neon-green)]" />
                        Weekly Traffic Trend
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={weeklyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="day" stroke="rgba(255,255,255,0.5)" fontSize={12} />
                            <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
                            <Tooltip
                                contentStyle={{
                                    background: 'rgba(15, 23, 42, 0.95)',
                                    border: '1px solid rgba(57, 255, 20, 0.3)',
                                    borderRadius: '8px'
                                }}
                            />
                            <Legend />
                            <Area
                                type="monotone"
                                dataKey="totalVehicles"
                                stroke="#00f5ff"
                                fill="url(#areaGradient)"
                                name="Total Vehicles"
                            />
                            <defs>
                                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#00f5ff" stopOpacity={0.4} />
                                    <stop offset="100%" stopColor="#00f5ff" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Congestion Distribution */}
                <div className="glass-card p-5">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Gauge size={18} className="text-[var(--neon-orange)]" />
                        Congestion Distribution
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie
                                data={congestionDistribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={80}
                                paddingAngle={3}
                                dataKey="value"
                            >
                                {congestionDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    background: 'rgba(15, 23, 42, 0.95)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '8px'
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap justify-center gap-3 mt-2">
                        {congestionDistribution.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-1.5">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: item.color }}
                                />
                                <span className="text-xs text-[var(--text-muted)]">
                                    {item.name} ({item.value}%)
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Real-time Traffic Flow (from sample data) */}
            <div className="glass-card p-5">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Activity size={18} className="text-[var(--neon-primary)]" />
                    Real-time Traffic Flow (Last 3 seconds)
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={sampleTrafficData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="time_sec" stroke="rgba(255,255,255,0.5)" fontSize={12} />
                        <YAxis yAxisId="left" stroke="rgba(255,255,255,0.5)" fontSize={12} />
                        <YAxis yAxisId="right" orientation="right" stroke="rgba(255,255,255,0.5)" fontSize={12} />
                        <Tooltip
                            contentStyle={{
                                background: 'rgba(15, 23, 42, 0.95)',
                                border: '1px solid rgba(0, 245, 255, 0.3)',
                                borderRadius: '8px'
                            }}
                        />
                        <Legend />
                        <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="vehicle_count"
                            stroke="#00f5ff"
                            strokeWidth={2}
                            name="Vehicle Count"
                        />
                        <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="average_speed_kmh"
                            stroke="#b026ff"
                            strokeWidth={2}
                            name="Avg Speed (km/h)"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

export default AnalyticsDashboard
