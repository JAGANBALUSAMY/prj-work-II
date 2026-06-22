import React, { useState } from 'react'
import { Terminal, Play, Check, Copy, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../ui/Button'

export default function ExecutionGuidePanel({ repo }) {
  const [activeStep, setActiveStep] = useState(0)
  const [copiedIndex, setCopiedIndex] = useState(false)

  const analysis = repo.analyses?.[0] || null
  const intel = analysis?.findings?.intelligence || {}
  const guide = intel.execution_guide || null

  if (!guide) {
    return (
      <div className="p-8 text-center text-text-muted text-xs italic bg-bg-panel/20 border border-border-subtle rounded-xl font-light">
        No execution guide available. Run analysis to generate one.
      </div>
    )
  }

  const steps = guide.steps || []

  if (steps.length === 0) {
    return (
      <div className="p-8 text-center text-text-muted text-xs italic bg-bg-panel/20 border border-border-subtle rounded-xl font-light">
        No execution guide available. Run analysis to generate one.
      </div>
    )
  }

  const handleCopy = (command) => {
    navigator.clipboard.writeText(command)
    setCopiedIndex(true)
    setTimeout(() => setCopiedIndex(false), 2000)
  }

  const currentStepItem = steps[activeStep]

  // Dynamic command syntax highlighting
  const highlightCommand = (cmd) => {
    if (!cmd) return ''
    const parts = cmd.split(' ')
    return parts.map((part, i) => {
      if (i === 0 && (part === 'git' || part === 'docker' || part === 'pip' || part === 'npm' || part === 'python' || part === 'uvicorn')) {
        return <span key={i} className="text-brand-pink font-extrabold">{part} </span>
      }
      if (part.startsWith('-') || part.startsWith('--')) {
        return <span key={i} className="text-brand-cyan">{part} </span>
      }
      if (part.includes('/') || part.includes('\\')) {
        return <span key={i} className="text-brand-purple">{part} </span>
      }
      return <span key={i} className="text-text-primary">{part} </span>
    })
  }

  return (
    <div className="space-y-6 animate-fadeIn select-none">
      {/* Header Info */}
      <div className="p-5 rounded-2xl border border-border-subtle bg-gradient-to-br from-bg-surface to-brand-indigo/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-extrabold text-brand-indigo flex items-center gap-2">
            <Terminal className="w-5 h-5" />
            Interactive Onboarding Setup Wizard
          </h3>
          <p className="text-xs text-text-secondary leading-relaxed font-light">
            Step-by-step instructions to compile and deploy this repository locally.
          </p>
        </div>
        
        {/* Step Indicator dots */}
        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
          {steps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveStep(idx)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                idx === activeStep 
                  ? 'bg-brand-indigo w-6' 
                  : idx < activeStep 
                    ? 'bg-status-success' 
                    : 'bg-bg-panel border border-border-subtle'
              }`}
              title={`Jump to step ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Steps Viewer Panel */}
      <div className="p-6 rounded-2xl border border-border-subtle bg-bg-panel/20 space-y-5 animate-slideUp relative">
        <div className="flex items-center justify-between border-b border-border-subtle/40 pb-3">
          <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
            <Play className="w-4 h-4 text-brand-purple" />
            Step {activeStep + 1}: {currentStepItem.title}
          </h4>
          <span className="text-[10px] text-text-muted font-mono font-bold">
            {activeStep + 1} / {steps.length}
          </span>
        </div>

        {currentStepItem.description && (
          <p className="text-xs text-text-secondary font-light leading-relaxed">
            {currentStepItem.description}
          </p>
        )}

        {/* Custom Terminal container */}
        <div className="rounded-xl overflow-hidden border border-border-subtle bg-[#080b13] shadow-inner relative group">
          {/* Top terminal bar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-bg-panel/90 border-b border-border-subtle/50 select-none">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            </div>
            <span className="text-[9px] font-bold text-text-muted font-mono tracking-wider">sh - interactive console</span>
            <button
              onClick={() => handleCopy(currentStepItem.command)}
              className="p-1 rounded-lg hover:bg-bg-panel text-text-muted hover:text-text-primary transition-colors flex items-center gap-1 text-[9px] font-bold"
              title="Copy command to clipboard"
            >
              {copiedIndex ? (
                <>
                  <Check className="w-3.5 h-3.5 text-status-success" />
                  <span className="text-status-success font-black">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Console commands block */}
          <div className="p-4 font-mono text-xs overflow-x-auto whitespace-pre select-all leading-relaxed scrollbar-thin text-text-primary">
            <span className="text-status-success mr-2.5 select-none">$</span>
            {highlightCommand(currentStepItem.command)}
          </div>
        </div>

        {/* Setup Wizard Navigation buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-border-subtle/40">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveStep(prev => Math.max(0, prev - 1))}
            disabled={activeStep === 0}
            icon={ChevronLeft}
          >
            Back
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setActiveStep(prev => Math.min(steps.length - 1, prev + 1))}
            disabled={activeStep === steps.length - 1}
            className="flex items-center gap-1.5"
          >
            Next Step
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
