import React from 'react'
import { Brain, ShieldAlert, Activity, Users, Star, Tag, CheckSquare, Package, Clock } from 'lucide-react'
import { CircularProgress } from '../ui/CircularProgress'
import { Card } from '../ui/Card'

const DIMENSION_ICONS = {
  "Commit Frequency": Clock,
  "Contributor Activity": Users,
  "Repository Popularity": Star,
  "Security Health": ShieldAlert,
  "Dependency Freshness": Package,
  "Release Frequency": Tag,
  "Issue Resolution": CheckSquare
}

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
  
  const breakdown = factors.breakdown || []
  const confidenceScore = factors.confidence_score || 0
  const srvScore = factors.total_score || analysis.survivability_score || 0

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

  const getBarColor = (score, max) => {
    const ratio = score / max
    if (ratio >= 0.8) return 'bg-emerald-400'
    if (ratio >= 0.5) return 'bg-amber-400'
    if (ratio > 0) return 'bg-orange-400'
    return 'bg-rose-400'
  }

  const getTextColor = (score, max) => {
    const ratio = score / max
    if (ratio >= 0.8) return 'text-emerald-400'
    if (ratio >= 0.5) return 'text-amber-400'
    if (ratio > 0) return 'text-orange-400'
    return 'text-rose-400'
  }

  if (details) {
    const rawStats = details.raw_stats || {}
    const riskFactors = details.risk_factors || []
    const days_ago = rawStats.last_commit_days_ago || 0

    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Header Cards Grid (Survivability + AI Prediction) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Core Survivability Card */}
          <div className="p-6 rounded-2xl border border-border-subtle bg-bg-panel/25 flex flex-col sm:flex-row items-center justify-around gap-6 relative">
            <div className="absolute top-3 left-3 flex items-center gap-1">
               <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest block font-mono">Confidence</span>
               <span className={`px-2 py-0.5 rounded text-[10px] font-black font-mono border ${confidenceScore >= 80 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : confidenceScore >= 50 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                  {confidenceScore}%
               </span>
            </div>
            
            <div className="shrink-0 flex justify-center mt-6 sm:mt-0">
              <CircularProgress 
                score={srvScore} 
                label="Survivability Score" 
                size={100} 
              />
            </div>
            
            <div className="space-y-3 text-center sm:text-left flex-1 mt-4 sm:mt-0">
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

        {/* 7 Upgraded Sub-Metrics grid */}
        {breakdown.length > 0 && (
          <div>
            <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3">Survivability Dimensions Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {breakdown.map((dim, i) => {
                const DimIcon = DIMENSION_ICONS[dim.category] || Activity
                return (
                  <div key={i} className="p-4 rounded-xl bg-bg-panel/30 border border-border-subtle space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center text-xs mb-3">
                        <div className="flex items-center gap-2">
                          <DimIcon className={`w-4 h-4 ${getTextColor(dim.score, dim.max)}`} />
                          <span className="font-semibold text-text-primary">{dim.category}</span>
                        </div>
                        <span className={`font-bold font-mono ${getTextColor(dim.score, dim.max)}`}>{dim.score} / {dim.max}</span>
                      </div>
                      <div className="w-full bg-bg-panel/60 h-1.5 rounded-full overflow-hidden border border-border-subtle">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${getBarColor(dim.score, dim.max)}`} 
                          style={{ width: `${(dim.score / dim.max) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-[10px] text-text-muted font-light leading-relaxed block mt-2">{dim.reason}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

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

  // Legacy Fallback
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-center py-2">
        <CircularProgress 
          score={srvScore} 
          label="Survivability Score" 
          size={110} 
        />
      </div>
      
      <div>
        <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3">Project Health Metrics</h3>
        <div className="space-y-3">
          <div className="p-8 text-center text-text-muted text-xs italic bg-bg-panel/20 border border-border-subtle rounded-xl font-light">
            No detailed survivability data found. Run analysis again to generate full metrics.
          </div>
        </div>
      </div>
    </div>
  )
}
