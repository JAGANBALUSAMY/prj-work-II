import React, { useState } from 'react'
import { CheckCircle, XCircle, Container, FileText, Package, Server, BookOpen, Layers } from 'lucide-react'
import { WhyScoreModal } from './WhyScoreModal'

/**
 * BuildReproducibilityPanel — Phase 5
 * Shows 6 confidence dimensions + Why? score breakdown
 */
export default function BuildReproducibilityPanel({ repo }) {
  const [showWhy, setShowWhy] = useState(false)

  const analysis   = repo.analyses?.[0] || null
  const findings   = analysis?.findings || {}
  const repFactors = findings.reproducibility_factors || {}
  const repScore   = analysis?.reproducibility_score || 0

  const buildResult = repo.build_result || null
  const diagnosis   = repo.failure_diagnosis || null
  const aiRec       = diagnosis?.ai_recommendation || null

  // --- 6 Confidence Dimensions ---
  const docScore = repo.documentation_profile?.completeness_score || 0
  const envVars  = repo.environment_profile?.variables || []
  const missingEnv = envVars.filter(v => v.is_missing_from_template).length
  const envConf  = envVars.length === 0 ? 50 : Math.round(((envVars.length - missingEnv) / envVars.length) * 100)

  const dimensions = [
    {
      name: 'Build Success',
      Icon: Server,
      value: buildResult ? (buildResult.build_success ? 100 : 0) : null,
      label: buildResult ? (buildResult.build_success ? 'Passing' : 'Failing') : 'Not Run',
      color: buildResult?.build_success ? 'emerald' : buildResult ? 'rose' : 'text-muted',
      desc: buildResult
        ? `Ecosystem: ${buildResult.detected_ecosystem || 'Unknown'} · ${buildResult.execution_time?.toFixed(1)}s`
        : 'No build validation executed yet.',
    },
    {
      name: 'Dependency Resolution',
      Icon: Package,
      value: (() => {
        const deps = repo.dependencies_profile?.dependencies || []
        const rpt  = repo.dependencies_profile?.report || {}
        if (!deps.length) return 50
        const issues = (rpt.missing_versions?.length || 0) + (rpt.suspicious_declarations?.length || 0)
        return Math.max(0, Math.round(100 - (issues / Math.max(deps.length, 1)) * 100))
      })(),
      label: '',
      color: 'indigo',
      desc: `${repo.dependencies_profile?.report?.total_count || 0} packages · ${repo.dependencies_profile?.report?.missing_versions?.length || 0} unpinned`,
    },
    {
      name: 'Environment Completeness',
      Icon: Layers,
      value: envConf,
      label: '',
      color: envConf >= 80 ? 'emerald' : envConf >= 50 ? 'amber' : 'rose',
      desc: `${envVars.length} env vars · ${missingEnv} missing from template`,
    },
    {
      name: 'Container Support',
      Icon: Container,
      value: repFactors.has_dockerfile ? 100 : 0,
      label: repFactors.has_dockerfile ? 'Dockerfile found' : 'No Dockerfile',
      color: repFactors.has_dockerfile ? 'emerald' : 'rose',
      desc: repFactors.has_dockerfile
        ? 'Containerization support detected — reproducibility greatly enhanced.'
        : 'No Dockerfile or docker-compose.yml found. Setup requires manual host machine setup.',
    },
    {
      name: 'Documentation Coverage',
      Icon: BookOpen,
      value: docScore,
      label: '',
      color: docScore >= 80 ? 'emerald' : docScore >= 50 ? 'amber' : 'rose',
      desc: `README completeness: ${docScore}% · Setup difficulty: ${repo.documentation_profile?.ai_analysis?.setup_difficulty_estimate || 'unknown'}`,
    },
    {
      name: 'README Quality',
      Icon: FileText,
      value: repFactors.has_readme ? Math.round((repFactors.environment_instructions_score || 0) * 10) : 0,
      label: repFactors.has_readme ? `${repFactors.environment_instructions_score}/10 quality` : 'No README',
      color: repFactors.has_readme ? (repFactors.environment_instructions_score >= 7 ? 'emerald' : repFactors.environment_instructions_score >= 4 ? 'amber' : 'orange') : 'rose',
      desc: repFactors.has_readme
        ? `Setup instructions quality scored ${repFactors.environment_instructions_score}/10`
        : 'No README file found — onboarding severely impacted.',
    },
  ]

  const barColor = (c) => ({
    emerald: 'bg-emerald-400', teal: 'bg-teal-400', amber: 'bg-amber-400',
    orange: 'bg-orange-400', rose: 'bg-rose-400', indigo: 'bg-brand-indigo',
    'text-muted': 'bg-text-muted/30',
  }[c] || 'bg-brand-indigo')

  const textColor = (c) => ({
    emerald: 'text-emerald-400', teal: 'text-teal-400', amber: 'text-amber-400',
    orange: 'text-orange-400', rose: 'text-rose-400', indigo: 'text-brand-indigo',
    'text-muted': 'text-text-muted',
  }[c] || 'text-brand-indigo')

  // Why? score breakdown
  const reproBreakdown = [
    { label: 'Base score (always awarded)',    points: 30, max: 30, achieved: true, reason: 'Baseline for any analyzed repository' },
    { label: 'Dockerfile / docker-compose present', points: 30, max: 30, achieved: !!repFactors.has_dockerfile, reason: 'Container support detected' },
    { label: 'README.md file present',        points: 10, max: 10, achieved: !!repFactors.has_readme },
    { label: `README completeness (${repFactors.environment_instructions_score || 0}/10 × 3)`,
      points: Math.round((repFactors.environment_instructions_score || 0) * 3),
      max: 30, achieved: (repFactors.environment_instructions_score || 0) > 0,
      reason: 'Measures installation, environment, and usage instructions quality' },
  ]

  if (!analysis && !buildResult) {
    return (
      <div className="p-8 text-center text-text-muted text-xs italic bg-bg-panel/20 border border-border-subtle rounded-xl font-light">
        No reproducibility data found. Run analysis to generate build intelligence.
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Score header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl border border-border-subtle bg-gradient-to-br from-bg-surface to-bg-panel/40">
        <div>
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest block mb-1">Reproducibility Score</span>
          <div className="flex items-baseline gap-3">
            <span className={`text-5xl font-black ${repScore >= 80 ? 'text-emerald-400' : repScore >= 60 ? 'text-amber-400' : repScore >= 40 ? 'text-orange-400' : 'text-rose-400'}`}>
              {Math.round(repScore)}
            </span>
            <span className="text-text-muted text-sm">/ 100</span>
          </div>
          <p className="text-[10px] text-text-muted font-light mt-1">
            {repScore >= 80 ? 'Excellent reproducibility — ready for third-party deployment.' :
             repScore >= 60 ? 'Good reproducibility with minor gaps.' :
             repScore >= 40 ? 'Fair — some critical setup documentation missing.' :
             'Poor — significant barriers to reproduction exist.'}
          </p>
        </div>
        <button
          onClick={() => setShowWhy(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-indigo/15 hover:bg-brand-indigo/25 text-brand-indigo border border-brand-indigo/20 text-xs font-bold transition"
        >
          Why {Math.round(repScore)}?
        </button>
      </div>

      {/* 6 Confidence Dimensions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {dimensions.map((dim) => {
          const DimIcon = dim.Icon
          const val = dim.value ?? 0
          return (
            <div key={dim.name} className="p-4 rounded-xl bg-bg-panel/30 border border-border-subtle space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <DimIcon className={`w-4 h-4 ${textColor(dim.color)}`} />
                  <span className="text-xs font-bold text-text-primary">{dim.name}</span>
                </div>
                <span className={`text-xs font-black font-mono ${textColor(dim.color)}`}>
                  {dim.label || `${val}%`}
                </span>
              </div>
              <div className="w-full bg-bg-input h-1.5 rounded-full overflow-hidden border border-border-subtle">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${barColor(dim.color)}`}
                  style={{ width: `${Math.max(0, Math.min(100, val))}%` }}
                />
              </div>
              <p className="text-[10px] text-text-muted font-light leading-relaxed">{dim.desc}</p>
            </div>
          )
        })}
      </div>

      {/* Build Result Summary */}
      {buildResult && (
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
          buildResult.build_success
            ? 'bg-emerald-500/5 border-emerald-500/20'
            : 'bg-rose-500/5 border-rose-500/20'
        }`}>
          <div className="flex items-center gap-2">
            {buildResult.build_success
              ? <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              : <XCircle    className="w-5 h-5 text-rose-400 shrink-0" />
            }
            <div>
              <span className="text-xs font-extrabold text-text-primary">
                {buildResult.build_success ? 'Build Succeeded' : 'Build Failed'}
              </span>
              <p className="text-[10px] text-text-muted font-light">
                {buildResult.detected_ecosystem} · {buildResult.execution_time?.toFixed(2)}s execution
              </p>
            </div>
          </div>
          {buildResult.commands_executed?.length > 0 && (
            <div className="text-[9px] font-mono bg-bg-panel/80 px-2.5 py-1.5 rounded-lg border border-border-subtle">
              {buildResult.commands_executed.map((c, i) => <div key={i} className="text-text-muted">&gt; {c}</div>)}
            </div>
          )}
          {buildResult.container_logs && (
            <div className="mt-2 text-[9px] font-mono bg-[#0f111a] text-slate-300 p-3 rounded-lg border border-border-subtle max-h-48 overflow-y-auto whitespace-pre-wrap">
              {buildResult.container_logs}
            </div>
          )}
        </div>
      )}

      {/* AI Recommendation if build failed */}
      {aiRec && (
        <div className="p-5 rounded-xl border border-brand-purple/20 bg-brand-purple/5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-brand-purple uppercase tracking-widest">AI Fix Recommendation</span>
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-brand-purple/15 text-brand-purple border border-brand-purple/20">
              {Math.round((aiRec.confidence_level || 0) * 100)}% confidence
            </span>
          </div>
          {aiRec.root_cause_explanation && (
            <p className="text-xs text-text-secondary font-light leading-relaxed">{aiRec.root_cause_explanation}</p>
          )}
          {aiRec.fix_steps?.length > 0 && (
            <ul className="space-y-1.5">
              {aiRec.fix_steps.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-text-secondary font-light">
                  <span className="w-4 h-4 rounded-full bg-brand-purple/15 text-brand-purple text-[9px] flex items-center justify-center shrink-0 font-black mt-0.5">{i+1}</span>
                  {step}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Why? Modal */}
      <WhyScoreModal
        isOpen={showWhy}
        onClose={() => setShowWhy(false)}
        title="Reproducibility Score"
        score={repScore}
        breakdown={reproBreakdown}
        description="How easily can a new developer clone, configure, and run this repository?"
      />
    </div>
  )
}
