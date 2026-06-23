import React from 'react'

/**
 * VisualizationsPanel — Phase 9
 * Pure SVG/CSS interactive charts:
 * - Dual score gauges
 * - Survivability 6-dimension bar chart
 * - Risk Radar (pentagon spider chart)
 * - Dependency distribution donut
 */
export default function VisualizationsPanel({ repo }) {
  const analysis = repo.analyses?.[0] || null
  const findings = analysis?.findings || {}
  const details  = findings.survivability_details || {}
  const metrics  = details.metrics || {}
  const rawStats = details.raw_stats || {}

  const repro = analysis?.reproducibility_score || 0
  const surv  = analysis?.survivability_score   || 0

  if (!analysis) {
    return (
      <div className="p-8 text-center text-text-muted text-xs italic bg-bg-panel/20 border border-border-subtle rounded-xl">
        No data to visualize. Run analysis first.
      </div>
    )
  }

  // Helper to extract score percentage (0-100) from the dynamic survivability factors breakdown
  const getSurvScorePct = (categoryName) => {
    const factors = findings.survivability_factors || {}
    const breakdown = factors.breakdown || []
    const item = breakdown.find(b => b.category === categoryName)
    if (!item || !item.max) return 0
    return Math.max(0, Math.min(100, (item.score / item.max) * 100))
  }

  // === SVG Gauge Component ===
  const Gauge = ({ score, label, color }) => {
    const r = 52
    const circ = 2 * Math.PI * r
    const dash = (score / 100) * (circ * 0.75)
    const gapOffset = circ * 0.25

    const getColor = (s) => {
      if (s >= 80) return '#10b981'
      if (s >= 60) return '#f59e0b'
      if (s >= 40) return '#f97316'
      return '#ef4444'
    }

    const activeColor = color || getColor(score)

    return (
      <div className="flex flex-col items-center gap-2">
        <svg width="130" height="100" viewBox="0 0 130 100">
          {/* Background arc */}
          <circle
            cx="65" cy="75" r={r}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="10"
            strokeDasharray={`${circ * 0.75} ${circ}`}
            strokeDashoffset={gapOffset}
            strokeLinecap="round"
            transform="rotate(135, 65, 75)"
          />
          {/* Score arc */}
          <circle
            cx="65" cy="75" r={r}
            fill="none"
            stroke={activeColor}
            strokeWidth="10"
            strokeDasharray={`${dash} ${circ}`}
            strokeDashoffset={gapOffset}
            strokeLinecap="round"
            transform="rotate(135, 65, 75)"
            style={{ transition: 'stroke-dasharray 1s ease-out', filter: `drop-shadow(0 0 6px ${activeColor}40)` }}
          />
          {/* Score text */}
          <text x="65" y="68" textAnchor="middle" className="fill-current" style={{ fill: activeColor, fontSize: '22px', fontWeight: 900, fontFamily: 'monospace' }}>
            {Math.round(score)}
          </text>
          <text x="65" y="82" textAnchor="middle" style={{ fill: 'rgba(100,116,139,1)', fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
            / 100
          </text>
        </svg>
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest text-center">{label}</span>
      </div>
    )
  }

  // === Radar Chart (Pentagon) ===
  const RadarChart = () => {
    const axes = [
      { label: 'Maintenance', value: getSurvScorePct('Commit Frequency') / 100 },
      { label: 'Community',   value: getSurvScorePct('Contributor Activity') / 100 },
      { label: 'Security',    value: getSurvScorePct('Security Health') / 100 },
      { label: 'Dependency',  value: getSurvScorePct('Dependency Freshness') / 100 },
      { label: 'Release',     value: getSurvScorePct('Release Frequency') / 100 },
    ]

    const cx = 100, cy = 100, maxR = 75
    const n = axes.length

    // Pentagon background grid lines
    const polygon = (radius, offset = 0) => {
      return axes.map((_, i) => {
        const angle = (2 * Math.PI * i) / n - Math.PI / 2 + offset
        const x = cx + radius * Math.cos(angle)
        const y = cy + radius * Math.sin(angle)
        return `${x},${y}`
      }).join(' ')
    }

    // Data polygon
    const dataPolygon = axes.map((axis, i) => {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2
      const r = axis.value * maxR
      const x = cx + r * Math.cos(angle)
      const y = cy + r * Math.sin(angle)
      return `${x},${y}`
    }).join(' ')

    return (
      <div className="flex flex-col items-center gap-2">
        <svg width="200" height="200" viewBox="0 0 200 200">
          {/* Grid polygons */}
          {[0.25, 0.5, 0.75, 1].map((scale, gi) => (
            <polygon
              key={gi}
              points={polygon(maxR * scale)}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
            />
          ))}
          {/* Axis lines */}
          {axes.map((_, i) => {
            const angle = (2 * Math.PI * i) / n - Math.PI / 2
            const x = cx + maxR * Math.cos(angle)
            const y = cy + maxR * Math.sin(angle)
            return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          })}
          {/* Data area */}
          <polygon
            points={dataPolygon}
            fill="rgba(99,102,241,0.15)"
            stroke="#6366f1"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Data points */}
          {axes.map((axis, i) => {
            const angle = (2 * Math.PI * i) / n - Math.PI / 2
            const r = axis.value * maxR
            const x = cx + r * Math.cos(angle)
            const y = cy + r * Math.sin(angle)
            return <circle key={i} cx={x} cy={y} r="3.5" fill="#6366f1" />
          })}
          {/* Axis labels */}
          {axes.map((axis, i) => {
            const angle = (2 * Math.PI * i) / n - Math.PI / 2
            const labelR = maxR + 16
            const x = cx + labelR * Math.cos(angle)
            const y = cy + labelR * Math.sin(angle)
            return (
              <text
                key={i} x={x} y={y}
                textAnchor="middle" dominantBaseline="central"
                style={{ fill: 'rgba(100,116,139,1)', fontSize: '8px', fontWeight: 700, textTransform: 'uppercase' }}
              >
                {axis.label}
              </text>
            )
          })}
        </svg>
        <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Survivability Radar</span>
      </div>
    )
  }

  // === Dependency Donut ===
  const DepDonut = () => {
    const deps = repo.dependencies_profile?.dependencies || []
    const report = repo.dependencies_profile?.report || {}
    if (deps.length === 0) return null

    const prodCount = deps.filter(d => {
      const t = (d.dependency_type || '').toLowerCase()
      return t === 'production' || t === 'direct' || t === 'compile'
    }).length
    const devCount  = deps.filter(d => {
      const t = (d.dependency_type || '').toLowerCase()
      return t.includes('dev') || t.includes('test')
    }).length
    const otherCount = deps.length - prodCount - devCount

    const total = deps.length
    const segments = [
      { label: 'Production', count: prodCount, color: '#6366f1' },
      { label: 'Dev/Test',   count: devCount,  color: '#a855f7' },
      { label: 'Other',      count: otherCount, color: '#22d3ee' },
    ].filter(s => s.count > 0)

    let cumulative = 0
    const r = 38, cx = 55, cy = 55, strokeW = 14
    const circ = 2 * Math.PI * r

    return (
      <div className="flex flex-col items-center gap-2">
        <svg width="110" height="110" viewBox="0 0 110 110">
          {segments.map((seg, i) => {
            const pct = seg.count / total
            const dash = pct * circ
            const offset = -(cumulative * circ) + circ * 0.25
            cumulative += pct
            return (
              <circle
                key={i} cx={cx} cy={cy} r={r}
                fill="none" stroke={seg.color} strokeWidth={strokeW}
                strokeDasharray={`${dash} ${circ}`}
                strokeDashoffset={offset}
                strokeLinecap="butt"
                transform="rotate(-90, 55, 55)"
              />
            )
          })}
          <text x={cx} y={cy - 4} textAnchor="middle" style={{ fill: '#f8fafc', fontSize: '14px', fontWeight: 900, fontFamily: 'monospace' }}>{total}</text>
          <text x={cx} y={cy + 8} textAnchor="middle" style={{ fill: 'rgba(100,116,139,1)', fontSize: '7px', fontWeight: 700 }}>pkgs</text>
        </svg>
        <div className="flex gap-3 flex-wrap justify-center">
          {segments.map(seg => (
            <div key={seg.label} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: seg.color }} />
              <span className="text-[9px] text-text-muted font-medium">{seg.label}: {seg.count}</span>
            </div>
          ))}
        </div>
        <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Dependency Distribution</span>
      </div>
    )
  }

  // === 6-Dimension Horizontal Bar Chart ===
  const SurvivabilityBars = () => {
    const bars = [
      { name: 'Commit Frequency',    score: getSurvScorePct('Commit Frequency'),    color: '#6366f1' },
      { name: 'Contributor Activity',score: getSurvScorePct('Contributor Activity'),color: '#a855f7' },
      { name: 'Release Frequency',   score: getSurvScorePct('Release Frequency'),   color: '#22d3ee' },
      { name: 'Dep Freshness',       score: getSurvScorePct('Dependency Freshness'),color: '#10b981' },
      { name: 'Security Health',     score: getSurvScorePct('Security Health'),     color: '#f59e0b' },
      { name: 'Issue Resolution',    score: getSurvScorePct('Issue Resolution'),    color: '#ec4899' },
    ]

    return (
      <div className="space-y-2.5">
        {bars.map((bar) => (
          <div key={bar.name} className="space-y-1">
            <div className="flex justify-between text-[9px] font-bold">
              <span className="text-text-muted">{bar.name}</span>
              <span className="font-mono" style={{ color: bar.color }}>{Math.round(bar.score)}%</span>
            </div>
            <div className="w-full bg-bg-input h-2 rounded-full overflow-hidden border border-border-subtle">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.max(0, Math.min(100, bar.score))}%`, background: bar.color }}
              />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Score Gauges */}
      <div className="p-5 rounded-2xl border border-border-subtle bg-bg-panel/25">
        <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-4">Score Gauges</h4>
        <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
          <Gauge score={repro} label="Reproducibility" />
          <div className="w-px h-20 bg-border-subtle hidden sm:block" />
          <Gauge score={surv} label="Survivability" />
          <div className="w-px h-20 bg-border-subtle hidden sm:block" />
          <Gauge score={Math.round((repro + surv) / 2)} label="Composite" color="#6366f1" />
        </div>
      </div>

      {/* Radar + Donut */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-5 rounded-xl border border-border-subtle bg-bg-panel/25 flex flex-col items-center">
          <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-4 self-start">Risk Radar</h4>
          <RadarChart />
        </div>
        <div className="p-5 rounded-xl border border-border-subtle bg-bg-panel/25 flex flex-col items-center">
          <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-4 self-start">Package Distribution</h4>
          <DepDonut />
        </div>
      </div>

      {/* Survivability Bars */}
      <div className="p-5 rounded-xl border border-border-subtle bg-bg-panel/25">
        <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-4">Survivability Dimensions</h4>
        <SurvivabilityBars />
      </div>
    </div>
  )
}
