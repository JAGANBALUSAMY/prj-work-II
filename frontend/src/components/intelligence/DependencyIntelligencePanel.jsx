import React, { useState } from 'react'
import { AlertTriangle, CheckCircle, XCircle, Package, Search, Filter, ChevronRight } from 'lucide-react'

/**
 * DependencyIntelligencePanel — Phase 4
 * Full dependency risk table + AI summary + freshness visualization
 */
export default function DependencyIntelligencePanel({ repo }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const profile = repo.dependencies_profile
  if (!profile) {
    return (
      <div className="p-8 text-center text-text-muted text-xs italic bg-bg-panel/20 border border-border-subtle rounded-xl font-light">
        No dependency analysis available. Run analysis to scan packages.
      </div>
    )
  }

  const deps    = profile.dependencies || []
  const report  = profile.report || {}
  const aiDep   = profile.ai_analysis || null
  
  const analysis = repo.analyses?.[0] || null
  const intel = analysis?.findings?.intelligence || {}

  const duplicates  = report.duplicates || []
  const missing     = report.missing_versions || []
  const suspicious  = report.suspicious_declarations || []

  // Risk classification per dependency
  const getDependencyRisk = (dep) => {
    const isDup  = duplicates.some(d => d.name.toLowerCase() === dep.name.toLowerCase() && d.source_file === dep.source_file)
    const isMiss = !dep.version || dep.version === '*' || dep.version === 'unspecified' || dep.version === 'latest'
    const isSupp = suspicious.some(s => s.name.toLowerCase() === dep.name.toLowerCase())

    if (isSupp || isDup) return { level: 'High',   color: 'text-rose-400',   bg: 'bg-rose-500/10 border-rose-500/20',   reason: isSupp ? 'Suspicious declaration' : 'Duplicate entry' }
    if (isMiss)          return { level: 'Medium', color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20',  reason: 'No version pinned' }
    return                      { level: 'Low',    color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', reason: 'Version pinned' }
  }

  // Type badge styling
  const typeColor = (t) => {
    if (!t) return 'bg-bg-panel text-text-muted border-border-subtle'
    const v = t.toLowerCase()
    if (v.includes('prod') || v === 'direct' || v === 'compile') return 'bg-brand-indigo/10 text-brand-indigo border-brand-indigo/20'
    if (v.includes('dev') || v.includes('test'))  return 'bg-brand-purple/10 text-brand-purple border-brand-purple/20'
    if (v.includes('build') || v.includes('optional')) return 'bg-text-muted/10 text-text-muted border-border-subtle'
    return 'bg-bg-panel text-text-secondary border-border-subtle'
  }

  // Filtered deps
  const filteredDeps = deps.filter(d => {
    const nameMatch = d.name.toLowerCase().includes(search.toLowerCase())
    if (!nameMatch) return false
    if (filter === 'all') return true
    if (filter === 'high') return getDependencyRisk(d).level === 'High'
    if (filter === 'medium') return getDependencyRisk(d).level === 'Medium'
    if (filter === 'pinned') return getDependencyRisk(d).level === 'Low'
    if (filter === 'prod') {
      const t = (d.dependency_type || '').toLowerCase()
      return t === 'production' || t === 'direct' || t === 'compile'
    }
    return true
  })

  // KPI counts
  const highRiskCount = deps.filter(d => getDependencyRisk(d).level === 'High').length
  const medRiskCount  = deps.filter(d => getDependencyRisk(d).level === 'Medium').length
  const lowRiskCount  = deps.filter(d => getDependencyRisk(d).level === 'Low').length

  const riskLevelColor = (lvl) => ({
    'High':   'text-rose-400   bg-rose-500/10   border-rose-500/20',
    'Medium': 'text-amber-400  bg-amber-500/10  border-amber-500/20',
    'Low':    'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  }[lvl] || 'text-text-muted bg-bg-panel border-border-subtle')

  // Critical packages from suspicious declarations
  const criticalPkgs = suspicious.slice(0, 5)

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* KPI Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Packages', val: report.total_count || 0, color: 'text-text-primary', Icon: Package },
          { label: 'High Risk',      val: highRiskCount, color: 'text-rose-400',    Icon: XCircle },
          { label: 'Unpinned',       val: medRiskCount,  color: 'text-amber-400',   Icon: AlertTriangle },
          { label: 'Pinned',         val: lowRiskCount,  color: 'text-emerald-400', Icon: CheckCircle },
        ].map((kpi) => {
          const KpiIcon = kpi.Icon
          return (
            <div key={kpi.label} className="p-4 rounded-xl bg-bg-panel/30 border border-border-subtle flex flex-col justify-between">
              <div className="flex items-center gap-1.5">
                <KpiIcon className={`w-3.5 h-3.5 ${kpi.color}`} />
                <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest">{kpi.label}</span>
              </div>
              <span className={`text-2xl font-black mt-2 ${kpi.color}`}>{kpi.val}</span>
            </div>
          )
        })}
      </div>

      {/* AI Dependency Health Summary */}
      {aiDep && (
        <div className="p-5 rounded-xl bg-bg-panel/20 border border-border-subtle space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-brand-cyan uppercase tracking-widest">AI Dependency Assessment</span>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase ${riskLevelColor(aiDep.risk_level)}`}>
              Risk: {aiDep.risk_level || 'N/A'}
            </span>
          </div>
          {aiDep.dependency_health_summary && (
            <p className="text-xs text-text-secondary leading-relaxed font-light">{aiDep.dependency_health_summary}</p>
          )}
          {aiDep.version_pinning_assessment && (
            <div className="p-3 rounded-lg bg-bg-input border border-border-subtle">
              <span className="text-[9px] text-text-muted font-bold uppercase block mb-1">Version Pinning Assessment</span>
              <p className="text-xs text-text-secondary font-light">{aiDep.version_pinning_assessment}</p>
            </div>
          )}
          {aiDep.upgrade_suggestions?.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[9px] text-text-muted font-bold uppercase tracking-widest block">Upgrade Suggestions</span>
              <ul className="space-y-1">
                {aiDep.upgrade_suggestions.map((sug, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-text-secondary font-light">
                    <ChevronRight className="w-3 h-3 text-brand-cyan mt-0.5 shrink-0" />
                    {sug}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Risk Distribution Bar */}
      {deps.length > 0 && (
        <div className="p-4 rounded-xl bg-bg-panel/20 border border-border-subtle space-y-2">
          <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Risk Distribution</span>
          <div className="flex rounded-full overflow-hidden h-3">
            {highRiskCount > 0 && (
              <div className="bg-rose-500 transition-all" style={{ width: `${(highRiskCount / deps.length) * 100}%` }} title={`High: ${highRiskCount}`} />
            )}
            {medRiskCount > 0 && (
              <div className="bg-amber-500 transition-all" style={{ width: `${(medRiskCount / deps.length) * 100}%` }} title={`Medium: ${medRiskCount}`} />
            )}
            {lowRiskCount > 0 && (
              <div className="bg-emerald-500 transition-all" style={{ width: `${(lowRiskCount / deps.length) * 100}%` }} title={`Low: ${lowRiskCount}`} />
            )}
          </div>
          <div className="flex gap-4 text-[9px] text-text-muted">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />High: {highRiskCount}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />Medium: {medRiskCount}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Low: {lowRiskCount}</span>
          </div>
        </div>
      )}

      {/* Critical Packages */}
      {criticalPkgs.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/15 space-y-2">
          <span className="text-[9px] font-bold text-rose-400 uppercase tracking-widest flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Suspicious Packages ({criticalPkgs.length})
          </span>
          <div className="space-y-2">
            {criticalPkgs.map((pkg, i) => (
              <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-bg-input border border-border-subtle">
                <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-text-primary">{pkg.name}</span>
                  {pkg.version && <span className="text-[9px] text-text-muted ml-2 font-mono">{pkg.version}</span>}
                  {pkg.reason && <p className="text-[10px] text-rose-400/80 mt-0.5 font-light">{pkg.reason}</p>}
                </div>
                <span className="text-[9px] text-text-muted font-mono shrink-0">{pkg.source_file}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Critical Dependencies */}
      {intel?.dependency_criticality?.top_critical_dependencies?.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            Top Critical Dependencies
          </h4>
          <div className="rounded-xl border border-border-subtle overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-bg-panel/60 border-b border-border-subtle text-[9px] font-bold text-text-muted uppercase tracking-widest">
              <span className="col-span-3">Package</span>
              <span className="col-span-2">Purpose</span>
              <span className="col-span-1">Risk</span>
              <span className="col-span-3">Impact if Removed</span>
              <span className="col-span-3">Recommendation</span>
            </div>
            <div className="divide-y divide-border-subtle">
              {intel.dependency_criticality.top_critical_dependencies.map((dep, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 px-4 py-2.5 hover:bg-bg-panel/30 transition text-xs">
                  <span className="col-span-3 font-mono text-text-primary truncate" title={dep.name}>{dep.name}</span>
                  <span className="col-span-2 text-text-secondary truncate text-[10px]">{dep.purpose}</span>
                  <span className="col-span-1">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${riskLevelColor(dep.risk)}`}>
                      {dep.risk}
                    </span>
                  </span>
                  <span className="col-span-3 text-[10px] text-rose-400/80 font-light leading-snug">{dep.impact_if_removed}</span>
                  <span className="col-span-3 text-[10px] text-emerald-400/80 font-light leading-snug">{dep.recommendation}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Search + Filter Controls */}
      <div className="space-y-3">
        <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
          Dependency Risk Table ({filteredDeps.length} of {deps.length})
        </h4>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <input
              type="text"
              placeholder="Search packages..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-bg-input border border-border-subtle text-xs text-text-secondary outline-none focus:border-brand-indigo transition"
            />
          </div>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-bg-panel border border-border-subtle text-xs text-text-secondary outline-none focus:border-brand-indigo"
          >
            <option value="all">All Packages</option>
            <option value="high">High Risk Only</option>
            <option value="medium">Unpinned Only</option>
            <option value="pinned">Pinned Only</option>
            <option value="prod">Production Only</option>
          </select>
        </div>
      </div>

      {/* Dependency Risk Table */}
      {filteredDeps.length > 0 ? (
        <div className="rounded-xl border border-border-subtle overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-bg-panel/60 border-b border-border-subtle text-[9px] font-bold text-text-muted uppercase tracking-widest">
            <span className="col-span-4">Package</span>
            <span className="col-span-2">Version</span>
            <span className="col-span-2">Type</span>
            <span className="col-span-1">Risk</span>
            <span className="col-span-3">Reason</span>
          </div>
          {/* Table rows */}
          <div className="divide-y divide-border-subtle max-h-[400px] overflow-y-auto scrollbar-thin">
            {filteredDeps.map((dep, i) => {
              const risk = getDependencyRisk(dep)
              return (
                <div key={i} className="grid grid-cols-12 gap-2 px-4 py-2.5 hover:bg-bg-panel/30 transition text-xs">
                  <span className="col-span-4 font-mono text-text-primary truncate" title={dep.name}>{dep.name}</span>
                  <span className="col-span-2 font-mono text-text-muted truncate" title={dep.version || '—'}>
                    {dep.version || <span className="italic text-amber-400/70">unpinned</span>}
                  </span>
                  <span className="col-span-2">
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${typeColor(dep.dependency_type)}`}>
                      {dep.dependency_type || 'unknown'}
                    </span>
                  </span>
                  <span className="col-span-1">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${riskLevelColor(risk.level)}`}>
                      {risk.level}
                    </span>
                  </span>
                  <span className="col-span-3 text-[10px] text-text-muted font-light truncate" title={risk.reason}>{risk.reason}</span>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="p-6 text-center text-text-muted text-xs italic bg-bg-panel/20 border border-border-subtle rounded-xl">
          No packages match your filter.
        </div>
      )}
    </div>
  )
}
