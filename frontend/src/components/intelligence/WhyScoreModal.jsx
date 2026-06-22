import React from 'react'
import { X, CheckCircle, XCircle, TrendingUp } from 'lucide-react'

/**
 * WhyScoreModal — full-screen overlay showing score breakdown
 * Props:
 *   isOpen       {bool}
 *   onClose      {fn}
 *   title        {string} — e.g. "Reproducibility Score"
 *   score        {number} — 0..100
 *   breakdown    {Array}  — [{label, points, achieved, max, reason?}]
 *   description  {string} — short narrative
 */
export function WhyScoreModal({ isOpen, onClose, title = '', score = 0, breakdown = [], description = '' }) {
  if (!isOpen) return null

  const getColor = (s) => {
    if (s >= 80) return 'text-emerald-400'
    if (s >= 60) return 'text-amber-400'
    if (s >= 40) return 'text-orange-400'
    return 'text-rose-400'
  }

  const achieved = breakdown.filter(b => b.achieved)
  const missing  = breakdown.filter(b => !b.achieved)
  const totalPts = breakdown.reduce((s, b) => s + (b.max || b.points || 0), 0)
  const earnedPts = achieved.reduce((s, b) => s + (b.points || 0), 0)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 animate-fadeIn"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg bg-bg-surface rounded-2xl border border-border-subtle shadow-2xl overflow-hidden animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border-subtle bg-gradient-to-r from-bg-surface to-brand-indigo/5">
          <div>
            <h3 className="text-sm font-extrabold text-text-primary flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-indigo" />
              {title} — Why {Math.round(score)}?
            </h3>
            {description && (
              <p className="text-[10px] text-text-muted mt-0.5 font-light">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-bg-panel hover:bg-bg-input text-text-muted hover:text-text-primary transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Total score visual */}
        <div className="px-5 py-4 flex items-center gap-4 bg-bg-panel/30">
          <div className={`text-5xl font-black ${getColor(score)}`}>{Math.round(score)}</div>
          <div className="flex-1">
            <div className="flex justify-between text-[10px] text-text-muted mb-1.5 font-mono">
              <span>{earnedPts} earned</span>
              <span>of {totalPts > 0 ? totalPts : 100} max pts</span>
            </div>
            <div className="w-full bg-bg-input rounded-full h-2 overflow-hidden border border-border-subtle">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  score >= 80 ? 'bg-emerald-400' : score >= 60 ? 'bg-amber-400' : score >= 40 ? 'bg-orange-400' : 'bg-rose-400'
                }`}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        </div>

        {/* Breakdown list */}
        <div className="p-5 space-y-4 max-h-[50vh] overflow-y-auto scrollbar-thin">
          {/* Achieved items */}
          {achieved.length > 0 && (
            <div className="space-y-2">
              <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                <CheckCircle className="w-3 h-3" /> Achieved ({achieved.length})
              </span>
              {achieved.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-text-secondary font-medium">{item.label}</span>
                    {item.reason && <p className="text-[10px] text-text-muted mt-0.5 font-light">{item.reason}</p>}
                  </div>
                  <span className="font-black text-xs text-emerald-400 font-mono shrink-0">+{item.points} pts</span>
                </div>
              ))}
            </div>
          )}

          {/* Missing items */}
          {missing.length > 0 && (
            <div className="space-y-2">
              <span className="text-[9px] font-black text-text-muted uppercase tracking-widest flex items-center gap-1.5">
                <XCircle className="w-3 h-3" /> Missing — Could Add ({missing.length})
              </span>
              {missing.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-bg-input border border-border-subtle opacity-70">
                  <XCircle className="w-3.5 h-3.5 text-text-muted shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-text-muted font-medium line-through">{item.label}</span>
                    {item.reason && <p className="text-[10px] text-text-muted/70 mt-0.5 font-light">{item.reason}</p>}
                  </div>
                  <span className="font-black text-xs text-text-muted font-mono shrink-0">+{item.max || item.points} pts</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Close button */}
        <div className="p-4 border-t border-border-subtle flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-brand-indigo text-white text-xs font-bold hover:bg-brand-indigo/90 transition"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
