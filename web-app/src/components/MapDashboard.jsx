import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import DataLogs from './DataLogs'
import {
    Camera,
    CameraOff,
    Activity,
    AlertTriangle,
    Zap,
    Menu,
    X,
    LogOut,
    Map,
    Database,
    BarChart3,
    Settings,
    Bell,
    User,
    Plus,
    Minus,
    Layers,
    Locate,
    Mountain,
    Github
} from 'lucide-react'
import { cameraLocations, wilayaCenter } from '../data/trafficData'
import LiveControlPanel from './LiveControlPanel'
import AnalyticsDashboard from './AnalyticsDashboard'
import AlertsPanel, { useAlerts } from './AlertsPanel'
import SettingsPanel, { useSettings } from './SettingsPanel'
import ThemeToggle from './ThemeToggle'
import TrafficSimulation from './TrafficSimulation'
import AI_PredictionWidget from './AI_PredictionWidget'

// Custom marker icons
const createCustomIcon = (status, isPrototype = false) => {
    const colors = {
        active: '#00f5ff',
        offline: '#ff073a',
        online: '#39ff14'
    }

    const color = colors[status] || colors.offline
    const size = isPrototype ? 40 : 28
    const pulseClass = status === 'active' ? 'pulse-marker' : ''

    return L.divIcon({
        className: `custom-marker ${pulseClass}`,
        html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${isPrototype ? `linear-gradient(135deg, ${color}, #b026ff)` : color};
        border-radius: 50%;
        border: 3px solid rgba(255,255,255,0.9);
        box-shadow: 0 0 ${isPrototype ? '25px' : '15px'} ${color}, 0 0 ${isPrototype ? '50px' : '30px'} ${color}40;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: transform 0.3s ease;
        ${isPrototype ? 'animation: pulse 1.5s ease-in-out infinite;' : ''}
      ">
        <svg width="${size * 0.5}" height="${size * 0.5}" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.8)" stroke-width="2.5">
          ${isPrototype
                ? '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M12 3v12"/><path d="M8 11l4 4 4-4"/>'
                : '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>'
            }
        </svg>
      </div>
    `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2]
    })
}

// Map recenter component
const MapController = ({ center, zoom }) => {
    const map = useMap()
    useEffect(() => {
        map.setView(center, zoom)
    }, [center, zoom, map])
    return null
}

// Map Controls component - must be inside MapContainer
const MapControls = ({ defaultCenter, defaultZoom, currentLayer, setCurrentLayer }) => {
    const map = useMap()

    const handleZoomIn = () => {
        map.zoomIn()
    }

    const handleZoomOut = () => {
        map.zoomOut()
    }

    const handleLocate = () => {
        map.locate({ setView: true, maxZoom: 16 })
    }

    const handleResetView = () => {
        map.setView(defaultCenter, defaultZoom)
    }

    // Map layer options
    const mapLayers = [
        { id: 'satellite', name: 'Satellite', icon: '🛰️' },
        { id: 'hybrid', name: 'Hybrid', icon: '🗺️' },
        { id: 'street', name: 'Street', icon: '🚗' },
        { id: 'dark', name: 'Dark', icon: '🌙' },
    ]

    const handleLayerChange = () => {
        const currentIndex = mapLayers.findIndex(l => l.id === currentLayer)
        const nextIndex = (currentIndex + 1) % mapLayers.length
        setCurrentLayer(mapLayers[nextIndex].id)
    }

    const currentLayerInfo = mapLayers.find(l => l.id === currentLayer)

    return (
        <>
            {/* Map Layer Selector */}
            <div className="absolute top-6 right-6 z-[1000]" style={{ pointerEvents: 'auto' }}>
                <div className="bg-[var(--bg-card)] backdrop-blur-md rounded-xl p-2 border border-[var(--border-dim)] shadow-xl">
                    <div className="flex gap-1">
                        {mapLayers.map((layer) => (
                            <button
                                key={layer.id}
                                onClick={() => setCurrentLayer(layer.id)}
                                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${currentLayer === layer.id
                                    ? 'bg-gradient-to-r from-[var(--neon-primary)] to-[var(--neon-secondary)] text-[var(--bg-dark)]'
                                    : 'bg-[var(--bg-glass)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]'
                                    }`}
                                title={layer.name}
                            >
                                <span className="mr-1">{layer.icon}</span>
                                {layer.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Zoom & Navigation Controls */}
            <div className="absolute top-6 left-6 z-[1000] flex flex-col gap-2" style={{ pointerEvents: 'auto' }}>
                <button
                    onClick={handleZoomIn}
                    className="w-10 h-10 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-dim)] shadow-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--neon-primary)] transition-all hover:scale-105"
                    title="Zoom In"
                >
                    <Plus size={20} />
                </button>
                <button
                    onClick={handleZoomOut}
                    className="w-10 h-10 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-dim)] shadow-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--neon-primary)] transition-all hover:scale-105"
                    title="Zoom Out"
                >
                    <Minus size={20} />
                </button>
                <div className="h-px bg-[var(--border-dim)] my-1" />
                <button
                    onClick={handleLocate}
                    className="w-10 h-10 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-dim)] shadow-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--neon-green)] transition-all hover:scale-105"
                    title="My Location"
                >
                    <Locate size={20} />
                </button>
                <button
                    onClick={handleResetView}
                    className="w-10 h-10 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-dim)] shadow-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--neon-secondary)] transition-all hover:scale-105"
                    title="Reset View"
                >
                    <Mountain size={20} />
                </button>
            </div>

            {/* Current Layer Label */}
            <div className="absolute bottom-6 left-6 z-[1000]" style={{ pointerEvents: 'none' }}>
                <div className="bg-[var(--bg-card)] backdrop-blur-md rounded-lg px-3 py-1.5 border border-[var(--border-dim)] text-xs text-[var(--text-muted)]">
                    📍 {currentLayerInfo?.name} View • Oran, Algeria
                </div>
            </div>
        </>
    )
}

