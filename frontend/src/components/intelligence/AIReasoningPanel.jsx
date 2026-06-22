import React from 'react'
import { Sparkles, ThumbsUp, ThumbsDown, AlertTriangle, Brain, BookOpen, Package, Eye } from 'lucide-react'

export default function AIReasoningPanel({ repo }) {
  const analysis = repo.analyses?.[0] || null
  const intel = analysis?.findings?.intelligence || {}
  const reasoning = intel.repository_reasoning || null

  if (!reasoning) {
    return (
      <div className="p-10 text-center text-text-muted text-xs italic bg-bg-panel/20 border border-border-subtle rounded-2xl font-light">
        <Brain className="w-10 h-10 text-text-muted/30 mx-auto mb-3" />
        No repository reasoning data available. Run analysis to generate AI insights.
      </div>
    )
  }

  const { strengths = [], weaknesses = [], risks = [], observations = [] } = reasoning

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="p-6 rounded-2xl border border-border-subtle bg-gradient-to-br from-bg-surface to-brand-purple/5 relative overflow-hidden space-y-4">
        <div className="absolute top-0 right-0 w-40 h-40 bg-brand-purple/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-brand-purple" />
          <h3 className="text-sm font-extrabold text-text-primary uppercase tracking-wide">Repository Reasoning</h3>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed font-light relative z-10">
          Structural insights and heuristic observations derived directly from repository evidence.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Strengths */}
        {strengths.length > 0 && (
          <div className="p-5 rounded-xl bg-emerald-500/5 border border-emerald-500/15 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-emerald-500/10">
              <ThumbsUp className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest">
                Strengths ({strengths.length})
              </span>
            </div>
            <ul className="space-y-2.5">
              {strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-400 text-[9px] flex items-center justify-center shrink-0 mt-0.5 font-black">{i+1}</span>
                  <span className="text-xs text-text-secondary font-light leading-relaxed">{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Weaknesses */}
        {weaknesses.length > 0 && (
          <div className="p-5 rounded-xl bg-amber-500/5 border border-amber-500/15 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-amber-500/10">
              <ThumbsDown className="w-4 h-4 text-amber-400" />
              <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest">
                Weaknesses ({weaknesses.length})
              </span>
            </div>
            <ul className="space-y-2.5">
              {weaknesses.map((w, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-amber-500/15 text-amber-400 text-[9px] flex items-center justify-center shrink-0 mt-0.5 font-black">{i+1}</span>
                  <span className="text-xs text-text-secondary font-light leading-relaxed">{w}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Risks */}
        {risks.length > 0 && (
          <div className="p-5 rounded-xl bg-rose-500/5 border border-rose-500/15 space-y-3 lg:col-span-2">
            <div className="flex items-center gap-2 pb-2 border-b border-rose-500/10">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span className="text-[10px] font-extrabold text-rose-400 uppercase tracking-widest">
                Risks ({risks.length})
              </span>
            </div>
            <ul className="space-y-2.5">
              {risks.map((r, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-rose-500/15 text-rose-400 text-[9px] flex items-center justify-center shrink-0 mt-0.5 font-black">{i+1}</span>
                  <span className="text-xs text-text-secondary font-light leading-relaxed">{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Observations */}
        {observations.length > 0 && (
          <div className="p-5 rounded-xl bg-brand-cyan/5 border border-brand-cyan/15 space-y-3 lg:col-span-2">
            <div className="flex items-center gap-2 pb-2 border-b border-brand-cyan/10">
              <Eye className="w-4 h-4 text-brand-cyan" />
              <span className="text-[10px] font-extrabold text-brand-cyan uppercase tracking-widest">
                Observations ({observations.length})
              </span>
            </div>
            <ul className="space-y-2.5">
              {observations.map((o, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-brand-cyan/15 text-brand-cyan text-[9px] flex items-center justify-center shrink-0 mt-0.5 font-black">{i+1}</span>
                  <span className="text-xs text-text-secondary font-light leading-relaxed">{o}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
