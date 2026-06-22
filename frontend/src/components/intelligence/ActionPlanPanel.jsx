import React, { useState } from 'react'
import { AlertCircle, AlertTriangle, Lightbulb, ChevronRight, CheckSquare } from 'lucide-react'

/**
 * ActionPlanPanel — Phase 8
 * Consolidates all recommendations into prioritized groups
 */
export default function ActionPlanPanel({ repo }) {
  const [expanded, setExpanded] = useState({ critical: true, important: true, optional: false })

  const analysis    = repo.analyses?.[0] || null
  const findings    = analysis?.findings || {}
  const details     = findings.survivability_details || {}
  const riskFactors = details.risk_factors || []

  // Gather all recommendations from all sources
  const buildRec   = repo.failure_diagnosis?.ai_recommendation
  const diagRec    = repo.failure_diagnosis?.recommendations || []
  const docRec     = repo.documentation_profile?.ai_analysis?.improvement_recommendations || []
  const depRec     = repo.dependencies_profile?.ai_analysis?.upgrade_suggestions || []

  // Classify actions into Critical / Important / Optional
  const critical = []
  const important = []
  const optional  = []

  // Build failure is always critical
  if (repo.build_result && !repo.build_result.build_success) {
    if (buildRec?.fix_steps) {
      buildRec.fix_steps.forEach(step => critical.push({ text: step, source: 'Build Fix (AI)', icon: AlertCircle }))
    }
    diagRec.forEach(rec => critical.push({ text: rec, source: 'Build Scanner', icon: AlertCircle }))
  }

  // Risk factors are critical/important
  riskFactors.forEach(rf => {
    const rfLower = rf.toLowerCase()
    if (rfLower.includes('single contributor') || rfLower.includes('build failure') || rfLower.includes('suspicious')) {
      critical.push({ text: rf, source: 'Risk Analysis', icon: AlertCircle })
    } else {
      important.push({ text: rf, source: 'Risk Analysis', icon: AlertTriangle })
    }
  })

  // Dependency issues
  const missingVersions = repo.dependencies_profile?.report?.missing_versions || []
  if (missingVersions.length > 3) {
    critical.push({ text: `Pin all ${missingVersions.length} unpinned dependencies to specific versions to prevent supply chain drift.`, source: 'Dependency Audit', icon: AlertCircle })
  } else if (missingVersions.length > 0) {
    important.push({ text: `Pin ${missingVersions.length} unpinned dependencies: ${missingVersions.slice(0, 3).map(m => m.name).join(', ')}${missingVersions.length > 3 ? '...' : ''}.`, source: 'Dependency Audit', icon: AlertTriangle })
  }

  // Suspicious packages
  const suspicious = repo.dependencies_profile?.report?.suspicious_declarations || []
  if (suspicious.length > 0) {
    critical.push({ text: `Review ${suspicious.length} suspicious package(s): ${suspicious.slice(0, 2).map(s => s.name).join(', ')}. Verify provenance and consider alternatives.`, source: 'Dependency Scanner', icon: AlertCircle })
  }

  // No Dockerfile
  if (!findings.reproducibility_factors?.has_dockerfile) {
    important.push({ text: 'Add a Dockerfile or docker-compose.yml to significantly improve reproducibility and enable containerized deployment.', source: 'Reproducibility', icon: AlertTriangle })
  }

  // Doc recommendations
  docRec.forEach(rec => optional.push({ text: rec, source: 'Documentation AI', icon: Lightbulb }))

  // Dep upgrade suggestions
  depRec.forEach(sug => optional.push({ text: sug, source: 'Dependency AI', icon: Lightbulb }))

  // Missing documentation areas as optional
  const missingDocAreas = repo.documentation_profile?.ai_analysis?.missing_documentation_areas || []
  missingDocAreas.forEach(area => optional.push({ text: `Add missing documentation section: ${area}`, source: 'Documentation Scanner', icon: Lightbulb }))

  // Low survivability submetrics as important
  const metrics = details.metrics || {}
  if ((metrics.commit_frequency_score || 0) < 30) {
    important.push({ text: 'Increase commit frequency — the project shows very low maintenance activity. Consider a structured release schedule.', source: 'Survivability Analysis', icon: AlertTriangle })
  }
  if ((metrics.contributor_activity_score || 0) < 30) {
    important.push({ text: 'Attract new contributors — single developer dependency is a critical survivability risk. Add a CONTRIBUTING.md guide.', source: 'Survivability Analysis', icon: AlertTriangle })
  }
  if ((metrics.release_frequency_score || 0) < 30) {
    optional.push({ text: 'Establish a release tagging workflow (semantic versioning) to improve project maturity signals and dependency management for downstream consumers.', source: 'Survivability Analysis', icon: Lightbulb })
  }

  const total = critical.length + important.length + optional.length

  const SectionBlock = ({ title, items, colorClass, borderClass, Icon, key: k }) => {
    const isExp = expanded[k]
    return (
      <div className={`rounded-xl border ${borderClass} overflow-hidden`}>
        <button
          className={`w-full flex items-center justify-between p-4 ${colorClass} hover:opacity-90 transition`}
          onClick={() => setExpanded(p => ({ ...p, [k]: !p[k] }))}
        >
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest">{title}</span>
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-black/10">{items.length}</span>
          </div>
          <span className="text-[10px] font-bold">{isExp ? '▲' : '▼'}</span>
        </button>
        {isExp && items.length > 0 && (
          <div className="divide-y divide-border-subtle">
            {items.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-4 hover:bg-bg-panel/20 transition">
                <ChevronRight className="w-3.5 h-3.5 text-text-muted shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-secondary font-light leading-relaxed">{item.text}</p>
                  <span className="text-[9px] text-text-muted font-mono mt-1 block">{item.source}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        {isExp && items.length === 0 && (
          <div className="p-4 text-xs text-text-muted italic text-center font-light">No items in this category.</div>
        )}
      </div>
    )
  }

  if (total === 0) {
    return (
      <div className="p-10 text-center text-text-muted text-xs italic bg-bg-panel/20 border border-border-subtle rounded-2xl font-light">
        <CheckSquare className="w-10 h-10 text-emerald-400/40 mx-auto mb-3" />
        No actionable recommendations generated. The repository appears to be in good health.
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-text-primary flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-brand-indigo" />
            Prioritized Action Plan
          </h3>
          <p className="text-[10px] text-text-muted mt-0.5">{total} recommendation{total !== 1 ? 's' : ''} across all analysis dimensions</p>
        </div>
        <div className="flex items-center gap-2">
          {critical.length > 0 && <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">{critical.length} Critical</span>}
          {important.length > 0 && <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">{important.length} Important</span>}
          {optional.length > 0 && <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-brand-indigo/10 text-brand-indigo border border-brand-indigo/20">{optional.length} Optional</span>}
        </div>
      </div>

      {/* Critical Actions */}
      <SectionBlock
        title="🔴 Critical — Fix Immediately"
        items={critical}
        colorClass="text-rose-400 bg-rose-500/8"
        borderClass="border-rose-500/20"
        Icon={AlertCircle}
        k="critical"
      />

      {/* Important Actions */}
      <SectionBlock
        title="🟡 Important — Address Soon"
        items={important}
        colorClass="text-amber-400 bg-amber-500/8"
        borderClass="border-amber-500/20"
        Icon={AlertTriangle}
        k="important"
      />

      {/* Optional Improvements */}
      <SectionBlock
        title="🟢 Optional — Nice to Have"
        items={optional}
        colorClass="text-brand-indigo bg-brand-indigo/8"
        borderClass="border-brand-indigo/20"
        Icon={Lightbulb}
        k="optional"
      />
    </div>
  )
}