// Map Tile Layers Component
const MapTileLayers = ({ layerType }) => {
    // Satellite Layer - ESRI World Imagery
    const satelliteUrl = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"

    // Hybrid Labels - Carto Labels
    const labelsUrl = "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"

    // Street View - OpenStreetMap
    const streetUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"

    // Dark Mode - CartoDB Dark Matter
    const darkUrl = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"

    return (
        <>
            {/* Satellite Layer */}
            {(layerType === 'satellite' || layerType === 'hybrid') && (
                <TileLayer
                    url={satelliteUrl}
                    attribution='&copy; Esri, Maxar, Earthstar Geographics'
                    maxZoom={19}
                />
            )}

            {/* Hybrid Labels Overlay */}
            {layerType === 'hybrid' && (
                <TileLayer
                    url={labelsUrl}
                    attribution='&copy; CartoDB'
                    maxZoom={19}
                    pane="overlayPane"
                />
            )}

            {/* Street View */}
            {layerType === 'street' && (
                <TileLayer
                    url={streetUrl}
                    attribution='&copy; OpenStreetMap contributors'
                    maxZoom={19}
                />
            )}

            {/* Dark Mode */}
            {layerType === 'dark' && (
                <TileLayer
                    url={darkUrl}
                    attribution='&copy; CartoDB'
                    maxZoom={19}
                />
            )}
        </>
    )
}

