import React, { useState } from 'react'
import { HelpCircle, ChevronDown, ChevronUp, CheckCircle, XCircle } from 'lucide-react'

/**
 * ScoreBadge — shows a numeric score with an optional "Why?" expand button.
 * When expanded, shows a breakdown of score contributors.
 *
 * Props:
 *   score        {number}  — 0..100
 *   label        {string}  — e.g. "Reproducibility"
 *   breakdown    {Array}   — [{label, points, achieved, max?}]
 *   size         {'sm'|'md'|'lg'}
 *   showWhy      {bool}    — default true
 */
export function ScoreBadge({ score = 0, label = '', breakdown = [], size = 'md', showWhy = true }) {
  const [expanded, setExpanded] = useState(false)

  const getColor = (s) => {
    if (s >= 80) return { ring: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', bar: 'bg-emerald-400' }
    if (s >= 60) return { ring: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20',   bar: 'bg-amber-400' }
    if (s >= 40) return { ring: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/20',  bar: 'bg-orange-400' }
    return               { ring: 'text-rose-400',   bg: 'bg-rose-500/10 border-rose-500/20',      bar: 'bg-rose-400' }
  }

  const sizes = {
    sm: { text: 'text-xl', label: 'text-[9px]', ring: 'w-14 h-14' },
    md: { text: 'text-2xl', label: 'text-[10px]', ring: 'w-18 h-18' },
    lg: { text: 'text-4xl', label: 'text-xs', ring: 'w-24 h-24' },
  }

  const col = getColor(score)
  const sz = sizes[size] || sizes.md

  const achievedPoints = breakdown.filter(b => b.achieved).reduce((s, b) => s + (b.points || 0), 0)
  const maxPoints = breakdown.reduce((s, b) => s + (b.max || b.points || 0), 0)

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {/* Circular score ring */}
        <div className={`relative ${sz.ring} flex items-center justify-center shrink-0`}>
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" className="text-white/5" strokeWidth="2.5" />
            <circle
              cx="18" cy="18" r="15.9" fill="none"
              stroke="currentColor" className={col.ring}
              strokeWidth="2.5"
              strokeDasharray={`${(score / 100) * 100} 100`}
              strokeLinecap="round"
            />
          </svg>
          <span className={`${sz.text} font-black ${col.ring} leading-none`}>{Math.round(score)}</span>
        </div>
        {/* Label + Why button */}
        <div className="flex-1 min-w-0">
          <span className={`${sz.label} font-bold text-text-muted uppercase tracking-widest block`}>{label}</span>
          <div className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border mt-1 text-[9px] font-black uppercase tracking-wider ${col.bg} ${col.ring}`}>
            {score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor'}
          </div>
          {showWhy && breakdown.length > 0 && (
            <button
              onClick={() => setExpanded(p => !p)}
              className="ml-2 inline-flex items-center gap-1 text-[9px] font-bold text-brand-indigo hover:text-brand-purple transition-colors bg-brand-indigo/10 hover:bg-brand-indigo/20 px-2 py-0.5 rounded-full border border-brand-indigo/20"
            >
              <HelpCircle className="w-2.5 h-2.5" />
              Why?
              {expanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Score breakdown panel */}
      {expanded && breakdown.length > 0 && (
        <div className="mt-2 p-4 rounded-xl bg-bg-input border border-border-subtle space-y-2 animate-fadeIn text-xs">
          <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Score Breakdown</span>
            <span className="font-black text-text-primary font-mono">{achievedPoints} / {maxPoints > 0 ? maxPoints : 100} pts</span>
          </div>
          <div className="space-y-1.5">
            {breakdown.map((item, i) => (
              <div key={i} className={`flex items-start gap-2 ${item.achieved ? 'opacity-100' : 'opacity-60'}`}>
                {item.achieved
                  ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  : <XCircle    className="w-3.5 h-3.5 text-text-muted shrink-0 mt-0.5" />
                }
                <span className="flex-1 text-text-secondary font-light">{item.label}</span>
                <span className={`font-black font-mono shrink-0 ${item.achieved ? 'text-emerald-400' : 'text-text-muted'}`}>
                  {item.achieved ? `+${item.points}` : `-${item.max || item.points}`} pts
                </span>
              </div>
            ))}
          </div>
          {/* Progress bar of total */}
          <div className="pt-2 border-t border-border-subtle">
            <div className="flex justify-between text-[9px] text-text-muted mb-1">
              <span>Score Progress</span>
              <span>{Math.round(score)}%</span>
            </div>
            <div className="w-full bg-bg-panel rounded-full h-1.5 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${col.bar}`} style={{ width: `${score}%` }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
