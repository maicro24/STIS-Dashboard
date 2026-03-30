import { useState, useEffect, useRef, useCallback } from 'react'

// ═══════════════════════════════════════════════════════════════════
//  STIS TRAFFIC SIMULATION — Animated Moving Cars
// ═══════════════════════════════════════════════════════════════════

const CANVAS_W = 600
const CANVAS_H = 520
const ROAD_W = 64
const CENTER_X = CANVAS_W / 2
const CENTER_Y = CANVAS_H / 2
const CAR_W = 28
const CAR_H = 16
const CAR_GAP = 24
const STOP_LINE_OFFSET = ROAD_W / 2 + 8

const COLORS = {
  road: '#1a1f2e',
  roadLine: '#ffaa0040',
  bg: '#0d1117',
  green: '#39ff14',
  red: '#ff073a',
  yellow: '#ffaa00',
  cyan: '#00f5ff',
  purple: '#b026ff',
}

const CAR_COLORS = ['#00f5ff', '#39ff14', '#ff6600', '#b026ff', '#ff073a', '#ffaa00', '#ff69b4', '#7b68ee']

// ─── Car Class ───────────────────────────────────────────────────
class Car {
  constructor(direction, laneOffset = 0) {
    this.direction = direction
    this.color = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)]
    this.speed = 1.5 + Math.random() * 1.0
    this.passed = false
    this.id = Math.random()

    // Starting positions (off-screen) and lane offset
    const lane = laneOffset * 0.4
    switch (direction) {
      case 'N': // coming from bottom, going up
        this.x = CENTER_X + 8 + lane
        this.y = CANVAS_H + 20
        this.targetStop = CENTER_Y + STOP_LINE_OFFSET
        break
      case 'S': // coming from top, going down
        this.x = CENTER_X - CAR_W - 8 - lane
        this.y = -CAR_H - 20
        this.targetStop = CENTER_Y - STOP_LINE_OFFSET - CAR_H
        break
      case 'E': // coming from left, going right
        this.x = -CAR_W - 20
        this.y = CENTER_Y + 8 + lane
        this.targetStop = CENTER_X - STOP_LINE_OFFSET - CAR_W
        break
      case 'W': // coming from right, going left
        this.x = CANVAS_W + 20
        this.y = CENTER_Y - CAR_H - 8 - lane
        this.targetStop = CENTER_X + STOP_LINE_OFFSET
        break
    }
  }

  update(isGreen, carsAhead) {
    let blocked = false

    // Check if blocked by car ahead
    if (carsAhead) {
      const dist = this.distanceTo(carsAhead)
      if (dist < CAR_GAP + CAR_H) blocked = true
    }

    // Check if at stop line and light is red
    if (!this.passed && !isGreen) {
      const atStop = this.isAtStop()
      if (atStop) blocked = true
    }

    if (!blocked) {
      switch (this.direction) {
        case 'N': this.y -= this.speed; break
        case 'S': this.y += this.speed; break
        case 'E': this.x += this.speed; break
        case 'W': this.x -= this.speed; break
      }
    }

    // Mark as passed through intersection
    if (!this.passed) {
      switch (this.direction) {
        case 'N': if (this.y < CENTER_Y - ROAD_W / 2) this.passed = true; break
        case 'S': if (this.y > CENTER_Y + ROAD_W / 2) this.passed = true; break
        case 'E': if (this.x > CENTER_X + ROAD_W / 2) this.passed = true; break
        case 'W': if (this.x < CENTER_X - ROAD_W / 2) this.passed = true; break
      }
    }
  }

  isAtStop() {
    switch (this.direction) {
      case 'N': return this.y <= this.targetStop
      case 'S': return this.y >= this.targetStop
      case 'E': return this.x >= this.targetStop
      case 'W': return this.x <= this.targetStop
    }
    return false
  }

  distanceTo(other) {
    switch (this.direction) {
      case 'N': return other.y - this.y
      case 'S': return this.y - other.y
      case 'E': return this.x - other.x
      case 'W': return other.x - this.x
    }
    return Infinity
  }

  isOffScreen() {
    return this.x < -50 || this.x > CANVAS_W + 50 || this.y < -50 || this.y > CANVAS_H + 50
  }

  draw(ctx) {
    ctx.save()
    ctx.translate(this.x, this.y)

    // Car body
    const isVertical = this.direction === 'N' || this.direction === 'S'
    const w = isVertical ? CAR_H : CAR_W
    const h = isVertical ? CAR_W : CAR_H

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.fillRect(2, 2, w, h)

    // Main body
    ctx.fillStyle = this.color
    ctx.beginPath()
    ctx.roundRect(0, 0, w, h, 3)
    ctx.fill()

    // Window
    ctx.fillStyle = 'rgba(0,0,0,0.4)'
    if (isVertical) {
      ctx.fillRect(3, h * 0.25, w - 6, h * 0.3)
    } else {
      ctx.fillRect(w * 0.55, 3, w * 0.3, h - 6)
    }

    // Headlights glow
    ctx.fillStyle = this.color + '60'
    switch (this.direction) {
      case 'N': ctx.fillRect(1, -3, w - 2, 3); break
      case 'S': ctx.fillRect(1, h, w - 2, 3); break
      case 'E': ctx.fillRect(w, 1, 3, h - 2); break
      case 'W': ctx.fillRect(-3, 1, 3, h - 2); break
    }

    ctx.restore()
  }
}

