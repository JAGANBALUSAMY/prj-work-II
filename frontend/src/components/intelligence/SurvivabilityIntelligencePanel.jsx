import React from 'react'
import { Brain, ShieldAlert, AlertCircle } from 'lucide-react'
import { CircularProgress } from '../ui/CircularProgress'
import { Card } from '../ui/Card'

export default function SurvivabilityIntelligencePanel({ repo }) {
  if (!repo || !repo.analyses || repo.analyses.length === 0) {
    return (
      <div className="p-8 text-center text-text-muted text-xs italic bg-bg-panel/20 border border-border-subtle rounded-xl font-light animate-fadeIn">
        No survivability data recorded.
      </div>
    )
  }

  const analysis = repo.analyses[0]
  const findings = analysis.findings || {}
  const factors = findings.survivability_factors || {}
  const details = findings.survivability_details || null
  const prediction = findings.health_prediction || null

  const getCategoryBadgeClass = (category) => {
    const c = (category || '').toLowerCase()
    if (c === 'healthy') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    if (c === 'moderate') return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    if (c === 'at risk') return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
    return 'bg-rose-500/10 text-rose-400 border-rose-500/20'
  }

  const getPredictiveBadgeClass = (health) => {
    const h = (health || '').toLowerCase()
    if (h === 'healthy') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    if (h === 'at risk') return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
    if (h === 'dormant') return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    return 'bg-rose-500/10 text-rose-400 border-rose-500/20'
  }

  const getBarColor = (score) => {
    if (score >= 80) return 'bg-emerald-400'
    if (score >= 60) return 'bg-amber-400'
    if (score >= 30) return 'bg-orange-400'
    return 'bg-rose-400'
  }

  if (details) {
    const metrics = details.metrics || {}
    const rawStats = details.raw_stats || {}
    const riskFactors = details.risk_factors || []
    const days_ago = rawStats.last_commit_days_ago || 0
    
    const subMetrics = [
      { name: 'Commit Frequency', score: metrics.commit_frequency_score || 0, desc: `${rawStats.commit_count_1y || 0} commits in the last year` },
      { name: 'Release Frequency', score: metrics.release_frequency_score || 0, desc: `${rawStats.tags_count || 0} release tags found` },
      { name: 'Dependency Freshness', score: metrics.dependency_freshness_score || 0, desc: 'Constraint pinning and repository age' },
      { name: 'Contributor Activity', score: metrics.contributor_activity_score || 0, desc: `${rawStats.active_contributors_90d || 0} active, ${rawStats.total_contributors || 0} total contributors` },
      { name: 'Issue Resolution Rate', score: metrics.issue_resolution_score || 0, desc: `${rawStats.open_issues || 0} open issues` },
      { name: 'Security Risk Indicators', score: metrics.security_risks_score || 0, desc: 'Duplicate, unpinned, and suspicious packages' }
    ]

    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Header Cards Grid (Survivability + AI Prediction) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Core Survivability Card */}
          <div className="p-6 rounded-2xl border border-border-subtle bg-bg-panel/25 flex flex-col sm:flex-row items-center justify-around gap-6">
            <div className="shrink-0 flex justify-center">
              <CircularProgress 
                score={analysis.survivability_score || 0} 
                label="Survivability Score" 
                size={100} 
              />
            </div>
            
            <div className="space-y-3 text-center sm:text-left flex-1">
              <div>
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block font-mono">Health Classification</span>
                <span className={`inline-block px-3 py-1 rounded-xl text-[11px] font-black border uppercase tracking-wider mt-1.5 ${getCategoryBadgeClass(details.health_category)}`}>
                  {details.health_category}
                </span>
              </div>
              <p className="text-xs text-text-secondary font-light leading-relaxed">
                The survivability index measures long-term project viability, maintenance speed, community activity, and architectural security resilience.
              </p>
            </div>
          </div>

          {/* Health Prediction Outcome Card */}
          {prediction ? (
            <div className="p-6 rounded-2xl border border-border-subtle bg-bg-panel/25 flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-brand-purple" />
                  <span className="text-xs font-extrabold text-text-primary uppercase tracking-wide">AI Health Prediction</span>
                </div>
                <span className={`px-3 py-1 rounded-xl text-[11px] font-black border uppercase tracking-wider ${getPredictiveBadgeClass(prediction.predicted_health)}`}>
                  {prediction.predicted_health}
                </span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] text-text-muted font-mono">
                  <span>Model Confidence</span>
                  <span>{Math.round(prediction.confidence * 100)}%</span>
                </div>
                <div className="w-full bg-bg-panel/60 h-1.5 rounded-full overflow-hidden border border-border-subtle">
                  <div 
                    className="h-full rounded-full bg-brand-purple" 
                    style={{ width: `${prediction.confidence * 100}%` }}
                  />
                </div>
              </div>

              <p className="text-xs text-text-secondary leading-relaxed font-light select-text">
                {prediction.reasoning}
              </p>
            </div>
          ) : (
            <div className="p-6 rounded-2xl border border-border-subtle bg-bg-panel/20 flex flex-col justify-center items-center text-center italic text-text-muted text-xs font-light">
              <Brain className="w-8 h-8 text-text-muted/30 mb-2 animate-pulse" />
              Predictive health model output not generated. Run analysis to trigger classification.
            </div>
          )}
        </div>

        {/* Risk Factors Section if any exist */}
        {riskFactors.length > 0 && (
          <Card className="p-5 border border-status-error/10 bg-status-error-bg/5 space-y-3">
            <span className="text-[10px] text-status-error font-extrabold uppercase tracking-widest flex items-center gap-1.5 font-mono">
              <ShieldAlert className="w-4 h-4" /> Detected Risk Factors ({riskFactors.length})
            </span>
            <ul className="space-y-2">
              {riskFactors.map((rf, i) => (
                <li key={i} className="text-xs text-text-secondary flex items-start gap-2 font-light">
                  <span className="w-1.5 h-1.5 rounded-full bg-status-error mt-1.5 shrink-0"></span>
                  <span>{rf}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* 6 Upgraded Sub-Metrics grid */}
        <div>
          <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3">Survivability Dimensions Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subMetrics.map((sm, i) => (
              <div key={i} className="p-4 rounded-xl bg-bg-panel/30 border border-border-subtle space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-text-primary">{sm.name}</span>
                  <span className="font-bold font-mono text-text-secondary">{sm.score}%</span>
                </div>
                <div className="w-full bg-bg-panel/60 h-1.5 rounded-full overflow-hidden border border-border-subtle">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${getBarColor(sm.score)}`} 
                    style={{ width: `${sm.score}%` }}
                  />
                </div>
                <span className="text-[10px] text-text-muted font-light leading-relaxed block">{sm.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Raw Stats Grid */}
        <div>
          <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3">Repository Activity Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Days Since Last Commit', val: rawStats.last_commit_days_ago, desc: days_ago === 0 ? 'Committed today' : days_ago === 1 ? '1 day ago' : `${days_ago} days ago` },
              { label: 'Commits (Last Year)', val: rawStats.commit_count_1y, desc: 'Maintenance intensity' },
              { label: 'Release Tags Count', val: rawStats.tags_count, desc: 'Versioning frequency' },
              { label: 'Total Contributors', val: rawStats.total_contributors, desc: 'Project community size' },
              { label: 'Active Contributors (90d)', val: rawStats.active_contributors_90d, desc: 'Recent collaboration' },
              { label: 'Open Issues Count', val: rawStats.open_issues, desc: 'Unresolved backlog' }
            ].map((stat, i) => (
              <div key={i} className="p-4 rounded-xl bg-bg-input/60 border border-border-subtle flex flex-col justify-between min-h-[72px]">
                <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider">{stat.label}</span>
                <div className="mt-1 flex items-baseline justify-between gap-2">
                  <span className="text-base font-extrabold text-text-primary">{stat.val}</span>
                  <span className="text-[9px] text-text-muted font-light truncate max-w-[100px]">{stat.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Legacy Fallback (older reports without survivability_details)
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-center py-2">
        <CircularProgress 
          score={analysis.survivability_score || 0} 
          label="Survivability Score" 
          size={110} 
        />
      </div>
      
      <div>
        <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3">Project Health Metrics</h3>
        <div className="space-y-3">
          {[
            {
              label: "Repository Maintenance Activity",
              val: factors.active_maintenance ? 'Active' : 'Dormant',
              tag: factors.active_maintenance ? 'bg-status-success-bg text-status-success border-status-success/20' : 'bg-status-error-bg text-status-error border-status-error/20'
            },
            {
              label: "Permissive Open Source License",
              val: factors.license_permissive ? 'Permissive' : 'Missing/Strict',
              tag: factors.license_permissive ? 'bg-status-success-bg text-status-success border-status-success/20' : 'bg-status-error-bg text-status-error border-status-error/20'
            },
            {
              label: "Dependencies Security Index",
              val: factors.dependency_health || 'Healthy',
              tag: (factors.dependency_health || 'Healthy').toLowerCase() === 'healthy' ? 'bg-status-success-bg text-status-success border-status-success/20' : 'bg-status-warning-bg text-status-warning border-status-warning/20'
            }
          ].map((factor, i) => (
            <div key={i} className="p-4 rounded-xl bg-bg-panel/30 border border-border-subtle flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan"></span> 
                <span className="text-xs text-text-secondary font-semibold">{factor.label}</span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${factor.tag}`}>
                {factor.val}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
