import React, { useState } from 'react'
import { Check, AlertCircle } from 'lucide-react'

export default function RadialGauge({
  name = '',
  score = 0,
  icon: Icon = null,
  desc = '',
  breakdown = [],
  hoverHelp = ''
}) {
  const [isOpen, setIsOpen] = useState(false)

  // Determine colors using our new theme variables
  let badgeColorClass = 'text-brand-indigo bg-brand-indigo/10 border-brand-indigo/20'
  let progressColorClass = 'bg-brand-indigo'
  
  if (score >= 80) {
    badgeColorClass = 'text-status-success bg-status-success-bg border-status-success/20'
    progressColorClass = 'bg-status-success'
  } else if (score >= 50) {
    badgeColorClass = 'text-status-warning bg-status-warning-bg border-status-warning/20'
    progressColorClass = 'bg-status-warning'
  } else if (score > 0) {
    badgeColorClass = 'text-status-error bg-status-error-bg border-status-error/20'
    progressColorClass = 'bg-status-error'
  }

  return (
    <div 
      className="p-5 rounded-xl border border-border-subtle bg-bg-surface hover:border-border-glow transition-all duration-300 flex flex-col justify-between h-[180px] relative overflow-hidden group select-none cursor-pointer"
      onClick={() => setIsOpen(!isOpen)}
    >
      {/* Header Info */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {Icon && <Icon className="w-4 h-4 text-text-secondary shrink-0" />}
            <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider truncate block">
              {name}
            </span>
          </div>
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider shrink-0 ${badgeColorClass}`}>
            {score >= 80 ? 'Elite' : score >= 50 ? 'Stable' : 'Threat'}
          </span>
        </div>
        <p className="text-[10px] text-text-secondary font-light leading-relaxed line-clamp-2">
          {desc}
        </p>
      </div>

      {/* Main Score & Line Progress Indicator */}
      <div className="space-y-2.5 pt-2">
        <div className="flex items-baseline justify-between">
          <span className="text-3xl font-light text-text-primary tracking-tight">
            {score}<span className="text-xs text-text-secondary font-normal">%</span>
          </span>
          <span className="text-[9px] text-text-muted font-mono hover:text-brand-indigo transition-colors">
            Diagnose →
          </span>
        </div>
        <div className="w-full h-1 bg-bg-panel rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-700 ${progressColorClass}`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* Popover Breakdown Dialog */}
      {isOpen && (
        <div 
          className="absolute inset-0 bg-bg-surface/98 backdrop-blur-md p-5 flex flex-col justify-between z-10 animate-fadeIn"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-3 overflow-y-auto max-h-[110px] pr-1 scrollbar-thin">
            <span className="text-[9px] text-brand-indigo font-bold uppercase tracking-wider block border-b border-border-subtle pb-1.5">
              {name} Diagnostics
            </span>
            {breakdown.length === 0 ? (
              <p className="text-[10px] text-text-muted italic">No breakdown parameters provided.</p>
            ) : (
              <div className="space-y-2">
                {breakdown.map((item, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-3 text-[10px]">
                    <div className="flex gap-2 items-start min-w-0">
                      {item.achieved ? (
                        <Check className="w-3.5 h-3.5 text-status-success shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-text-muted shrink-0 mt-0.5" />
                      )}
                      <span className={`font-light leading-normal truncate ${item.achieved ? 'text-text-primary' : 'text-text-muted line-through'}`}>
                        {item.label}
                      </span>
                    </div>
                    <span className="font-bold text-text-primary font-mono whitespace-nowrap">
                      {item.achieved ? `+${item.points}` : '0'} / {item.max}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="w-full text-center text-[9px] font-bold text-text-secondary hover:text-text-primary py-2 border-t border-border-subtle transition-colors"
          >
            Close Diagnostics
          </button>
        </div>
      )}
    </div>
  )
}