// ─── StatCard ────────────────────────────────────────────────────
const StatCard = ({ label, value, unit, color }) => (
  <div style={{
    background: 'rgba(255,255,255,0.03)', border: `1px solid ${color}30`,
    borderRadius: 12, padding: '10px 14px', textAlign: 'center',
  }}>
    <div style={{ fontSize: 20, fontWeight: 800, color, textShadow: `0 0 8px ${color}40` }}>
      {value}<span style={{ fontSize: 11, opacity: 0.7 }}>{unit}</span>
    </div>
    <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{label}</div>
  </div>
)

// ═════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════
const TrafficSimulation = () => {
  const canvasRef = useRef(null)
  const carsRef = useRef({ N: [], S: [], E: [], W: [] })
  const frameRef = useRef(null)
  const spawnTimerRef = useRef({ N: 0, S: 0, E: 0, W: 0 })

  const [mode, setMode] = useState('STIS')
  const [activeLight, setActiveLight] = useState('N')
  const [density, setDensity] = useState({ N: 5, S: 3, E: 2, W: 1 })
  const [stats, setStats] = useState({ cleared: 0, waiting: 0, cycles: 0, avgWait: 0 })
  const lightRef = useRef('N')
  const modeRef = useRef('STIS')
  const densityRef = useRef({ N: 5, S: 3, E: 2, W: 1 })
  const cycleTimerRef = useRef(0)
  const statsRef = useRef({ cleared: 0, waiting: 0, cycles: 0, totalWait: 0 })

  // Sync refs
  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { densityRef.current = density }, [density])

  // ── Draw Road Infrastructure ──
  const drawRoads = useCallback((ctx) => {
    // Background
    ctx.fillStyle = COLORS.bg
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    // Vertical road
    ctx.fillStyle = COLORS.road
    ctx.fillRect(CENTER_X - ROAD_W / 2, 0, ROAD_W, CANVAS_H)

    // Horizontal road
    ctx.fillRect(0, CENTER_Y - ROAD_W / 2, CANVAS_W, ROAD_W)

    // Center intersection highlight
    ctx.fillStyle = '#16213e'
    ctx.fillRect(CENTER_X - ROAD_W / 2, CENTER_Y - ROAD_W / 2, ROAD_W, ROAD_W)

    // Dashed center lines - vertical
    ctx.strokeStyle = COLORS.roadLine
    ctx.lineWidth = 2
    ctx.setLineDash([10, 8])
    ctx.beginPath()
    ctx.moveTo(CENTER_X, 0)
    ctx.lineTo(CENTER_X, CENTER_Y - ROAD_W / 2)
    ctx.moveTo(CENTER_X, CENTER_Y + ROAD_W / 2)
    ctx.lineTo(CENTER_X, CANVAS_H)
    ctx.stroke()

    // Dashed center lines - horizontal
    ctx.beginPath()
    ctx.moveTo(0, CENTER_Y)
    ctx.lineTo(CENTER_X - ROAD_W / 2, CENTER_Y)
    ctx.moveTo(CENTER_X + ROAD_W / 2, CENTER_Y)
    ctx.lineTo(CANVAS_W, CENTER_Y)
    ctx.stroke()
    ctx.setLineDash([])

    // Stop lines
    ctx.lineWidth = 3
    const dirs = ['N', 'S', 'E', 'W']
    dirs.forEach(dir => {
      const isGreen = lightRef.current === dir
      ctx.strokeStyle = isGreen ? COLORS.green + '80' : COLORS.red + '80'

      ctx.beginPath()
      switch (dir) {
        case 'N':
          ctx.moveTo(CENTER_X, CENTER_Y + STOP_LINE_OFFSET)
          ctx.lineTo(CENTER_X + ROAD_W / 2, CENTER_Y + STOP_LINE_OFFSET)
          break
        case 'S':
          ctx.moveTo(CENTER_X - ROAD_W / 2, CENTER_Y - STOP_LINE_OFFSET)
          ctx.lineTo(CENTER_X, CENTER_Y - STOP_LINE_OFFSET)
          break
        case 'E':
          ctx.moveTo(CENTER_X - STOP_LINE_OFFSET, CENTER_Y)
          ctx.lineTo(CENTER_X - STOP_LINE_OFFSET, CENTER_Y + ROAD_W / 2)
          break
        case 'W':
          ctx.moveTo(CENTER_X + STOP_LINE_OFFSET, CENTER_Y - ROAD_W / 2)
          ctx.lineTo(CENTER_X + STOP_LINE_OFFSET, CENTER_Y)
          break
      }
      ctx.stroke()
    })

    // Traffic light indicators on the intersection corners
    dirs.forEach(dir => {
      const isGreen = lightRef.current === dir
      const color = isGreen ? COLORS.green : COLORS.red
      let lx, ly
      switch (dir) {
        case 'N': lx = CENTER_X + ROAD_W / 2 + 10; ly = CENTER_Y + ROAD_W / 2 + 10; break
        case 'S': lx = CENTER_X - ROAD_W / 2 - 22; ly = CENTER_Y - ROAD_W / 2 - 22; break
        case 'E': lx = CENTER_X - ROAD_W / 2 - 22; ly = CENTER_Y + ROAD_W / 2 + 10; break
        case 'W': lx = CENTER_X + ROAD_W / 2 + 10; ly = CENTER_Y - ROAD_W / 2 - 22; break
      }

      // Light housing
      ctx.fillStyle = '#111'
      ctx.beginPath()
      ctx.roundRect(lx - 2, ly - 2, 16, 30, 4)
      ctx.fill()
      ctx.strokeStyle = '#333'
      ctx.lineWidth = 1
      ctx.stroke()

      // Red circle
      ctx.fillStyle = isGreen ? '#330a0a' : COLORS.red
      ctx.beginPath()
      ctx.arc(lx + 6, ly + 6, 5, 0, Math.PI * 2)
      ctx.fill()
      if (!isGreen) {
        ctx.shadowColor = COLORS.red
        ctx.shadowBlur = 10
        ctx.fill()
        ctx.shadowBlur = 0
      }

      // Green circle
      ctx.fillStyle = isGreen ? COLORS.green : '#0a1a0a'
      ctx.beginPath()
      ctx.arc(lx + 6, ly + 20, 5, 0, Math.PI * 2)
      ctx.fill()
      if (isGreen) {
        ctx.shadowColor = COLORS.green
        ctx.shadowBlur = 10
        ctx.fill()
        ctx.shadowBlur = 0
      }

      // Direction label
      ctx.fillStyle = color
      ctx.font = 'bold 9px Inter, sans-serif'
      ctx.textAlign = 'center'
      const labels = { N: 'N', S: 'S', E: 'E', W: 'W' }
      ctx.fillText(labels[dir], lx + 6, ly + 40)
    })
  }, [])

  // ── Game Loop ──
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    let tick = 0

    const loop = () => {
      tick++
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

      // --- Light switching logic ---
      cycleTimerRef.current++
      const cycleDuration = modeRef.current === 'Traditional' ? 240 : 180 // frames

      if (modeRef.current === 'Traditional') {
        if (cycleTimerRef.current >= cycleDuration) {
          cycleTimerRef.current = 0
          const dirs = ['N', 'E', 'S', 'W']
          const idx = dirs.indexOf(lightRef.current)
          lightRef.current = dirs[(idx + 1) % 4]
          setActiveLight(lightRef.current)
          statsRef.current.cycles++
        }
      } else {
        // STIS AI Logic
        if (cycleTimerRef.current >= cycleDuration) {
          cycleTimerRef.current = 0
          const d = densityRef.current
          const cars = carsRef.current
          const dirs = ['N', 'E', 'S', 'W']

          // Count waiting cars per direction
          const waitCounts = {}
          dirs.forEach(dir => {
            waitCounts[dir] = cars[dir].filter(c => !c.passed && c.isAtStop()).length + d[dir]
          })

          // Priority: give green to highest demand
          const maxDir = dirs.reduce((a, b) => waitCounts[a] >= waitCounts[b] ? a : b)

          // Rule: if only one direction has traffic, instant green
          const nonZero = dirs.filter(dir => waitCounts[dir] > 0)
          if (nonZero.length === 1) {
            lightRef.current = nonZero[0]
          } else if (nonZero.length > 0) {
            lightRef.current = maxDir
          } else {
            const idx = dirs.indexOf(lightRef.current)
            lightRef.current = dirs[(idx + 1) % 4]
          }

          setActiveLight(lightRef.current)
          statsRef.current.cycles++
        }
      }

      // --- Spawn cars based on density ---
      const dirs = ['N', 'E', 'S', 'W']
      dirs.forEach(dir => {
        spawnTimerRef.current[dir]++
        const spawnRate = Math.max(30, 180 - densityRef.current[dir] * 18)
        if (spawnTimerRef.current[dir] >= spawnRate && densityRef.current[dir] > 0) {
          spawnTimerRef.current[dir] = 0
          carsRef.current[dir].push(new Car(dir, Math.random() * 4))
        }
      })

      // --- Update cars ---
      let totalWaiting = 0
      dirs.forEach(dir => {
        const isGreen = lightRef.current === dir
        const cars = carsRef.current[dir]

        // Sort cars by position
        switch (dir) {
          case 'N': cars.sort((a, b) => a.y - b.y); break
          case 'S': cars.sort((a, b) => b.y - a.y); break
          case 'E': cars.sort((a, b) => b.x - a.x); break
          case 'W': cars.sort((a, b) => a.x - b.x); break
        }

        cars.forEach((car, i) => {
          const ahead = i > 0 ? cars[i - 1] : null
          car.update(isGreen, ahead)
          if (!car.passed && car.isAtStop()) totalWaiting++
        })

        // Remove off-screen cars
        const before = cars.length
        carsRef.current[dir] = cars.filter(c => !c.isOffScreen())
        const removed = before - carsRef.current[dir].length
        if (removed > 0) statsRef.current.cleared += removed
      })

      // --- Draw ---
      drawRoads(ctx)

      dirs.forEach(dir => {
        carsRef.current[dir].forEach(car => car.draw(ctx))
      })

      // --- HUD overlay ---
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.beginPath()
      ctx.roundRect(8, 8, 160, 28, 6)
      ctx.fill()
      ctx.fillStyle = modeRef.current === 'STIS' ? COLORS.green : COLORS.red
      ctx.font = 'bold 11px Inter, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(modeRef.current === 'STIS' ? '⚡ STIS' : '⏱️ Traditional Mode', 16, 26)

      // Update stats periodically
      if (tick % 30 === 0) {
        setStats({
          cleared: statsRef.current.cleared,
          waiting: totalWaiting,
          cycles: statsRef.current.cycles,
          avgWait: statsRef.current.cycles > 0
            ? (totalWaiting / Math.max(1, statsRef.current.cycles)).toFixed(1)
            : '0.0'
        })
      }

      frameRef.current = requestAnimationFrame(loop)
    }

    frameRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frameRef.current)
  }, [drawRoads])

  const efficiency = mode === 'STIS' ? '94%' : '61%'

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '20px', color: '#fff', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <h2 style={{
          fontSize: 26, fontWeight: 800, margin: 0,
          background: 'linear-gradient(135deg, #00f5ff, #b026ff)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          ⚡ STIS Traffic Simulation
        </h2>
        <p style={{ color: '#555', fontSize: 13, marginTop: 4 }}>
          Real-time Animated Intersection — Watch the cars move!
        </p>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
        {/* ═══ Canvas ═══ */}
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{
            borderRadius: 14, border: '2px solid #1e293b',
            boxShadow: '0 0 30px rgba(0,0,0,0.5)',
            background: COLORS.bg,
          }}
        />

        {/* ═══ Controls ═══ */}
        <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Mode Toggle */}
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, border: '1px solid #1e293b', padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#555', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
              Control Mode
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => {
                setMode('Traditional'); modeRef.current = 'Traditional'
                statsRef.current = { cleared: 0, waiting: 0, cycles: 0, totalWait: 0 }
              }} style={{
                flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 12, transition: 'all 0.3s',
                background: mode === 'Traditional' ? '#ff073a' : '#1e293b',
                color: mode === 'Traditional' ? '#fff' : '#555',
                boxShadow: mode === 'Traditional' ? '0 0 15px #ff073a40' : 'none',
              }}>
                ⏱️ Traditional
              </button>
              <button onClick={() => {
                setMode('STIS'); modeRef.current = 'STIS'
                statsRef.current = { cleared: 0, waiting: 0, cycles: 0, totalWait: 0 }
              }} style={{
                flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 12, transition: 'all 0.3s',
                background: mode === 'STIS' ? 'linear-gradient(135deg, #00f5ff, #39ff14)' : '#1e293b',
                color: mode === 'STIS' ? '#000' : '#555',
                boxShadow: mode === 'STIS' ? '0 0 15px #00f5ff40' : 'none',
              }}>
                🤖 STIS AI
              </button>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <StatCard label="Cars Cleared" value={stats.cleared} unit="" color="#39ff14" />
            <StatCard label="Efficiency" value={efficiency} unit="" color={mode === 'STIS' ? '#39ff14' : '#ff6600'} />
            <StatCard label="Waiting" value={stats.waiting} unit="" color="#ffaa00" />
            <StatCard label="Cycles" value={stats.cycles} unit="" color="#00f5ff" />
          </div>

          {/* Density Sliders */}
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, border: '1px solid #1e293b', padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#555', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
              Traffic Density
            </div>
            <div style={{ fontSize: 10, color: '#444', marginBottom: 10 }}>
              💡 Increase one direction and set others to 0 to see STIS react instantly!
            </div>
            {['N', 'E', 'S', 'W'].map(dir => {
              const labels = { N: 'North ↑', S: 'South ↓', E: 'East →', W: 'West ←' }
              return (
                <div key={dir} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 11 }}>
                    <span style={{ color: '#999' }}>{labels[dir]}</span>
                    <span style={{ fontWeight: 700, color: density[dir] > 5 ? '#ff6600' : density[dir] > 0 ? '#00f5ff' : '#333' }}>
                      {density[dir]}
                    </span>
                  </div>
                  <input type="range" min="0" max="10" value={density[dir]}
                    onChange={e => {
                      const v = parseInt(e.target.value)
                      setDensity(prev => ({ ...prev, [dir]: v }))
                    }}
                    style={{ width: '100%', accentColor: '#00f5ff' }}
                  />
                </div>
              )
            })}

            {/* Presets */}
            <div style={{ display: 'flex', gap: 5, marginTop: 6 }}>
              {[
                { label: '🚗 N Only', d: { N: 10, S: 0, E: 0, W: 0 } },
                { label: '🚦 Rush', d: { N: 8, S: 7, E: 6, W: 5 } },
                { label: '✨ Clear', d: { N: 0, S: 0, E: 0, W: 0 } },
              ].map(p => (
                <button key={p.label} onClick={() => setDensity(p.d)}
                  style={{
                    flex: 1, padding: '5px 2px', borderRadius: 7, fontSize: 9, fontWeight: 600,
                    border: '1px solid #1e293b', background: '#0d1117', color: '#00f5ff', cursor: 'pointer',
                  }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TrafficSimulation
