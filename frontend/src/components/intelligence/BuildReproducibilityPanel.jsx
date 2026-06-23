import React, { useState } from 'react'
import { CheckCircle, XCircle, FileText, Server, Layers, Package, ShieldAlert, BookOpen } from 'lucide-react'
import { WhyScoreModal } from './WhyScoreModal'

const DIMENSION_ICONS = {
  "Build Validation": Server,
  "Dependency Health": Package,
  "Environment Completeness": Layers,
  "Documentation Quality": BookOpen,
  "Execution Guide Quality": FileText,
  "Security Health": ShieldAlert
}

export default function BuildReproducibilityPanel({ repo }) {
  const [showWhy, setShowWhy] = useState(false)

  const analysis   = repo.analyses?.[0] || null
  const findings   = analysis?.findings || {}
  const repFactors = findings.reproducibility_factors || {}
  const breakdown  = repFactors.breakdown || []
  const repScore   = repFactors.total_score || analysis?.reproducibility_score || 0

  const buildResult = repo.build_result || null
  const diagnosis   = repo.failure_diagnosis || null
  const aiRec       = diagnosis?.ai_recommendation || null

  const barColor = (score, max) => {
    const ratio = score / max
    if (ratio >= 0.8) return 'bg-emerald-400'
    if (ratio >= 0.5) return 'bg-amber-400'
    return 'bg-rose-400'
  }

  const textColor = (score, max) => {
    const ratio = score / max
    if (ratio >= 0.8) return 'text-emerald-400'
    if (ratio >= 0.5) return 'text-amber-400'
    return 'text-rose-400'
  }

  // Formatting for the Why modal
  const whyBreakdown = breakdown.map(item => ({
    label: item.category,
    points: item.score,
    max: item.max,
    achieved: item.score > 0,
    reason: item.reason
  }))

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
          Score Breakdown
        </button>
      </div>

      {/* Transparent 6 Factors Breakdown */}
      {breakdown.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {breakdown.map((dim) => {
            const DimIcon = DIMENSION_ICONS[dim.category] || CheckCircle
            return (
              <div key={dim.category} className="p-4 rounded-xl bg-bg-panel/30 border border-border-subtle space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <DimIcon className={`w-4 h-4 ${textColor(dim.score, dim.max)}`} />
                    <span className="text-xs font-bold text-text-primary">{dim.category}</span>
                  </div>
                  <span className={`text-xs font-black font-mono ${textColor(dim.score, dim.max)}`}>
                    {dim.score} / {dim.max}
                  </span>
                </div>
                <div className="w-full bg-bg-input h-1.5 rounded-full overflow-hidden border border-border-subtle">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${barColor(dim.score, dim.max)}`}
                    style={{ width: `${Math.max(0, Math.min(100, (dim.score / dim.max) * 100))}%` }}
                  />
                </div>
                <p className="text-[10px] text-text-muted font-light leading-relaxed">{dim.reason}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Build Pipeline Summary */}
      {buildResult && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-text-primary uppercase tracking-widest">Execution Pipeline</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            {[
              { label: 'Dependencies', ok: buildResult.dependency_success },
              { label: 'Compilation', ok: buildResult.compilation_success },
              { label: 'Tests', ok: buildResult.test_success },
              { label: 'Runtime', ok: buildResult.runtime_success }
            ].map(stage => (
              <div key={stage.label} className={`p-3 rounded-lg border flex flex-col gap-1.5 ${stage.ok ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-text-primary">{stage.label}</span>
                  {stage.ok ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                </div>
                <span className={`text-[9px] font-black uppercase tracking-wider ${stage.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {stage.ok ? 'SUCCESS' : 'FAILED'}
                </span>
              </div>
            ))}
          </div>
          
          <div className={`p-4 mt-2 rounded-xl border flex flex-col gap-4 ${
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
                  {buildResult.build_success ? 'Overall Build Succeeded' : 'Build Failed'}
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
        breakdown={whyBreakdown}
        description="Transparent scoring model evaluating the repository's build, dependencies, environments, documentation, and security."
      />
    </div>
  )
}
