import React, { useState } from 'react'
import { Trophy, ShieldAlert, Activity, Brain, TrendingUp, TrendingDown, Minus, Zap } from 'lucide-react'
import { ScoreBadge } from './ScoreBadge'
import { WhyScoreModal } from './WhyScoreModal'

/**
 * ExecutiveIntelligencePanel — Phase 1
 * Shows: Grade, Risk Level, Maturity, Health Prediction, Confidence, Scores
 */
export default function ExecutiveIntelligencePanel({ repo }) {
  const [whyModal, setWhyModal] = useState(null) // 'reproducibility' | 'survivability' | null

  const analysis = repo.analyses?.[0] || null
  const findings = analysis?.findings || {}
  const repro    = analysis?.reproducibility_score || 0
  const surv     = analysis?.survivability_score   || 0
  const composite = Math.round((repro + surv) / 2)

  const details    = findings.survivability_details || {}
  const rawStats   = details.raw_stats || {}
  const metrics    = details.metrics   || {}
  const prediction = findings.health_prediction || null
  const repFactors = findings.reproducibility_factors || {}

  // Backend Grade
  const backendGrade = findings.intelligence?.repository_grade || { grade: 'N/A', explanation: 'Not analyzed.' }
  
  const getGradeStyle = (g) => {
    if (g === 'A+') return { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' }
    if (g === 'A')  return { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' }
    if (g === 'B+') return { color: 'text-teal-400',    bg: 'bg-teal-500/10 border-teal-500/20' }
    if (g === 'B')  return { color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' }
    if (g === 'C+') return { color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' }
    if (g === 'C')  return { color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/20' }
    if (g === 'D')  return { color: 'text-rose-400',    bg: 'bg-rose-500/10 border-rose-500/20' }
    return                 { color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20' }
  }

  // --- Risk Level Computation ---
  const getRiskLevel = () => {
    const riskFactors = details.risk_factors || []
    const healthCat   = (details.health_category || '').toLowerCase()
    if (healthCat === 'dormant' || healthCat === 'at risk' || riskFactors.length >= 3) {
      return { level: 'High', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', Icon: TrendingDown }
    }
    if (riskFactors.length >= 1 || healthCat === 'moderate') {
      return { level: 'Moderate', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', Icon: Minus }
    }
    return { level: 'Low', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', Icon: TrendingUp }
  }

  // --- Maturity Level (from survivability_details) ---
  const getMaturityLevel = () => {
    const cat = (details.health_category || '').toLowerCase()
    const tags = rawStats.tags_count || 0
    const contribs = rawStats.total_contributors || 0
    const docScore = repo.documentation_profile?.completeness_score || 0
    const buildOk = repo.build_result?.build_success
    let score = 0
    if (tags >= 3) score += 2; else if (tags >= 1) score += 1
    if (contribs >= 4) score += 2; else if (contribs >= 2) score += 1
    if (docScore >= 80) score += 2; else if (docScore >= 50) score += 1
    if (buildOk) score += 2
    if (cat !== 'dormant' && rawStats.last_commit_days_ago <= 30) score += 2
    if (score >= 8) return { level: 'Production Ready', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' }
    if (score >= 5) return { level: 'Intermediate',     color: 'text-teal-400',    bg: 'bg-teal-500/10 border-teal-500/20' }
    if (score >= 3) return { level: 'Early Stage',      color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' }
    return                 { level: 'Prototype',         color: 'text-rose-400',    bg: 'bg-rose-500/10 border-rose-500/20' }
  }

  const gradeStyle   = getGradeStyle(backendGrade.grade)
  const riskInfo     = getRiskLevel()
  const maturityInfo = getMaturityLevel()
  const RiskIcon     = riskInfo.Icon

  // Health prediction badge
  const getPredictionStyle = (h) => {
    const v = (h || '').toLowerCase()
    if (v === 'healthy')   return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    if (v === 'at risk')   return 'text-orange-400  bg-orange-500/10  border-orange-500/20'
    if (v === 'dormant')   return 'text-amber-400   bg-amber-500/10   border-amber-500/20'
    return                        'text-rose-400    bg-rose-500/10    border-rose-500/20'
  }

  // --- Reproducibility score breakdown ---
  const reproBreakdown = [
    { label: 'Base score',              points: 30, max: 30, achieved: true,                    reason: 'Awarded for any analyzed repository' },
    { label: 'Dockerfile / Container',  points: 30, max: 30, achieved: !!repFactors.has_dockerfile, reason: 'Dockerfile or docker-compose.yml found' },
    { label: 'README file present',     points: 10, max: 10, achieved: !!repFactors.has_readme,  reason: 'README.md or README.rst found' },
    { label: 'README completeness',
      points: Math.round((repFactors.environment_instructions_score || 0) * 3),
      max: 30,
      achieved: (repFactors.environment_instructions_score || 0) > 0,
      reason: `Completeness score: ${repFactors.environment_instructions_score || 0}/10 × 3` },
  ]

  // --- Survivability score breakdown ---
  const survBreakdown = [
    { label: 'Commit Frequency (25%)',    points: Math.round((metrics.commit_frequency_score || 0) * 0.25),    max: 25, achieved: (metrics.commit_frequency_score || 0) > 0 },
    { label: 'Contributor Activity (20%)',points: Math.round((metrics.contributor_activity_score || 0) * 0.20), max: 20, achieved: (metrics.contributor_activity_score || 0) > 0 },
    { label: 'Release Frequency (15%)',   points: Math.round((metrics.release_frequency_score || 0) * 0.15),   max: 15, achieved: (metrics.release_frequency_score || 0) > 0 },
    { label: 'Dependency Freshness (15%)',points: Math.round((metrics.dependency_freshness_score || 0) * 0.15), max: 15, achieved: (metrics.dependency_freshness_score || 0) > 0 },
    { label: 'Security Risk Index (15%)', points: Math.round((metrics.security_risks_score || 0) * 0.15),      max: 15, achieved: (metrics.security_risks_score || 0) > 0 },
    { label: 'Issue Resolution (10%)',    points: Math.round((metrics.issue_resolution_score || 0) * 0.10),    max: 10, achieved: (metrics.issue_resolution_score || 0) > 0 },
  ]

  if (!analysis) {
    return (
      <div className="p-10 text-center text-text-muted text-xs italic bg-bg-panel/20 border border-border-subtle rounded-2xl">
        No analysis data yet. Trigger a scan to generate intelligence.
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Zap className="w-5 h-5 text-brand-indigo" />
        <h2 className="text-sm font-extrabold text-text-primary uppercase tracking-widest">Executive Intelligence</h2>
      </div>

      {backendGrade.explanation && (
        <div className="p-4 rounded-xl border border-border-subtle bg-bg-surface/50 text-sm font-light text-text-secondary leading-relaxed">
          {backendGrade.explanation}
        </div>
      )}

      {/* Top KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Grade */}
        <div className="p-5 rounded-2xl border border-border-subtle bg-gradient-to-br from-bg-surface to-bg-panel/50 flex flex-col items-center justify-center gap-2 text-center shadow-glass">
          <Trophy className="w-5 h-5 text-brand-indigo" />
          <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Composite Grade</span>
          <span className={`text-5xl font-black ${gradeStyle.color}`}>{backendGrade.grade}</span>
          <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-widest ${gradeStyle.bg} ${gradeStyle.color}`}>
            Score: {backendGrade.score}
          </span>
        </div>

        {/* Risk Level */}
        <div className="p-5 rounded-2xl border border-border-subtle bg-gradient-to-br from-bg-surface to-bg-panel/50 flex flex-col items-center justify-center gap-2 text-center shadow-glass">
          <ShieldAlert className={`w-5 h-5 ${riskInfo.color}`} />
          <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Risk Level</span>
          <span className={`text-2xl font-black ${riskInfo.color}`}>{riskInfo.level}</span>
          <div className={`flex items-center gap-1 text-[9px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-widest ${riskInfo.bg} ${riskInfo.color}`}>
            <RiskIcon className="w-2.5 h-2.5" />
            {details.risk_factors?.length || 0} risk factor{details.risk_factors?.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Maturity */}
        <div className="p-5 rounded-2xl border border-border-subtle bg-gradient-to-br from-bg-surface to-bg-panel/50 flex flex-col items-center justify-center gap-2 text-center shadow-glass">
          <Activity className={`w-5 h-5 ${maturityInfo.color}`} />
          <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Maturity Level</span>
          <span className={`text-lg font-black ${maturityInfo.color} leading-tight`}>{maturityInfo.level}</span>
          <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-widest ${maturityInfo.bg} ${maturityInfo.color}`}>
            {details.health_category || 'N/A'}
          </span>
        </div>

        {/* Health Prediction */}
        <div className="p-5 rounded-2xl border border-border-subtle bg-gradient-to-br from-bg-surface to-bg-panel/50 flex flex-col items-center justify-center gap-2 text-center shadow-glass">
          <Brain className="w-5 h-5 text-brand-purple" />
          <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest">AI Health Prediction</span>
          {prediction ? (
            <>
              <span className={`text-lg font-black leading-tight ${getPredictionStyle(prediction.predicted_health).split(' ')[0]}`}>
                {prediction.predicted_health}
              </span>
              <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-widest ${getPredictionStyle(prediction.predicted_health)}`}>
                {Math.round(prediction.confidence * 100)}% confidence
              </span>
            </>
          ) : (
            <span className="text-xs text-text-muted italic">Not generated</span>
          )}
        </div>
      </div>

      {/* Score Badges with Why? */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-6 rounded-2xl border border-border-subtle bg-bg-panel/25 space-y-3">
          <ScoreBadge
            score={repro}
            label="Reproducibility Score"
            breakdown={reproBreakdown}
            size="lg"
          />
          <p className="text-[10px] text-text-muted font-light leading-relaxed">
            Measures how easily the repository can be cloned, configured, and built by a new developer. Considers Docker support, README quality, and environment documentation.
          </p>
        </div>

        <div className="p-6 rounded-2xl border border-border-subtle bg-bg-panel/25 space-y-3">
          <ScoreBadge
            score={surv}
            label="Survivability Score"
            breakdown={survBreakdown}
            size="lg"
          />
          <p className="text-[10px] text-text-muted font-light leading-relaxed">
            Predicts long-term project viability based on maintenance activity, community health, dependency freshness, and security posture.
          </p>
        </div>
      </div>

      {/* Health Prediction Reasoning */}
      {prediction?.reasoning && (
        <div className="p-5 rounded-2xl border border-border-subtle bg-bg-panel/20 space-y-2">
          <span className="text-[9px] font-bold text-brand-purple uppercase tracking-widest flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5" /> AI Prediction Reasoning
          </span>
          <p className="text-xs text-text-secondary leading-relaxed font-light">{prediction.reasoning}</p>
          {prediction.confidence > 0 && (
            <div className="flex items-center gap-3 pt-1">
              <div className="flex-1 bg-bg-input h-1.5 rounded-full overflow-hidden border border-border-subtle">
                <div className="h-full bg-brand-purple rounded-full" style={{ width: `${prediction.confidence * 100}%` }} />
              </div>
              <span className="text-[9px] font-bold font-mono text-text-muted">{Math.round(prediction.confidence * 100)}% model confidence</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