const MapDashboard = ({ onLogout }) => {
    const [selectedCamera, setSelectedCamera] = useState(null)
    const [showControlPanel, setShowControlPanel] = useState(false)
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'analytics' | 'alerts' | 'settings'
    const [mapLayerType, setMapLayerType] = useState('satellite') // 'satellite' | 'hybrid' | 'street' | 'dark'

    // Get alert context
    const alertContext = useAlerts()
    const unacknowledgedCount = alertContext?.unacknowledgedCount || 0

    const activeCount = cameraLocations.filter(c => c.status === 'active').length
    const offlineCount = cameraLocations.filter(c => c.status === 'offline').length

    const handleMarkerClick = (camera) => {
        setSelectedCamera(camera)
        if (camera.isPrototype) {
            setShowControlPanel(true)
        }
    }

    const handleCloseControlPanel = () => {
        setShowControlPanel(false)
        setSelectedCamera(null)
    }

    return (
        <div className="h-screen flex overflow-hidden bg-[var(--bg-dark)]">
            {/* Inject custom styles for map markers */}
            <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
        .custom-marker:hover > div {
          transform: scale(1.15) !important;
        }
        .leaflet-popup-content {
          margin: 12px 16px;
        }
      `}</style>

            {/* Sidebar */}
            <aside className={`${sidebarOpen ? 'w-72' : 'w-20'} bg-[var(--bg-card)] border-r border-[var(--border-dim)] flex flex-col transition-all duration-300`}>
                {/* Logo */}
                <div className="p-4 border-b border-[var(--border-dim)] flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 border-2 border-[var(--border-glow)]" style={{ boxShadow: '0 0 15px var(--neon-primary-glow)' }}>
                        <img src="/logo.svg" alt="STIS" className="w-full h-full object-cover" />
                    </div>
                    {sidebarOpen && (
                        <div className="animate-fade-in">
                            <h1 className="font-bold text-lg neon-text">STIS</h1>
                            <p className="text-xs text-[var(--text-muted)]">Traffic Control</p>
                        </div>
                    )}
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="ml-auto p-2 rounded-lg hover:bg-[var(--bg-glass)] text-[var(--text-secondary)] transition-colors"
                    >
                        {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-2">
                    {[
                        { id: 'overview', icon: Map, label: 'Map Overview' },
                        { id: 'analytics', icon: BarChart3, label: 'Analytics' },
                        { id: 'datalogs', icon: Database, label: 'Data Logs' },
                        { id: 'simulation', icon: Zap, label: 'Simulation' },
                        { id: 'alerts', icon: Bell, label: 'Alerts', badge: unacknowledgedCount },
                        { id: 'settings', icon: Settings, label: 'Settings' },
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === item.id
                                ? 'bg-gradient-to-r from-[var(--neon-primary)]/20 to-transparent border border-[var(--neon-primary)]/30 text-[var(--neon-primary)]'
                                : 'hover:bg-[var(--bg-glass)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                        >
                            <item.icon size={20} />
                            {sidebarOpen && (
                                <>
                                    <span className="font-medium">{item.label}</span>
                                    {item.badge > 0 && (
                                        <span className="ml-auto bg-[var(--neon-red)] text-white text-xs px-2 py-0.5 rounded-full animate-pulse">
                                            {item.badge}
                                        </span>
                                    )}
                                </>
                            )}
                            {!sidebarOpen && item.badge > 0 && (
                                <span className="absolute top-0 right-0 w-2 h-2 bg-[var(--neon-red)] rounded-full" />
                            )}
                        </button>
                    ))}
                </nav>

                {/* Stats */}
                {sidebarOpen && (
                    <div className="p-4 border-t border-[var(--border-dim)] space-y-3 animate-fade-in">
                        <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Network Status</h3>
                        <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-glass)]">
                            <div className="flex items-center gap-2">
                                <div className="status-dot status-active" />
                                <span className="text-sm">Active</span>
                            </div>
                            <span className="font-bold text-[var(--neon-primary)]">{activeCount}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-glass)]">
                            <div className="flex items-center gap-2">
                                <div className="status-dot status-offline" />
                                <span className="text-sm">Offline</span>
                            </div>
                            <span className="font-bold text-[var(--neon-red)]">{offlineCount}</span>
                        </div>
                    </div>
                )}

                {/* AI Prediction Widget (Global) */}
                {sidebarOpen && (
                    <div className="p-4 border-t border-[var(--border-dim)] animate-fade-in">
                        <AI_PredictionWidget />
                    </div>
                )}

                {/* User & Logout */}
                <div className="p-4 border-t border-[var(--border-dim)] mt-auto">
                    <div className={`flex items-center ${sidebarOpen ? 'gap-3' : 'justify-center'}`}>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--neon-secondary)] to-[var(--neon-primary)] flex items-center justify-center flex-shrink-0">
                            <User size={18} className="text-[var(--bg-dark)]" />
                        </div>
                        {sidebarOpen && (
                            <div className="flex-1 min-w-0 animate-fade-in">
                                <a href="https://github.com/maicro24/STIS-Dashboard" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--neon-primary)] transition-colors block">
                                    <p className="text-sm font-medium truncate flex items-center gap-1">
                                        maicro <Github size={14} />
                                    </p>
                                </a>
                                <p className="text-xs text-[var(--text-muted)]">Demo Mode</p>
                            </div>
                        )}
                        {sidebarOpen && (
                            <button
                                onClick={onLogout}
                                className="p-2 rounded-lg hover:bg-[var(--neon-red)]/10 text-[var(--text-secondary)] hover:text-[var(--neon-red)] transition-colors"
                                title="Logout"
                            >
                                <LogOut size={18} />
                            </button>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="h-16 bg-[var(--bg-card)] border-b border-[var(--border-dim)] px-6 flex items-center justify-between">
                    <div>
                        {activeTab === 'overview' && (
                            <>
                                <h2 className="text-xl font-bold">Wilaya: <span className="neon-text">{wilayaCenter.name}</span></h2>
                                <p className="text-sm text-[var(--text-muted)]">{wilayaCenter.arabicName} - Traffic Control Network</p>
                            </>
                        )}
                        {activeTab === 'analytics' && (
                            <>
                                <h2 className="text-xl font-bold">📊 <span className="neon-text">Analytics Dashboard</span></h2>
                                <p className="text-sm text-[var(--text-muted)]">Traffic insights and historical trends</p>
                            </>
                        )}
                        {activeTab === 'alerts' && (
                            <>
                                <h2 className="text-xl font-bold">🔔 <span className="neon-text">Notification Center</span></h2>
                                <p className="text-sm text-[var(--text-muted)]">AI alerts and system notifications</p>
                            </>
                        )}
                        {activeTab === 'datalogs' && (
                            <>
                                <h2 className="text-xl font-bold">🗄️ <span className="neon-text">Data Logs</span></h2>
                                <p className="text-sm text-[var(--text-muted)]">Real-time Supabase traffic records</p>
                            </>
                        )}
                        {activeTab === 'simulation' && (
                            <>
                                <h2 className="text-xl font-bold">⚡ <span className="neon-text">Traffic Simulation</span></h2>
                                <p className="text-sm text-[var(--text-muted)]">Interactive STIS vs Traditional comparison</p>
                            </>
                        )}
                        {activeTab === 'settings' && (
                            <>
                                <h2 className="text-xl font-bold">⚙️ <span className="neon-text">System Settings</span></h2>
                                <p className="text-sm text-[var(--text-muted)]">Configure traffic control parameters</p>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-glass)] border border-[var(--border-dim)]">
                            <div className="w-2 h-2 rounded-full bg-[var(--neon-green)] animate-pulse" />
                            <span className="text-sm text-[var(--text-secondary)]">System Online</span>
                        </div>
                        <button
                            onClick={() => setActiveTab('alerts')}
                            className="relative p-2 rounded-lg hover:bg-[var(--bg-glass)] text-[var(--text-secondary)] transition-colors"
                        >
                            <Bell size={20} />
                            {unacknowledgedCount > 0 && (
                                <span className="absolute top-0 right-0 w-4 h-4 bg-[var(--neon-red)] rounded-full text-[10px] flex items-center justify-center text-white font-bold">
                                    {unacknowledgedCount}
                                </span>
                            )}
                        </button>
                        <ThemeToggle />
                    </div>
                </header>

                {/* Content based on activeTab */}
                {activeTab === 'overview' && (
                    <div className="flex-1 relative">
                        <MapContainer
                            center={wilayaCenter.position}
                            zoom={wilayaCenter.zoom}
                            className="h-full w-full"
                            zoomControl={false}
                        >
                            {/* Dynamic Map Layers */}
                            <MapTileLayers layerType={mapLayerType} />

                            <MapController center={wilayaCenter.position} zoom={wilayaCenter.zoom} />

                            {cameraLocations.map((camera) => (
                                <Marker
                                    key={camera.id}
                                    position={camera.position}
                                    icon={createCustomIcon(camera.status, camera.isPrototype)}
                                    eventHandlers={{
                                        click: () => handleMarkerClick(camera)
                                    }}
                                >
                                    <Popup>
                                        <div className="min-w-[200px]">
                                            <div className="flex items-center gap-2 mb-2">
                                                {camera.isPrototype ? (
                                                    <Zap size={18} className="text-[var(--neon-primary)]" />
                                                ) : camera.status === 'offline' ? (
                                                    <CameraOff size={18} className="text-[var(--neon-red)]" />
                                                ) : (
                                                    <Camera size={18} className="text-[var(--neon-green)]" />
                                                )}
                                                <h3 className="font-bold text-[var(--text-primary)]">{camera.name}</h3>
                                            </div>
                                            <p className="text-sm text-[var(--text-secondary)] mb-2">{camera.description}</p>
                                            <div className="flex items-center justify-between">
                                                <span className={`text-xs px-2 py-1 rounded-full ${camera.status === 'active'
                                                    ? 'bg-[var(--neon-primary)]/20 text-[var(--neon-primary)]'
                                                    : camera.status === 'offline'
                                                        ? 'bg-[var(--neon-red)]/20 text-[var(--neon-red)]'
                                                        : 'bg-[var(--neon-green)]/20 text-[var(--neon-green)]'
                                                    }`}>
                                                    {camera.status.toUpperCase()}
                                                </span>
                                                {camera.isPrototype && (
                                                    <button
                                                        onClick={() => setShowControlPanel(true)}
                                                        className="text-xs bg-gradient-to-r from-[var(--neon-primary)] to-[var(--neon-secondary)] text-[var(--bg-dark)] px-3 py-1 rounded-full font-medium hover:opacity-90 transition-opacity"
                                                    >
                                                        Open Panel
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}

                            {/* Map Controls - inside MapContainer to access useMap */}
                            <MapControls
                                defaultCenter={wilayaCenter.position}
                                defaultZoom={wilayaCenter.zoom}
                                currentLayer={mapLayerType}
                                setCurrentLayer={setMapLayerType}
                            />
                        </MapContainer>


                        {/* Map Legend - moved to bottom right */}
                        <div className="absolute bottom-6 right-6 glass-card p-4 z-[1000]">
                            <h4 className="text-sm font-semibold mb-3 text-[var(--text-secondary)]">Legend</h4>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full bg-gradient-to-r from-[var(--neon-primary)] to-[var(--neon-secondary)]" />
                                    <span className="text-xs">Active Prototype</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full bg-[var(--neon-green)]" />
                                    <span className="text-xs">Online Camera</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full bg-[var(--neon-red)]" />
                                    <span className="text-xs">Offline Camera</span>
                                </div>
                            </div>
                        </div>

                        {/* Quick Stats Overlay - positioned below layer selector */}
                        <div className="absolute top-24 right-6 glass-card p-4 z-[999] min-w-[200px]">
                            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                <Activity size={16} className="text-[var(--neon-primary)]" />
                                <span>Real-time Overview</span>
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="text-center p-3 rounded-lg bg-[var(--bg-glass)]">
                                    <p className="text-2xl font-bold neon-text">{cameraLocations.length}</p>
                                    <p className="text-xs text-[var(--text-muted)]">Total Nodes</p>
                                </div>
                                <div className="text-center p-3 rounded-lg bg-[var(--bg-glass)]">
                                    <p className="text-2xl font-bold text-[var(--neon-green)]">{activeCount}</p>
                                    <p className="text-xs text-[var(--text-muted)]">AI Active</p>
                                </div>
                            </div>

                            {/* Alert if high congestion */}
                            <div className="mt-3 p-3 rounded-lg bg-[var(--neon-orange)]/10 border border-[var(--neon-orange)]/30">
                                <div className="flex items-center gap-2 text-[var(--neon-orange)]">
                                    <AlertTriangle size={16} />
                                    <span className="text-xs font-medium">1 node with high congestion</span>
                                </div>
                            </div>
                        </div>

                        {/* Prototype Click Hint */}
                        {!showControlPanel && (
                            <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 glass-card p-4 z-[1000] animate-pulse-neon">
                                <p className="text-sm flex items-center gap-2">
                                    <Zap size={16} className="text-[var(--neon-primary)]" />
                                    <span>Click the <span className="neon-text font-bold">glowing marker</span> to access AI Control</span>
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Analytics Tab */}
                {activeTab === 'analytics' && (
                    <div className="flex-1 overflow-hidden bg-[var(--bg-dark)]">
                        <AnalyticsDashboard />
                    </div>
                )}

                {/* Data Logs Tab */}
                {activeTab === 'datalogs' && (
                    <div className="flex-1 overflow-hidden bg-[var(--bg-dark)]">
                        <DataLogs />
                    </div>
                )}

                {/* Alerts Tab */}
                {activeTab === 'alerts' && (
                    <div className="flex-1 overflow-hidden bg-[var(--bg-dark)]">
                        <AlertsPanel />
                    </div>
                )}

                {/* Simulation Tab */}
                {activeTab === 'simulation' && (
                    <div className="flex-1 overflow-hidden bg-[var(--bg-dark)]">
                        <TrafficSimulation />
                    </div>
                )}

                {/* Settings Tab */}
                {activeTab === 'settings' && (
                    <div className="flex-1 overflow-hidden bg-[var(--bg-dark)]">
                        <SettingsPanel />
                    </div>
                )}
            </main>

            {/* Live Control Panel Modal */}
            {showControlPanel && (
                <LiveControlPanel
                    camera={selectedCamera}
                    onClose={handleCloseControlPanel}
                />
            )}
        </div>
    )
}

export default MapDashboard
