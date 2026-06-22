import React from 'react'
import { TrendingDown, ShieldAlert, Package, BookOpen, Users, Clock } from 'lucide-react'

/**
 * RiskForecastPanel — Phase 7
 * Shows 5 future risk dimensions + outlook narrative
 */
export default function RiskForecastPanel({ repo }) {
  const analysis = repo.analyses?.[0] || null
  const findings = analysis?.findings || {}
  const details  = findings.survivability_details || {}
  const rawStats = details.raw_stats || {}
  const metrics  = details.metrics || {}
  const riskFactors = details.risk_factors || []
  const prediction  = findings.health_prediction || null

  if (!analysis) {
    return (
      <div className="p-8 text-center text-text-muted text-xs italic bg-bg-panel/20 border border-border-subtle rounded-xl">
        No risk forecast data available. Run analysis to generate risk intelligence.
      </div>
    )
  }

  // --- Risk Level computation for each dimension ---
  const getRiskLevel = (score, invertedScore = false) => {
    const s = invertedScore ? (100 - score) : score
    if (s < 30) return { level: 'High',   color: 'rose',    text: 'text-rose-400',   bg: 'bg-rose-500/10 border-rose-500/20',   bar: 'bg-rose-400' }
    if (s < 60) return { level: 'Medium', color: 'amber',   text: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20',  bar: 'bg-amber-400' }
    return             { level: 'Low',    color: 'emerald', text: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', bar: 'bg-emerald-400' }
  }

  // Inactivity score (higher days = higher risk)
  const daysAgo       = rawStats.last_commit_days_ago ?? 9999
  const activityScore = Math.max(0, 100 - Math.min(daysAgo / 3.65, 100))
  const maintenanceRisk = getRiskLevel(activityScore)

  // Dependency risk from metrics.dependency_freshness_score (lower = higher risk)
  const depFreshnessScore = metrics.dependency_freshness_score || 50
  const depRisk = getRiskLevel(depFreshnessScore)

  // Security risk from metrics.security_risks_score
  const secScore = metrics.security_risks_score ?? 100
  const secRisk  = getRiskLevel(secScore)

  // Documentation risk
  const docScore = repo.documentation_profile?.completeness_score || 50
  const docRisk  = getRiskLevel(docScore)

  // Community risk from contributor_activity_score
  const commScore = metrics.contributor_activity_score || 50
  const commRisk  = getRiskLevel(commScore)

  const dimensions = [
    {
      name: 'Maintenance Risk',
      Icon: Clock,
      risk: maintenanceRisk,
      score: activityScore,
      narrative: daysAgo >= 365
        ? `Repository has been inactive for ${daysAgo} days — very high abandonment risk.`
        : daysAgo >= 90
        ? `Last commit was ${daysAgo} days ago — watch for declining maintenance.`
        : `Repository was updated ${daysAgo} days ago — maintenance appears active.`,
      stat: `${daysAgo} days since last commit · ${rawStats.commit_count_1y || 0} commits/year`,
    },
    {
      name: 'Dependency Risk',
      Icon: Package,
      risk: depRisk,
      score: depFreshnessScore,
      narrative: depFreshnessScore < 40
        ? 'Many dependencies appear outdated or unpinned — significant supply chain risk.'
        : depFreshnessScore < 70
        ? 'Some dependency drift detected. Consider reviewing pinning policies.'
        : 'Dependencies appear reasonably fresh and well-managed.',
      stat: `Freshness index: ${Math.round(depFreshnessScore)}% · ${repo.dependencies_profile?.report?.missing_versions?.length || 0} unpinned`,
    },
    {
      name: 'Security Risk',
      Icon: ShieldAlert,
      risk: secRisk,
      score: secScore,
      narrative: secScore < 40
        ? 'Multiple suspicious or unverified packages detected — review dependency provenance.'
        : secScore < 70
        ? 'Some security anomalies detected in dependency declarations.'
        : 'No significant security anomalies detected in dependency declarations.',
      stat: `Security index: ${Math.round(secScore)}% · ${repo.dependencies_profile?.report?.suspicious_declarations?.length || 0} suspicious packages`,
    },
    {
      name: 'Documentation Risk',
      Icon: BookOpen,
      risk: docRisk,
      score: docScore,
      narrative: docScore < 40
        ? 'Critical documentation gaps — onboarding new developers will be very difficult.'
        : docScore < 70
        ? 'Documentation is incomplete. Missing sections may hinder reproducibility.'
        : 'Documentation coverage is adequate for onboarding.',
      stat: `Completeness: ${docScore}% · Quality: ${repo.documentation_profile?.ai_analysis?.documentation_quality || 'unknown'}`,
    },
    {
      name: 'Community Risk',
      Icon: Users,
      risk: commRisk,
      score: commScore,
      narrative: (rawStats.total_contributors || 0) <= 1
        ? 'Single-contributor project — high bus factor. Project viability depends on one person.'
        : (rawStats.active_contributors_90d || 0) === 0
        ? 'No active contributors in the last 90 days — community may have abandoned the project.'
        : `${rawStats.active_contributors_90d} active contributor(s) recently — community appears healthy.`,
      stat: `${rawStats.total_contributors || 0} total · ${rawStats.active_contributors_90d || 0} active (90d)`,
    },
  ]

  // Overall future outlook
  const avgRiskScore = Math.round(dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length)
  const highRiskCount = dimensions.filter(d => d.risk.level === 'High').length
  const overallOutlook =
    highRiskCount >= 3 ? { text: 'Critical', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' }
  : highRiskCount >= 1 ? { text: 'Concerning', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' }
  :                      { text: 'Stable',     color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between p-5 rounded-2xl border border-border-subtle bg-gradient-to-br from-bg-surface to-bg-panel/40">
        <div className="flex items-center gap-3">
          <TrendingDown className="w-5 h-5 text-brand-indigo" />
          <div>
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest block">Future Risk Outlook</span>
            <span className={`text-xl font-black ${overallOutlook.color}`}>{overallOutlook.text}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-black px-3 py-1 rounded-full border uppercase tracking-widest ${overallOutlook.bg} ${overallOutlook.color}`}>
            {highRiskCount} High Risk
          </span>
          <span className="text-[9px] font-black px-3 py-1 rounded-full bg-bg-panel border border-border-subtle text-text-muted uppercase">
            Avg: {avgRiskScore}%
          </span>
        </div>
      </div>

      {/* Risk Dimension Cards */}
      <div className="space-y-3">
        {dimensions.map((dim) => {
          const DimIcon = dim.Icon
          return (
            <div key={dim.name} className="p-5 rounded-xl border border-border-subtle bg-bg-panel/25 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <DimIcon className={`w-4 h-4 ${dim.risk.text}`} />
                  <span className="text-xs font-bold text-text-primary">{dim.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-text-muted font-mono">{Math.round(dim.score)}%</span>
                  <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full border uppercase tracking-widest ${dim.risk.bg} ${dim.risk.text}`}>
                    {dim.risk.level}
                  </span>
                </div>
              </div>

              {/* Risk bar */}
              <div className="w-full bg-bg-input h-1.5 rounded-full overflow-hidden border border-border-subtle">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${dim.risk.bar}`}
                  style={{ width: `${Math.max(0, Math.min(100, dim.score))}%` }}
                />
              </div>

              <div>
                <p className="text-xs text-text-secondary font-light leading-relaxed">{dim.narrative}</p>
                <p className="text-[9px] text-text-muted font-mono mt-1">{dim.stat}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Detected Risk Factors */}
      {riskFactors.length > 0 && (
        <div className="p-5 rounded-xl bg-rose-500/5 border border-rose-500/15 space-y-3">
          <span className="text-[9px] font-bold text-rose-400 uppercase tracking-widest flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5" /> Detected Risk Factors ({riskFactors.length})
          </span>
          <ul className="space-y-2">
            {riskFactors.map((rf, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-text-secondary font-light">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                {rf}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* AI Prediction narrative */}
      {prediction && (
        <div className="p-5 rounded-xl bg-bg-panel/20 border border-border-subtle space-y-2">
          <span className="text-[9px] font-bold text-brand-purple uppercase tracking-widest">AI Predictive Reasoning</span>
          <p className="text-xs text-text-secondary font-light leading-relaxed">{prediction.reasoning}</p>
        </div>
      )}
    </div>
  )
}
